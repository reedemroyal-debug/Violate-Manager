const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(__dirname, "../utils/ticketConfig.json");

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return { panels: {}, categories: {} };
  }
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Create a ticket panel")
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "setup") return;

    const embed = new EmbedBuilder()
      .setTitle("🎫 Ticket Setup")
      .setDescription(
        "Please enter the requested information as prompted.\n\n" +
        "This embed will automatically populate with the information you provide.\n\n" +
        "**Required:**\n" +
        "📝 Title\n" +
        "📄 Description\n" +
        "🎨 Color\n\n" +
        "**Optional:**\n" +
        "🖼️ Image\n" +
        "🖼️ Thumbnail\n" +
        "📋 JSON"
      )
      .setColor(0x5865f2);

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_title")
        .setLabel("Title")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("ticket_description")
        .setLabel("Description")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("ticket_color")
        .setLabel("Color")
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_image")
        .setLabel("Image")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("ticket_thumbnail")
        .setLabel("Thumbnail")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("ticket_json")
        .setLabel("JSON")
        .setStyle(ButtonStyle.Success)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_save_category")
        .setLabel("Save & Set Category")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("ticket_exit")
        .setLabel("Exit")
        .setStyle(ButtonStyle.Danger)
    );

    const config = loadConfig();

    config.panels[interaction.user.id] = {
      title: null,
      description: null,
      color: null,
      image: null,
      thumbnail: null,
      json: null,
      categories: []
    };

    saveConfig(config);

    await interaction.reply({
      embeds: [embed],
      components: [row1, row2, row3],
      ephemeral: true
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      time: 15 * 60 * 1000
    });

    collector.on("collect", async button => {
      if (button.user.id !== interaction.user.id) {
        return button.reply({
          content: "❌ This setup belongs to someone else.",
          ephemeral: true
        });
      }

      const cfg = loadConfig();
      const panel = cfg.panels[interaction.user.id];

      if (!panel) {
        return button.reply({
          content: "❌ Setup expired. Run `/ticket setup` again.",
          ephemeral: true
        });
      }

      if (button.customId === "ticket_exit") {
        delete cfg.panels[interaction.user.id];
        saveConfig(cfg);
        collector.stop();

        return button.update({
          content: "❌ Ticket setup cancelled.",
          embeds: [],
          components: []
        });
      }

      const modalMap = {
        ticket_title: {
          title: "Ticket Title",
          customId: "ticket_modal_title",
          label: "Title",
          placeholder: "Example: Welcome to Support",
          key: "title"
        },
        ticket_description: {
          title: "Ticket Description",
          customId: "ticket_modal_description",
          label: "Description",
          placeholder: "Enter your ticket panel description...",
          key: "description"
        },
        ticket_image: {
          title: "Ticket Image",
          customId: "ticket_modal_image",
          label: "Image URL",
          placeholder: "https://example.com/image.png",
          key: "image"
        },
        ticket_thumbnail: {
          title: "Ticket Thumbnail",
          customId: "ticket_modal_thumbnail",
          label: "Thumbnail URL",
          placeholder: "https://example.com/thumbnail.png",
          key: "thumbnail"
        },
        ticket_json: {
          title: "Ticket JSON",
          customId: "ticket_modal_json",
          label: "JSON",
          placeholder: '{"title":"Support","color":"#5865F2"}',
          key: "json"
        }
      };

      const modalData = modalMap[button.customId];

      if (modalData) {
        const modal = new ModalBuilder()
          .setCustomId(modalData.customId)
          .setTitle(modalData.title);

        const input = new TextInputBuilder()
          .setCustomId("value")
          .setLabel(modalData.label)
          .setStyle(
            modalData.key === "description" || modalData.key === "json"
              ? TextInputStyle.Paragraph
              : TextInputStyle.Short
          )
          .setRequired(true)
          .setPlaceholder(modalData.placeholder);

        if (panel[modalData.key]) {
          input.setValue(String(panel[modalData.key]));
        }

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        await button.showModal(modal);

        const submitted = await button
          .awaitModalSubmit({
            time: 120000,
            filter: i =>
              i.user.id === interaction.user.id &&
              i.customId === modalData.customId
          })
          .catch(() => null);

        if (!submitted) return;

        panel[modalData.key] =
          submitted.fields.getTextInputValue("value").trim();

        saveConfig(cfg);

        await submitted.reply({
          content: `✅ ${modalData.label} saved.`,
          ephemeral: true
        });

        return;
      }

      if (button.customId === "ticket_color") {
        const colorEmbed = new EmbedBuilder()
          .setTitle("🎨 Select Ticket Color")
          .setDescription("Choose the color for the embed side bar.")
          .setColor(0x5865f2);

        const colors = [
          ["🔵 Blue", "ticket_color_BLUE", 0x3498db],
          ["🔴 Red", "ticket_color_RED", 0xe74c3c],
          ["🟢 Green", "ticket_color_GREEN", 0x2ecc71],
          ["🟡 Yellow", "ticket_color_YELLOW", 0xf1c40f],
          ["🟠 Orange", "ticket_color_ORANGE", 0xe67e22],
          ["🟣 Purple", "ticket_color_PURPLE", 0x9b59b6],
          ["🩷 Pink", "ticket_color_PINK", 0xe91e63],
          ["🩵 Cyan", "ticket_color_CYAN", 0x00bcd4]
        ];

        const colorRows = [];

        for (let i = 0; i < colors.length; i += 4) {
          colorRows.push(
            new ActionRowBuilder().addComponents(
              ...colors.slice(i, i + 4).map(c =>
                new ButtonBuilder()
                  .setCustomId(c[1])
                  .setLabel(c[0])
                  .setStyle(ButtonStyle.Secondary)
              )
            )
          );
        }

        await button.reply({
          embeds: [colorEmbed],
          components: colorRows,
          ephemeral: true
        });

        const colorMessage = await button.fetchReply();

        const colorCollector =
          colorMessage.createMessageComponentCollector({
            time: 120000,
            filter: b => b.user.id === interaction.user.id
          });

        colorCollector.on("collect", async colorButton => {
          const selected = colors.find(
            c => c[1] === colorButton.customId
          );

          if (!selected) return;

          panel.color = selected[2];
          saveConfig(cfg);

          await colorButton.update({
            content: `✅ Color set to **${selected[0]}**.`,
            embeds: [],
            components: []
          });

          colorCollector.stop();
        });

        return;
      }

      if (button.customId === "ticket_save_category") {
        if (!panel.title || !panel.description || !panel.color) {
          return button.reply({
            content:
              "❌ **Title, Description and Color are compulsory.**\n" +
              "Please complete all three before continuing.",
            ephemeral: true
          });
        }

        const categoryEmbed = new EmbedBuilder()
          .setTitle("🎫 Ticket Categories")
          .setDescription(
            "Use the buttons below to add categories.\n\n" +
            "Each category can have:\n" +
            "• Custom name\n" +
            "• Description\n" +
            "• Custom emoji\n" +
            "• Discord channel category\n" +
            "• Staff role"
          )
          .setColor(panel.color);

        const categoryRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_add_category")
            .setLabel("Add Select Menu Option")
            .setStyle(ButtonStyle.Primary)
        );

        const finishRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_finish")
            .setLabel("FINISH")
            .setStyle(ButtonStyle.Success),

          new ButtonBuilder()
            .setCustomId("ticket_remove_category")
            .setLabel("Remove Category")
            .setStyle(ButtonStyle.Secondary)
        );

        await button.reply({
          embeds: [categoryEmbed],
          components: [categoryRow, finishRow],
          ephemeral: true
        });

        return;
      }

      await button.deferUpdate();
    });
  }
};
