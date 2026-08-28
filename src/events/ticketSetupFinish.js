const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
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

module.exports = {
  async handle(interaction) {
    if (!interaction.isButton()) return false;

    if (
      interaction.customId !== "ticket_finish" &&
      interaction.customId !== "ticket_remove_category"
    ) {
      return false;
    }

    const data = load();
    const panel = data.panels[interaction.user.id];

    if (!panel) {
      await interaction.reply({
        content: "❌ Ticket setup expired. Run `/ticket setup` again.",
        ephemeral: true
      });
      return true;
    }

    // =============================
    // REMOVE CATEGORY
    // =============================

    if (
      interaction.customId ===
      "ticket_remove_category"
    ) {
      if (!panel.categories?.length) {
        await interaction.reply({
          content: "❌ There are no categories to remove.",
          ephemeral: true
        });
        return true;
      }

      const menu =
        new StringSelectMenuBuilder()
          .setCustomId("ticket_remove_select")
          .setPlaceholder("Select category to remove")
          .setMinValues(1)
          .setMaxValues(1)
          .addOptions(
            panel.categories.map(category =>
              new StringSelectMenuOptionBuilder()
                .setLabel(
                  category.name.slice(0, 100)
                )
                .setDescription(
                  category.description.slice(0, 100)
                )
                .setValue(category.id)
                .setEmoji(
                  category.emoji || "🎫"
                )
            )
          );

      await interaction.reply({
        content:
          "🗑️ Select the category you want to remove.",
        components: [
          new ActionRowBuilder().addComponents(menu)
        ],
        ephemeral: true
      });

      return true;
    }

    // =============================
    // FINISH VALIDATION
    // =============================

    if (!panel.title) {
      await interaction.reply({
        content: "❌ Ticket title is required.",
        ephemeral: true
      });
      return true;
    }

    if (!panel.description) {
      await interaction.reply({
        content: "❌ Ticket description is required.",
        ephemeral: true
      });
      return true;
    }

    if (!panel.color) {
      await interaction.reply({
        content: "❌ Ticket color is required.",
        ephemeral: true
      });
      return true;
    }

    if (!panel.categories?.length) {
      await interaction.reply({
        content:
          "❌ Add at least one ticket category before finishing.",
        ephemeral: true
      });
      return true;
    }

    const incomplete =
      panel.categories.find(
        category =>
          !category.discordCategoryId ||
          !category.staffRoleId
      );

    if (incomplete) {
      await interaction.reply({
        content:
          `❌ Category **${incomplete.name}** is incomplete.\n\n` +
          "Every category needs both:\n" +
          "📁 Discord Category\n" +
          "👮 Staff Role",
        ephemeral: true
      });
      return true;
    }

    // =============================
    // CREATE FINAL PANEL
    // =============================

    const embed =
      new EmbedBuilder()
        .setTitle(panel.title)
        .setDescription(panel.description)
        .setColor(panel.color);

    if (panel.image) {
      embed.setImage(panel.image);
    }

    if (panel.thumbnail) {
      embed.setThumbnail(panel.thumbnail);
    }

    const menu =
      new StringSelectMenuBuilder()
        .setCustomId("ticket_category_select")
        .setPlaceholder("🎫 Select a ticket category")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          panel.categories.map(category =>
            new StringSelectMenuOptionBuilder()
              .setLabel(
                category.name.slice(0, 100)
              )
              .setDescription(
                category.description.slice(0, 100)
              )
              .setValue(category.id)
              .setEmoji(
                category.emoji || "🎫"
              )
          )
        );

    const finalRow =
      new ActionRowBuilder().addComponents(menu);

    const sent =
      await interaction.channel.send({
        embeds: [embed],
        components: [finalRow]
      });

    // =============================
    // SAVE PANEL
    // =============================

    const panelId =
      `panel_${Date.now()}`;

    data.categories ??= {};

    for (const category of panel.categories) {
      data.categories[category.id] = {
        ...category,
        panelId
      };
    }

    data.panels[panelId] = {
      ...panel,
      panelId,
      channelId: interaction.channel.id,
      messageId: sent.id,
      createdBy: interaction.user.id
    };

    delete data.panels[interaction.user.id];

    save(data);

    await interaction.update({
      content:
        "✅ **Ticket panel created successfully!**\n\n" +
        `📌 Panel: ${sent.url}`,
      embeds: [],
      components: []
    });

    return true;
  }
};
