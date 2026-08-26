const {
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const {
  getGuild,
  updateGuild
} = require("../utils/ticketStore");

const CREATE_ID = "ticket_create";
const CLOSE_ID = "ticket_close";
const DELETE_ID = "ticket_delete";

async function createTicket(interaction) {
  const guild = interaction.guild;
  const user = interaction.user;

  const config = getGuild(guild.id);

  if (
    !config.setup ||
    !config.setup.title ||
    !config.setup.description
  ) {
    return interaction.reply({
      content:
        "❌ Ticket system hasn't been configured yet.",
      ephemeral: true
    });
  }

  const setup = config.setup;

  if (!setup.categoryId) {
    return interaction.reply({
      content:
        "❌ Ticket category is not configured.",
      ephemeral: true
    });
  }

  if (!setup.staffRoleId) {
    return interaction.reply({
      content:
        "❌ Staff role is not configured.",
      ephemeral: true
    });
  }

  const existing = Object.values(
    config.tickets || {}
  ).find(
    ticket =>
      ticket.userId === user.id &&
      !ticket.closed
  );

  if (existing) {
    return interaction.reply({
      content:
        `❌ You already have a ticket: <#${existing.channelId}>`,
      ephemeral: true
    });
  }

  await interaction.deferReply({
    ephemeral: true
  });

  try {
    const safeName =
      user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 70) ||
      "user";

    const channel =
      await guild.channels.create({
        name: `ticket-${safeName}`,
        type: ChannelType.GuildText,
        parent: setup.categoryId,

        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [
              PermissionsBitField.Flags.ViewChannel
            ]
          },

          {
            id: user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles
            ]
          },

          {
            id: setup.staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageMessages
            ]
          }
        ]
      });

    const ticketId =
      `${guild.id}-${Date.now()}`;

    config.tickets ??= {};

    config.tickets[ticketId] = {
      channelId: channel.id,
      userId: user.id,
      createdAt: Date.now(),
      closed: false
    };

    updateGuild(
      guild.id,
      config
    );

    const embed =
      new EmbedBuilder()
        .setTitle(setup.title)
        .setDescription(
          setup.description
        )
        .setColor(
          setup.color || "#5865F2"
        )
        .addFields({
          name: "👤 Ticket Owner",
          value: `${user}`,
          inline: true
        })
        .addFields({
          name: "🆔 Ticket ID",
          value: `\`${ticketId}\``,
          inline: true
        })
        .setTimestamp();

    if (setup.image) {
      embed.setImage(
        setup.image
      );
    }

    if (setup.thumbnail) {
      embed.setThumbnail(
        setup.thumbnail
      );
    }

    const row =
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(CLOSE_ID)
            .setLabel("Close Ticket")
            .setEmoji("🔒")
            .setStyle(
              ButtonStyle.Danger
            )
        );

    await channel.send({
      content:
        `${user} <@&${setup.staffRoleId}>`,
      embeds: [embed],
      components: [row]
    });

    if (setup.logChannelId) {
      const logChannel =
        guild.channels.cache.get(
          setup.logChannelId
        );

      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎫 Ticket Created")
              .setColor(
                setup.color || "#5865F2"
              )
              .addFields(
                {
                  name: "User",
                  value: `${user}`,
                  inline: true
                },
                {
                  name: "Channel",
                  value: `${channel}`,
                  inline: true
                },
                {
                  name: "Ticket ID",
                  value: `\`${ticketId}\``,
                  inline: false
                }
              )
              .setTimestamp()
          ]
        });
      }
    }

    return interaction.editReply({
      content:
        `✅ Ticket created: ${channel}`
    });

  } catch (error) {
    console.error(
      "❌ Ticket creation error:",
      error
    );

    return interaction.editReply({
      content:
        `❌ Failed to create ticket.\n\`${error.message}\``
    });
  }
}

async function closeTicket(interaction) {
  const guild = interaction.guild;
  const channel = interaction.channel;

  const config = getGuild(
    guild.id
  );

  const entry =
    Object.entries(
      config.tickets || {}
    ).find(
      ([, ticket]) =>
        ticket.channelId ===
          channel.id &&
        !ticket.closed
    );

  if (!entry) {
    return interaction.reply({
      content:
        "❌ This isn't an active ticket.",
      ephemeral: true
    });
  }

  const [ticketId, ticket] =
    entry;

  ticket.closed = true;
  ticket.closedAt = Date.now();

  updateGuild(
    guild.id,
    config
  );

  const setup =
    config.setup || {};

  if (setup.logChannelId) {
    const logChannel =
      guild.channels.cache.get(
        setup.logChannelId
      );

    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              "🔒 Ticket Closed"
            )
            .setColor(
              setup.color || "#5865F2"
            )
            .addFields(
              {
                name: "Ticket",
                value:
                  `<#${channel.id}>`
              },
              {
                name: "Closed By",
                value:
                  `${interaction.user}`
              },
              {
                name: "Ticket ID",
                value:
                  `\`${ticketId}\``
              }
            )
            .setTimestamp()
        ]
      });
    }
  }

  const row =
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            DELETE_ID
          )
          .setLabel(
            "Delete Ticket"
          )
          .setEmoji("🗑️")
          .setStyle(
            ButtonStyle.Danger
          )
      );

  await interaction.reply({
    content:
      "🔒 **Ticket closed.**\nStaff can delete it when ready.",
    components: [row]
  });

  try {
    await channel.permissionOverwrites.edit(
      ticket.userId,
      {
        ViewChannel: false,
        SendMessages: false
      }
    );
  } catch {}
}

async function deleteTicket(interaction) {
  const guild = interaction.guild;
  const channel = interaction.channel;

  const config =
    getGuild(guild.id);

  const entry =
    Object.entries(
      config.tickets || {}
    ).find(
      ([, ticket]) =>
        ticket.channelId ===
        channel.id
    );

  if (!entry) {
    return interaction.reply({
      content:
        "❌ This isn't a ticket channel.",
      ephemeral: true
    });
  }

  if (
    !interaction.memberPermissions.has(
      PermissionsBitField.Flags.ManageChannels
    )
  ) {
    return interaction.reply({
      content:
        "❌ You need **Manage Channels** permission.",
      ephemeral: true
    });
  }

  const [ticketId, ticket] =
    entry;

  ticket.deletedAt =
    Date.now();

  updateGuild(
    guild.id,
    config
  );

  await interaction.reply({
    content:
      "🗑️ Deleting ticket..."
  });

  setTimeout(
    async () => {
      try {
        await channel.delete(
          "Ticket deleted"
        );
      } catch (error) {
        console.error(
          "❌ Ticket delete error:",
          error
        );
      }
    },
    2000
  );
}

async function handle(interaction) {
  if (!interaction.isButton()) {
    return false;
  }

  if (
    interaction.customId ===
    CREATE_ID
  ) {
    await createTicket(
      interaction
    );
    return true;
  }

  if (
    interaction.customId ===
    CLOSE_ID
  ) {
    await closeTicket(
      interaction
    );
    return true;
  }

  if (
    interaction.customId ===
    DELETE_ID
  ) {
    await deleteTicket(
      interaction
    );
    return true;
  }

  return false;
}

module.exports = {
  handle,
  createTicket,
  closeTicket,
  deleteTicket,
  CREATE_ID,
  CLOSE_ID,
  DELETE_ID
};
