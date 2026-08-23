const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

const {
    load,
    save,
    getGuild
} = require("../utils/ticketStore");

function getData(interaction) {
    const db = load();
    const guild = getGuild(db, interaction.guild.id);
    const ticket = guild.tickets[interaction.channelId];

    return { db, guild, ticket };
}

function isStaff(interaction, guild, ticket) {
    if (
        interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageChannels
        )
    ) {
        return true;
    }

    const category = guild.categories[ticket.category];

    if (!category) return false;

    return category.staffRoles.some(roleId =>
        interaction.member.roles.cache.has(roleId)
    );
}

async function createTicket(interaction, type) {
    const db = load();
    const guild = getGuild(
        db,
        interaction.guild.id
    );

    const category = guild.categories[type];

    if (!category) {
        return interaction.reply({
            content: "❌ Invalid ticket category.",
            ephemeral: true
        });
    }

    const alreadyOpen = Object.entries(
        guild.tickets
    ).find(([, ticket]) =>
        ticket.ownerId === interaction.user.id &&
        !ticket.closed
    );

    if (alreadyOpen) {
        const channel =
            interaction.guild.channels.cache.get(
                alreadyOpen[0]
            );

        return interaction.reply({
            content:
                `❌ You already have a ticket ${channel || ""}`,
            ephemeral: true
        });
    }

    guild.counter++;

    const number =
        String(guild.counter).padStart(4, "0");

    const permissions = [
        {
            id: interaction.guild.id,
            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles
            ]
        }
    ];

    for (const roleId of category.staffRoles) {
        permissions.push({
            id: roleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
            ]
        });
    }

    const channelOptions = {
        name: `ticket-${number}`,
        type: ChannelType.GuildText,
        topic:
            `ticket-owner:${interaction.user.id}`,
        permissionOverwrites: permissions
    };

    if (category.categoryId) {
        const parent =
            interaction.guild.channels.cache.get(
                category.categoryId
            );

        if (
            parent &&
            parent.type === ChannelType.GuildCategory
        ) {
            channelOptions.parent = parent.id;
        }
    }

    let channel;

    try {
        channel =
            await interaction.guild.channels.create(
                channelOptions
            );
    } catch (error) {
        console.error(
            "Ticket creation error:",
            error
        );

        return interaction.reply({
            content:
                "❌ Ticket create nahi hua. Bot ko Manage Channels permission check kar.",
            ephemeral: true
        });
    }

    guild.tickets[channel.id] = {
        ownerId: interaction.user.id,
        category: type,
        number,
        claimedBy: null,
        closed: false,
        createdAt: Date.now()
    };

    save(db);

    const buttons =
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("ticket_claim")
                .setLabel("Claim")
                .setEmoji("✋")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("ticket_close")
                .setLabel("Close")
                .setEmoji("🔒")
                .setStyle(ButtonStyle.Danger)
        );

    const embed =
        new EmbedBuilder()
            .setTitle(
                `${category.emoji} ${category.name}`
            )
            .setDescription(
                `${category.description}\n\n` +
                `Welcome ${interaction.user}!\n` +
                `Please explain your issue clearly. Staff will assist you shortly.`
            )
            .addFields(
                {
                    name: "👤 Owner",
                    value: `${interaction.user}`,
                    inline: true
                },
                {
                    name: "🎫 Ticket",
                    value: `#${number}`,
                    inline: true
                }
            )
            .setTimestamp();

    await channel.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [buttons]
    });

    return interaction.reply({
        content:
            `✅ Ticket created!\n🎫 ${channel}`,
        ephemeral: true
    });
}

async function sendPanel(interaction) {
    const db = load();

    const guild = getGuild(
        db,
        interaction.guild.id
    );

    save(db);

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId("ticket_category")
            .setPlaceholder(
                "🎫 Select a ticket category"
            )
            .addOptions(
                Object.entries(
                    guild.categories
                ).map(([value, category]) => ({
                    label: category.name,
                    value,
                    emoji: category.emoji,
                    description:
                        category.description.slice(
                            0,
                            100
                        )
                }))
            );

    const embed =
        new EmbedBuilder()
            .setTitle(
                guild.panel.title
            )
            .setDescription(
                guild.panel.description
            )
            .setColor(
                guild.panel.color
            );

    return interaction.reply({
        embeds: [embed],
        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ]
    });
}

async function claim(interaction) {
    const { db, guild, ticket } =
        getData(interaction);

    if (!ticket) {
        return interaction.reply({
            content:
                "❌ This isn't a ticket.",
            ephemeral: true
        });
    }

    if (
        !isStaff(
            interaction,
            guild,
            ticket
        )
    ) {
        return interaction.reply({
            content: "❌ Staff only.",
            ephemeral: true
        });
    }

    if (ticket.claimedBy) {
        return interaction.reply({
            content:
                `❌ Already claimed by <@${ticket.claimedBy}>.`,
            ephemeral: true
        });
    }

    ticket.claimedBy =
        interaction.user.id;

    save(db);

    return interaction.reply(
        `✋ Ticket claimed by ${interaction.user}.`
    );
}

async function unclaim(interaction) {
    const { db, guild, ticket } =
        getData(interaction);

    if (!ticket) {
        return interaction.reply({
            content:
                "❌ This isn't a ticket.",
            ephemeral: true
        });
    }

    if (
        !isStaff(
            interaction,
            guild,
            ticket
        )
    ) {
        return interaction.reply({
            content: "❌ Staff only.",
            ephemeral: true
        });
    }

    ticket.claimedBy = null;

    save(db);

    return interaction.reply(
        `✋ Ticket unclaimed by ${interaction.user}.`
    );
}

async function close(interaction) {
    const { db, guild, ticket } =
        getData(interaction);

    if (!ticket) {
        return interaction.reply({
            content:
                "❌ This isn't a ticket.",
            ephemeral: true
        });
    }

    const staff =
        isStaff(
            interaction,
            guild,
            ticket
        );

    if (
        ticket.ownerId !== interaction.user.id &&
        !staff
    ) {
        return interaction.reply({
            content:
                "❌ You cannot close this ticket.",
            ephemeral: true
        });
    }

    ticket.closed = true;

    save(db);

    await interaction.channel.permissionOverwrites.edit(
        ticket.ownerId,
        {
            ViewChannel: false,
            SendMessages: false
        }
    );

    const row =
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(
                        "ticket_reopen"
                    )
                    .setLabel("Reopen")
                    .setEmoji("🔓")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_delete"
                    )
                    .setLabel("Delete")
                    .setEmoji("🗑️")
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await interaction.reply(
        `🔒 Ticket closed by ${interaction.user}.`
    );

    await interaction.channel.send({
        content:
            "🔒 **Ticket Closed**\nStaff can reopen or delete this ticket.",
        components: [row]
    });
}

async function reopen(interaction) {
    const { db, guild, ticket } =
        getData(interaction);

    if (!ticket) {
        return interaction.reply({
            content:
                "❌ This isn't a ticket.",
            ephemeral: true
        });
    }

    if (
        !isStaff(
            interaction,
            guild,
            ticket
        )
    ) {
        return interaction.reply({
            content:
                "❌ Staff only.",
            ephemeral: true
        });
    }

    ticket.closed = false;

    save(db);

    await interaction.channel.permissionOverwrites.edit(
        ticket.ownerId,
        {
            ViewChannel:
