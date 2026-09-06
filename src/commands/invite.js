const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/invites.json"
);

function load() {
  try {
    if (!fs.existsSync(DATA)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch (error) {
    console.error("❌ Invite data load error:", error);
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(
      DATA,
      JSON.stringify(data, null, 2)
    );
  } catch (error) {
    console.error("❌ Invite data save error:", error);
  }
}

function getGuildData(data, guildId) {
  data[guildId] ??= {
    enabled: true,
    logChannelId: null,
    users: {}
  };

  data[guildId].users ??= {};

  return data[guildId];
}

function getUserData(guildData, userId) {
  guildData.users[userId] ??= {
    joins: 0,
    leaves: 0,
    fake: 0
  };

  return guildData.users[userId];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Invite tracker system")

    // /invite
    .addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Show your invite statistics")
    )

    // /invite user
    .addSubcommand(sub =>
      sub
        .setName("user")
        .setDescription("Show another user's invite statistics")
        .addUserOption(option =>
          option
            .setName("member")
            .setDescription("Member to check")
            .setRequired(true)
        )
    )

    // /invite leaderboard
    .addSubcommand(sub =>
      sub
        .setName("leaderboard")
        .setDescription("Show the invite leaderboard")
    )

    // /invite setup
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Configure invite logging")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel for invite logs")
            .setRequired(true)
        )
    )

    // /invite toggle
    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable invite tracking")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable invite tracking?")
            .setRequired(true)
        )
    )

    // /invite reset
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset a user's invite statistics")
        .addUserOption(option =>
          option
            .setName("member")
            .setDescription("Member whose invites should be reset")
            .setRequired(true)
        )
    )

    // /invite resetall
    .addSubcommand(sub =>
      sub
        .setName("resetall")
        .setDescription("Reset all invite statistics")
    ),

  async execute(interaction) {
    const subcommand =
      interaction.options.getSubcommand();

    const data = load();

    const guildData =
      getGuildData(
        data,
        interaction.guild.id
      );

    // ================================
    // INFO
    // ================================

    if (subcommand === "info") {
      const user =
        interaction.user;

      const stats =
        getUserData(
          guildData,
          user.id
        );

      const realInvites =
        Math.max(
          0,
          stats.joins -
          stats.leaves -
          stats.fake
        );

      const embed =
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("📨 Invite Statistics")
          .setThumbnail(
            user.displayAvatarURL({
              size: 256
            })
          )
          .addFields(
            {
              name: "👤 User",
              value: `${user}`,
              inline: false
            },
            {
              name: "📥 Joins",
              value: `**${stats.joins}**`,
              inline: true
            },
            {
              name: "📤 Leaves",
              value: `**${stats.leaves}**`,
              inline: true
            },
            {
              name: "🚫 Fake",
              value: `**${stats.fake}**`,
              inline: true
            },
            {
              name: "🏆 Current Invites",
              value: `**${realInvites}**`,
              inline: false
            }
          )
          .setFooter({
            text: interaction.guild.name
          })
          .setTimestamp();

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ================================
    // USER
    // ================================

    if (subcommand === "user") {
      const user =
        interaction.options.getUser("member");

      const stats =
        getUserData(
          guildData,
          user.id
        );

      const realInvites =
        Math.max(
          0,
          stats.joins -
          stats.leaves -
          stats.fake
        );

      const embed =
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("📨 Invite Statistics")
          .setThumbnail(
            user.displayAvatarURL({
              size: 256
            })
          )
          .addFields(
            {
              name: "👤 User",
              value: `${user}`,
              inline: false
            },
            {
              name: "📥 Joins",
              value: `**${stats.joins}**`,
              inline: true
            },
            {
              name: "📤 Leaves",
              value: `**${stats.leaves}**`,
              inline: true
            },
            {
              name: "🚫 Fake",
              value: `**${stats.fake}**`,
              inline: true
            },
            {
              name: "🏆 Current Invites",
              value: `**${realInvites}**`,
              inline: false
            }
          )
          .setFooter({
            text: interaction.guild.name
          })
          .setTimestamp();

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ================================
    // LEADERBOARD
    // ================================

    if (subcommand === "leaderboard") {
      const entries =
        Object.entries(guildData.users)
          .map(([userId, stats]) => ({
            userId,
            invites: Math.max(
              0,
              (stats.joins || 0) -
              (stats.leaves || 0) -
              (stats.fake || 0)
            )
          }))
          .filter(entry => entry.invites > 0)
          .sort(
            (a, b) =>
              b.invites - a.invites
          )
          .slice(0, 10);

      if (!entries.length) {
        return interaction.reply({
          content:
            "📨 No invite statistics available yet."
        });
      }

      const lines = [];

      for (
        let i = 0;
        i < entries.length;
        i++
      ) {
        const entry =
          entries[i];

        let user;

        try {
          user =
            await interaction.client.users.fetch(
              entry.userId
            );
        } catch {
          user = null;
        }

        const name =
          user
            ? user.username
            : `Unknown User`;

        const medal =
          i === 0
            ? "🥇"
            : i === 1
              ? "🥈"
              : i === 2
                ? "🥉"
                : `**${i + 1}.**`;

        lines.push(
          `${medal} ${name} — **${entry.invites}** invites`
        );
      }

      const embed =
        new EmbedBuilder()
          .setColor("#5865F2")
          .setTitle("🏆 Invite Leaderboard")
          .setDescription(
            lines.join("\n")
          )
          .setFooter({
            text: interaction.guild.name
          })
          .setTimestamp();

      return interaction.reply({
        embeds: [embed]
      });
    }

    // ================================
    // SETUP
    // ================================

    if (subcommand === "setup") {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ You need **Manage Server** permission.",
          ephemeral: true
        });
      }

      const channel =
        interaction.options.getChannel(
          "channel"
        );

      guildData.logChannelId =
        channel.id;

      guildData.enabled = true;

      save(data);

      return interaction.reply({
        content:
          `✅ Invite tracker configured!\n\n` +
          `📢 Log Channel: ${channel}\n` +
          `🟢 Status: Enabled`,
        ephemeral: true
      });
    }

    // ================================
    // TOGGLE
    // ================================

    if (subcommand === "toggle") {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ You need **Manage Server** permission.",
          ephemeral: true
        });
      }

      const enabled =
        interaction.options.getBoolean(
          "enabled"
        );

      guildData.enabled =
        enabled;

      save(data);

      return interaction.reply({
        content:
          `📨 Invite tracker is now **${
            enabled
              ? "enabled 🟢"
              : "disabled 🔴"
          }**.`,
        ephemeral: true
      });
    }

    // ================================
    // RESET USER
    // ================================

    if (subcommand === "reset") {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        )
      ) {
        return interaction.reply({
          content:
            "❌ You need **Manage Server** permission.",
          ephemeral: true
        });
      }

      const user =
        interaction.options.getUser(
          "member"
        );

      guildData.users[user.id] = {
        joins: 0,
        leaves: 0,
        fake: 0
      };

      save(data);

      return interaction.reply({
        content:
          `✅ Invite statistics reset for ${user}.`,
        ephemeral: true
      });
    }

    // ================================
    // RESET ALL
    // ================================

    if (subcommand === "resetall") {
      if (
        !interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ You need **Administrator** permission.",
          ephemeral: true
        });
      }

      guildData.users = {};

      save(data);

      return interaction.reply({
        content:
          "🗑️ **All invite statistics have been reset.**",
        ephemeral: true
      });
    }
  }
};
