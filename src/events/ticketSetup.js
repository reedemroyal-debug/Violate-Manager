const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(__dirname, "../utils/ticketConfig.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return { panels: {}, categories: {} };
  }
}

function save(data) {
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

function getPanel(id) {
  const data = load();
  return data.panels[id];
}

module.exports = {
  async handle(interaction) {
    if (!interaction.isButton()) return false;

    if (interaction.customId !== "ticket_add_category") {
      return false;
    }

    const panel = getPanel(interaction.user.id);

    if (!panel) {
      await interaction.reply({
        content: "❌ Ticket setup expired. Run `/ticket setup` again.",
        ephemeral: true
      });
      return true;
    }

    const modal = new ModalBuilder()
      .setCustomId("ticket_category_modal")
      .setTitle("Add Ticket Category");

    const name = new TextInputBuilder()
      .setCustomId("category_name")
      .setLabel("Category Name")
      .setPlaceholder("Example: General Support")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);

    const description = new TextInputBuilder()
      .setCustomId("category_description")
      .setLabel("Description")
      .setPlaceholder("Example: Get help from our support team")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(200);

    const emoji = new TextInputBuilder()
      .setCustomId("category_emoji")
      .setLabel("Custom Emoji")
      .setPlaceholder("Example: 🎫 or <:support:123456789>")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(description),
      new ActionRowBuilder().addComponents(emoji)
    );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 120000,
      filter: i =>
        i.user.id === interaction.user.id &&
        i.customId === "ticket_category_modal"
    }).catch(() => null);

    if (!submitted) return true;

    const categoryName =
      submitted.fields.getTextInputValue("category_name").trim();

    const categoryDescription =
      submitted.fields.getTextInputValue("category_description").trim();

    const categoryEmoji =
      submitted.fields.getTextInputValue("category_emoji").trim();

    const data = load();

    data.panels[interaction.user.id] ??= panel;
    data.panels[interaction.user.id].categories ??= [];

    data.panels[interaction.user.id].categories.push({
      id: `category_${Date.now()}`,
      name: categoryName,
      description: categoryDescription,
      emoji: categoryEmoji,
      discordCategoryId: null,
      staffRoleId: null
    });

    save(data);

    const added =
      data.panels[interaction.user.id].categories.at(-1);

    await submitted.reply({
      content:
        `✅ Category **${added.name}** created.\n\n` +
        `Emoji: ${added.emoji}\n` +
        `Description: ${added.description}\n\n` +
        `Ab next step mein is category ke liye **Discord Category + Staff Role** select karenge.`,
      ephemeral: true
    });

    return true;
  }
};
