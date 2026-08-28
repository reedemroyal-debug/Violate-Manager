const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/welcome.json"
);

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(
    DATA,
    JSON.stringify(data, null, 2)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Manage the welcome system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Configure the welcome message")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Welcome channel")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("message")
            .setDescription("Welcome message")
            .setRequired(false)
            .setMaxLength(2000)
        )
        .addStringOption(option =>
          option
            .setName("title")
            .setDescription("Embed title")
            .setRequired(false)
            .setMaxLength(256)
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Embed description")
            .setRequired(false)
            .setMaxLength(4000)
        )
        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("HEX color, e.g. #5865F2")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("image")
            .setDescription("Welcome image/banner URL")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("thumbnail")
            .setDescription("Thumbnail URL")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("footer")
            .setDescription("Embed footer")
            .setRequired(false)
            .setMaxLength(2048)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable welcome messages")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable welcome system?")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test the welcome message")
    )

    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View current welcome configuration")
    ),

  async execute(interaction) {
    const sub =
      interaction.options.getSubcommand();

    const data = load();
    const guildId = interaction.guild.id;

    data[guildId] ??= {
      enabled: false,
      channelId: null,
      message: "",
      title: "",
      description: "",
      color: "#5865F2",
      image: "",
      thumbnail: "",
      footer: ""
    };

    const config = data[guildId];

    // ==========================
    // SETUP
    // ==========================

    if (sub === "setup") {
      const channel =
        interaction.options.getChannel("channel");

      const message =
        interaction.options.getString("message") || "";

      const title =
        interaction.options.getString("title") || "";

      const description =
        interaction.options.getString("description") || "";

      const color =
        interaction.options.getString("color") || "#5865F2";

      const image =
        interaction.options.getString("image") || "";

      const thumbnail =
        interaction.options.getString("thumbnail") || "";

      const footer =
        interaction.options.getString("footer") || "";

      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
          content: "❌ Invalid HEX color. Example: `#5865F2`",
          ephemeral: true
        });
      }

      if (
        !message &&
        !title &&
        !description &&
        !image
      ) {
        return interaction.reply({
          content:
            "❌ Add at least a message, title, description, or image.",
          ephemeral: true
        });
      }

      config.channelId = channel.id;
      config.message = message;
      config.title = title;
      config.description = description;
      config.color = color;
      config.image = image;
      config.thumbnail = thumbnail;
      config.footer = footer;
      config.enabled = true;

      save(data);

      return interaction.reply(
        `✅ Welcome system configured!\n\n` +
        `📢 Channel: ${channel}\n` +
        `🟢 Status: **Enabled**`
      );
    }

    // ==========================
    // TOGGLE
    // ==========================

    if (sub === "toggle") {
      config.enabled =
        interaction.options.getBoolean("enabled");

      save(data);

      return interaction.reply(
        `👋 Welcome system is now **${
          config.enabled
            ? "enabled 🟢"
            : "disabled 🔴"
        }**.`
      );
    }

    // ==========================
    // VIEW
    // ==========================

    if (sub === "view") {
      const embed =
        new EmbedBuilder()
          .setTitle("👋 Welcome Configuration")
          .setColor(config.color || "#5865F2")
          .addFields(
            {
              name: "Status",
              value: config.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "Channel",
              value: config.channelId
                ? `<#${config.channelId}>`
                : "Not configured",
              inline: true
            },
            {
              name: "Message",
              value: config.message || "None"
            }
          );

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // ==========================
    // TEST
    // ==========================

    if (sub === "test") {
      if (!config.channelId) {
        return interaction.reply({
          content:
            "❌ Welcome system isn't configured yet.",
          ephemeral: true
        });
      }

      const channel =
        interaction.guild.channels.cache.get(
          config.channelId
        );

      if (!channel) {
        return interaction.reply({
          content:
            "❌ Configured welcome channel no longer exists.",
          ephemeral: true
        });
      }

      const replace = text =>
        String(text || "")
          .replaceAll(
            "{user}",
            `<@${interaction.user.id}>`
          )
          .replaceAll(
            "{username}",
            interaction.user.username
          )
          .replaceAll(
            "{server}",
            interaction.guild.name
          )
          .replaceAll(
            "{membercount}",
            String(interaction.guild.memberCount)
          );

      const payload = {};

      if (config.message) {
        payload.content =
          replace(config.message);
      }

      if (
        config.title ||
        config.description ||
        config.image ||
        config.thumbnail ||
        config.footer
      ) {
        const embed =
          new EmbedBuilder()
            .setColor(
              config.color || "#5865F2"
            );

        if (config.title)
          embed.setTitle(
            replace(config.title)
          );

        if (config.description)
          embed.setDescription(
            replace(config.description)
          );

        if (config.image)
          embed.setImage(config.image);

        if (config.thumbnail)
          embed.setThumbnail(config.thumbnail);

        if (config.footer)
          embed.setFooter({
            text: replace(config.footer)
          });

        payload.embeds = [embed];
      }

      await channel.send(payload);

      return interaction.reply({
        content:
          `✅ Test welcome sent in ${channel}.`,
        ephemeral: true
      });
    }
  }
};
