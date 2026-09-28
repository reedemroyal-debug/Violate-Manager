const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require("discord.js");

const { getGuild, updateGuild } = require("./config");
const { resolveEmoji, parseEmoji } = require("./emoji");

async function createTicket(interaction, categoryId) {
  const config = getGuild(interaction.guild.id);
  const category = config.categories?.[categoryId];

  if (!category) {
    return interaction.reply({
      content: "❌ Ticket category not found.",
      flags: MessageFlags.Ephemeral
    });
  }

  const existing = interaction.guild.channels.cache.find(
    channel =>
      channel.parentId === config.ticketCategoryId &&
      channel.topic ===
        `VIOLATE-TICKET:${interaction.user.id}:${categoryId}`
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have a ticket: ${existing}`,
      flags: MessageFlags.Ephemeral
    });
  }

  const resolvedEmoji = await resolveEmoji(
    interaction.guild,
    category.emoji || "🎫"
  );

  category.emoji = resolvedEmoji;
  updateGuild(interaction.guild.id, config);

  const channelName =
    `${category.name}-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .slice(0, 90);

  const overwrites = [
    {
      id: interaction.guild.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (config.staffRoleId) {
    overwrites.push({
      id: config.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.ticketCategoryId || null,
    topic: `VIOLATE-TICKET:${interaction.user.id}:${categoryId}`,
    permissionOverwrites: overwrites
  });

  const embed = new EmbedBuilder()
    .setTitle(`${resolvedEmoji} ${category.name}`)
    .setDescription(
      category.description ||
      "Your ticket has been created. Please explain your issue."
    )
    .setColor(config.panel.color || "#5865F2");

  const closeButton = new ButtonBuilder()
    .setCustomId("ticket_close")
    .setLabel("Close Ticket")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("🔒");

  const row = new ActionRowBuilder()
    .addComponents(closeButton);

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed],
    components: [row]
  });

  await interaction.reply({
    content: `✅ Ticket created: ${channel}`,
    flags: MessageFlags.Ephemeral
  });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;

  if (!channel?.topic?.startsWith("VIOLATE-TICKET:")) {
    return interaction.reply({
      content: "❌ This is not a ticket channel.",
      flags: MessageFlags.Ephemeral
    });
  }

  await interaction.reply({
    content: "🔒 Ticket closed. Deleting in 5 seconds..."
  });

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 5000);
}

async function deployPanel(interaction, channel) {
  const config = getGuild(interaction.guild.id);
  const categories = Object.values(config.categories || {});

  if (!categories.length) {
    return interaction.reply({
      content: "❌ Add at least one ticket category first.",
      flags: MessageFlags.Ephemeral
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(config.panel.title || "Ticket Support")
    .setDescription(config.panel.description || "")
    .setColor(config.panel.color || "#5865F2");

  if (config.panel.image) {
    embed.setImage(config.panel.image);
  }

  if (config.panel.thumbnail) {
    embed.setThumbnail(config.panel.thumbnail);
  }

  const rows = [];
  let row = new ActionRowBuilder();

  for (const category of categories) {
    if (row.components.length >= 5) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    const resolvedEmoji = await resolveEmoji(
      interaction.guild,
      category.emoji || "🎫"
    );

    category.emoji = resolvedEmoji;

    const emojiObject = parseEmoji(resolvedEmoji);

    const button = new ButtonBuilder()
      .setCustomId(`ticket_create_${category.id}`)
      .setLabel(category.name.slice(0, 80))
      .setStyle(ButtonStyle.Primary);

    if (emojiObject) {
      button.setEmoji(emojiObject);
    }

    row.addComponents(button);
  }

  if (row.components.length) {
    rows.push(row);
  }

  updateGuild(interaction.guild.id, config);

  await channel.send({
    embeds: [embed],
    components: rows
  });

  config.panel.channelId = channel.id;
  config.enabled = true;

  updateGuild(interaction.guild.id, config);

  return interaction.reply({
    content: `✅ Ticket panel deployed in ${channel}.`,
    flags: MessageFlags.Ephemeral
  });
}

module.exports = {
  createTicket,
  closeTicket,
  deployPanel
};
