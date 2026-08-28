const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
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
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
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
        .setDescription("Create or update the welcome system")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Welcome channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("title")
            .setDescription("Welcome embed title")
            .setRequired(true)
            .setMaxLength(256)
        )
        .addStringOption(o =>
          o
            .setName("description")
            .setDescription("Welcome embed description")
            .setRequired(true)
            .setMaxLength(4000)
        )
        .addStringOption(o =>
          o
            .setName("color")
            .setDescription("Embed color, e.g. #5865F2")
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("message")
            .setDescription("Message above the embed")
            .setRequired(false)
            .setMaxLength(2000)
        )
        .addStringOption(o =>
          o
            .setName("image")
            .setDescription("Large image URL")
            .setRequired(false)
        )
        .addStringOption(o =>
          o
            .setName("thumbnail")
            .setDescription("Thumbnail URL")
            .setRequired(false)
        )
        .addStringOption(o =>
          o
            .setName("footer")
            .setDescription("Embed footer")
            .setRequired(false)
            .setMaxLength(2048)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable welcome")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enable welcome messages?")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Send a test welcome message")
    ),

  async execute(interaction) {
    const sub =
      interaction.options.getSubcommand();

    const data = load();
    const guildId = interaction.guild.id;

    data[guildId] ??= {
      enabled: false,
      channelId: null,
      title: null,
      description: null,
      color: "#5865F2",
      message: null,
      image: null,
      thumbnail: null,
      footer: null
    };

    const config = data[guildId];

    if (sub === "setup") {
      const channel =
        interaction.options.getChannel("channel");

      const title =
        interaction.options.getString("title");

      const description =
        interaction.options.getString("description");

      const color =
        interaction.options.getString("color");

      if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
        return interaction.reply({
          content:
            "❌ Invalid color. Use format like `#5865F2`.",
          ephemeral: true
        });
      }

      config.channelId = channel.id;
      config.title = title;
      config.description = description;
      config.color = color;

      config.message =
        interaction.options.getString("message") || null;

      config.image =
        interaction.options.getString("image") || null;

      config.thumbnail =
        interaction.options.getString("thumbnail") || null;

      config.footer =
        interaction.options.getString("footer") || null;

      config.enabled = true;

      save(data);

      return interaction.reply({
        content:
          `✅ **Welcome system configured!**\n\n` +
          `📢 Channel: ${channel}\n` +
          `🟢 Status: Enabled\n\n` +
          `Use \`/welcome test\` to preview it.`,
        ephemeral: true
      });
    }

    if (sub === "toggle") {
      const enabled =
        interaction.options.getBoolean("enabled");

      config.enabled = enabled;
      save(data);

      return interaction.reply(
        `👋 Welcome system is now **${
          enabled ? "enabled 🟢" : "disabled 🔴"
        }**.`
      );
    }

    if (sub === "test") {
      if (!config.channelId) {
        return interaction.reply({
          content:
            "❌ Welcome system isn't configured.",
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
            "❌ Welcome channel no longer exists.",
          ephemeral: true
        });
      }

      const welcomeEvent =
        require("../events/welcome");

      await welcomeEvent.sendWelcome(
        interaction.member
      );

      return interaction.reply({
        content:
          `✅ Test welcome sent in ${channel}.`,
        ephemeral: true
      });
    }
  }
};
