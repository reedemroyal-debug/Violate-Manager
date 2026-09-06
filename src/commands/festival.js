const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/festivalConfig.json"
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
    .setName("festival")
    .setDescription("Automatic festival announcements")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Set the festival announcement channel")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Announcement channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable automatic festivals")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable automatic announcements")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List upcoming Panchang festivals")
    )

    .addSubcommand(sub =>
      sub
        .setName("next")
        .setDescription("Show the next Panchang festival")
    )

    .addSubcommand(sub =>
      sub
        .setName("test")
        .setDescription("Test today's Panchang festival announcement")
    )

    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const festivalSystem =
      require("../events/festival");

    const sub =
      interaction.options.getSubcommand();

    const data = load();
    const guildId = interaction.guild.id;

    data[guildId] ??= {
      enabled: false,
      channelId: null,
      lastSent: null
    };

    const config = data[guildId];

    // ─────────────────────────────
    // SETUP
    // ─────────────────────────────
    if (sub === "setup") {
      const channel =
        interaction.options.getChannel("channel");

      config.channelId = channel.id;
      save(data);

      return interaction.reply({
        content:
          `✅ Festival announcements will be sent in ${channel}.`,
        ephemeral: true
      });
    }

    // ─────────────────────────────
    // TOGGLE
    // ─────────────────────────────
    if (sub === "toggle") {
      const enabled =
        interaction.options.getBoolean("enabled");

      config.enabled = enabled;
      save(data);

      return interaction.reply({
        content:
          `🎉 Festival system is now **${enabled ? "enabled 🟢" : "disabled 🔴"}**.`,
        ephemeral: true
      });
    }

    // ─────────────────────────────
    // LIST
    // ─────────────────────────────
    if (sub === "list") {
      const upcoming =
        festivalSystem.getUpcomingFestivals();

      if (!upcoming.length) {
        return interaction.reply({
          content: "📅 No upcoming Panchang festivals found.",
          ephemeral: true
        });
      }

      const list = upcoming
        .slice(0, 15)
        .map(f => {
          const date = new Date(f.date);

          return (
            `🎉 **${f.name}**\n` +
            `📅 ${date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata"
            })}`
          );
        })
        .join("\n\n");

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("📅 Upcoming Panchang Festivals")
            .setDescription(list)
            .setColor("#5865F2")
        ],
        ephemeral: true
      });
    }

    // ─────────────────────────────
    // NEXT
    // ─────────────────────────────
    if (sub === "next") {
      const upcoming =
        festivalSystem.getUpcomingFestivals();

      if (!upcoming.length) {
        return interaction.reply({
          content: "📅 No upcoming festival found.",
          ephemeral: true
        });
      }

      const festival = upcoming[0];
      const date = new Date(festival.date);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🎉 Next Festival")
            .setDescription(
              `**${festival.name}**\n\n` +
              `📅 ${date.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Kolkata"
              })}`
            )
            .setColor("#5865F2")
        ],
        ephemeral: true
      });
    }

    // ─────────────────────────────
    // TEST
    // ─────────────────────────────
    if (sub === "test") {
      const festivals =
        festivalSystem.getPanchangFestivals();

      if (!festivals.length) {
        return interaction.reply({
          content:
            "❌ Aaj Panchang ke according koi supported festival nahi hai.",
          ephemeral: true
        });
      }

      const config = load()[guildId];

      if (!config || !config.channelId) {
        return interaction.reply({
          content:
            "⚠️ Pehle `/festival setup` se announcement channel set kar.",
          ephemeral: true
        });
      }

      // Test the first detected festival
      const festival = festivals[0];

      const sent =
        await festivalSystem.sendFestival(
          interaction.guild,
          festival,
          config.channelId
        );

      return interaction.reply({
        content:
          sent
            ? `✅ **${festival.name}** announcement sent!`
            : "⚠️ Announcement send nahi ho paya. Channel/permissions check kar.",
        ephemeral: true
      });
    }
  }
};
