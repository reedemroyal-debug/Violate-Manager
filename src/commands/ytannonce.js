const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} = require("discord.js");

const yt = require("../ytannonce/manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ytannonce")
    .setDescription("Manage YouTube auto announcements")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set YouTube announcement")
        .addChannelOption(o =>
          o
            .setName("channel")
            .setDescription("Discord announcement channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(o =>
          o
            .setName("youtube")
            .setDescription("YouTube channel URL")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("message")
        .setDescription("Change announcement message")
        .addStringOption(o =>
          o
            .setName("text")
            .setDescription(
              "Use {everyone} {title} {link} {channel} {type}"
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("everyone")
        .setDescription("Toggle @everyone")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enable @everyone")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("embed")
        .setDescription("Toggle embeds")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enable embeds")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("thumbnail")
        .setDescription("Toggle thumbnails")
        .addBooleanOption(o =>
          o
            .setName("enabled")
            .setDescription("Enable thumbnails")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("off")
        .setDescription("Disable YouTube announcements")
    )

    .addSubcommand(sub =>
      sub
        .setName("status")
        .setDescription("Show current configuration")
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "set") {
      const channel =
        interaction.options.getChannel("channel");

      const url =
        interaction.options.getString("youtube");

      await interaction.deferReply();

      try {
        const channelId =
          await yt.resolveChannelId(url);

        yt.update(guildId, {
          enabled: true,
          discordChannel: channel.id,
          youtubeUrl: url,
          channelId,
          lastVideo: null
        });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x00ffff)
              .setTitle("📺 YouTube Announcements Enabled")
              .setDescription(
                `**Discord Channel:** ${channel}\n` +
                `**YouTube:** ${url}\n\n` +
                `✅ RSS monitoring enabled.`
              )
          ]
        });
      } catch (error) {
        return interaction.editReply(
          `❌ Could not read that YouTube channel.\n\`${error.message}\``
        );
      }
    }

    if (sub === "message") {
      const text =
        interaction.options.getString("text");

      yt.update(guildId, {
        message: text
      });

      return interaction.reply(
        "✅ YouTube announcement message updated."
      );
    }

    if (sub === "everyone") {
      const enabled =
        interaction.options.getBoolean("enabled");

      yt.update(guildId, {
        everyone: enabled
      });

      return interaction.reply(
        `✅ @everyone is now **${enabled ? "ON" : "OFF"}**.`
      );
    }

    if (sub === "embed") {
      const enabled =
        interaction.options.getBoolean("enabled");

      yt.update(guildId, {
        embed: enabled
      });

      return interaction.reply(
        `✅ Embeds are now **${enabled ? "ON" : "OFF"}**.`
      );
    }

    if (sub === "thumbnail") {
      const enabled =
        interaction.options.getBoolean("enabled");

      yt.update(guildId, {
        thumbnail: enabled
      });

      return interaction.reply(
        `✅ Thumbnails are now **${enabled ? "ON" : "OFF"}**.`
      );
    }

    if (sub === "off") {
      yt.update(guildId, {
        enabled: false
      });

      return interaction.reply(
        "🛑 YouTube auto announcements disabled."
      );
    }

    const config = yt.get(guildId);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.enabled ? 0x00ff88 : 0xff4444)
          .setTitle("📺 YouTube Announcement Status")
          .addFields(
            {
              name: "Status",
              value: config.enabled
                ? "🟢 Enabled"
                : "🔴 Disabled",
              inline: true
            },
            {
              name: "Discord Channel",
              value: config.discordChannel
                ? `<#${config.discordChannel}>`
                : "Not set",
              inline: true
            },
            {
              name: "YouTube",
              value: config.youtubeUrl || "Not set",
              inline: false
            },
            {
              name: "@everyone",
              value: config.everyone ? "ON" : "OFF",
              inline: true
            },
            {
              name: "Embed",
              value: config.embed ? "ON" : "OFF",
              inline: true
            },
            {
              name: "Thumbnail",
              value: config.thumbnail ? "ON" : "OFF",
              inline: true
            }
          )
      ]
    });
  }
};
