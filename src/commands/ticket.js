const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(
  __dirname,
  "../utils/ticketConfig.json"
);

function loadConfig() {
  try {
    return JSON.parse(
      fs.readFileSync(CONFIG, "utf8")
    );
  } catch {
    return {
      panels: {},
      categories: {}
    };
  }
}

function saveConfig(data) {
  fs.writeFileSync(
    CONFIG,
    JSON.stringify(data, null, 2)
  );
}

module.exports = {

  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels
    )

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription(
          "Create and configure a ticket panel"
        )
    ),

  async execute(interaction) {

    if (
      interaction.options.getSubcommand() !==
      "setup"
    ) {
      return;
    }

    const config = loadConfig();

    /*
     * Create a fresh setup for this user.
     */
    config.panels[
      interaction.user.id
    ] = {
      title: null,
      description: null,
      color: null,
      image: null,
      thumbnail: null,
      json: null,
      categories: []
    };

    saveConfig(config);

    /*
     * Initial setup panel
     */
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

    const row1 =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_title"
          )
          .setLabel("Title")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_description"
          )
          .setLabel("Description")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_color"
          )
          .setLabel("Color")
          .setStyle(
            ButtonStyle.Primary
          )
      );

    const row2 =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_image"
          )
          .setLabel("Image")
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_thumbnail"
          )
          .setLabel("Thumbnail")
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_json"
          )
          .setLabel("JSON")
          .setStyle(
            ButtonStyle.Success
          )
      );

    const row3 =
      new ActionRowBuilder().addComponents(

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_save_category"
          )
          .setLabel(
            "Save & Set Category"
          )
          .setStyle(
            ButtonStyle.Success
          ),

        new ButtonBuilder()
          .setCustomId(
            "ticket_setup_exit"
          )
          .setLabel("Exit")
          .setStyle(
            ButtonStyle.Danger
          )
      );

    await interaction.reply({
      embeds: [embed],
      components: [
        row1,
        row2,
        row3
      ],
      ephemeral: true
    });
  }
};
