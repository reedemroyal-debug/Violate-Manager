const {
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const logsFile = path.join(
  __dirname,
  "logsData.json"
);

// =====================================
// LOAD LOG CONFIG
// =====================================

function getLogsConfig() {
  try {
    if (!fs.existsSync(logsFile)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(logsFile, "utf8")
    );

  } catch (error) {
    console.error(
      "❌ Logs config read error:",
      error.message
    );

    return {};
  }
}

// =====================================
// GET LOG CHANNEL
// =====================================

function getLogChannel(guild, type) {
  try {
    if (!guild) return null;

    const data = getLogsConfig();

    const guildConfig =
      data[guild.id];

    if (!guildConfig) {
      return null;
    }

    const channelId =
      guildConfig[type];

    if (!channelId) {
      return null;
    }

    const channel =
      guild.channels.cache.get(
        channelId
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      return null;
    }

    return channel;

  } catch (error) {
    console.error(
      "❌ Get log channel error:",
      error.message
    );

    return null;
  }
}

// =====================================
// SEND CENTRAL LOG
// =====================================

async function sendLog({
  guild,
  type,
  title,
  action,
  target,
  moderator,
  reason,
  duration,
  description,
  fields = [],
  color = "#5865F2"
}) {
  try {
    if (!guild) return false;

    const channel =
      getLogChannel(
        guild,
        type
      );

    if (!channel) {
      console.log(
        `⚠️ ${type} log channel not configured.`
      );

      return false;
    }

    const embed =
      new EmbedBuilder()
        .setTitle(
          title || "📋 Moderation Log"
        )
        .setColor(color)
        .setTimestamp();

    // =================================
    // DESCRIPTION
    // =================================

    if (description) {
      embed.setDescription(
        description
      );
    }

    // =================================
    // TARGET
    // =================================

    if (target) {
      const targetName =
        target.tag ||
        target.user?.tag ||
        target.username ||
        "Unknown";

      const targetId =
        target.id ||
        target.user?.id ||
        "Unknown";

      embed.addFields({
        name: "🎯 Target",
        value:
          `${targetName}\nID: \`${targetId}\``,
        inline: false
      });
    }

    // =================================
    // MODERATOR
    // =================================

    if (moderator) {
      const moderatorName =
        moderator.tag ||
        moderator.user?.tag ||
        moderator.username ||
        "Unknown";

      const moderatorId =
        moderator.id ||
        moderator.user?.id ||
        "Unknown";

      embed.addFields({
        name: "👮 Moderator",
        value:
          `${moderatorName}\nID: \`${moderatorId}\``,
        inline: false
      });
    }

    // =================================
    // ACTION
    // =================================

    if (action) {
      embed.addFields({
        name: "🛡️ Action",
        value: String(action),
        inline: true
      });
    }

    // =================================
    // REASON
    // =================================

    if (reason) {
      embed.addFields({
        name: "📝 Reason",
        value:
          String(reason).slice(0, 1024),
        inline: false
      });
    }

    // =================================
    // DURATION
    // =================================

    if (duration) {
      embed.addFields({
        name: "⏱️ Duration",
        value: String(duration),
        inline: true
      });
    }

    // =================================
    // CUSTOM FIELDS
    // =================================

    if (Array.isArray(fields)) {
      const validFields =
        fields
          .filter(
            field =>
              field &&
              field.name &&
              field.value
          )
          .map(field => ({
            name:
              String(field.name)
                .slice(0, 256),

            value:
              String(field.value)
                .slice(0, 1024),

            inline:
              Boolean(field.inline)
          }));

      if (validFields.length) {
        embed.addFields(
          validFields
        );
      }
    }

    // =================================
    // FOOTER
    // =================================

    embed.setFooter({
      text:
        `VIOLATE MANAGER • ${String(type).toUpperCase()} LOG`
    });

    await channel.send({
      embeds: [embed]
    });

    console.log(
      `✅ ${type} log sent.`
    );

    return true;

  } catch (error) {
    console.error(
      `❌ ${type} log failed:`,
      error.message
    );

    return false;
  }
}

// =====================================
// SEND MODERATION DM
// =====================================

async function sendDM({
  guild,
  target,
  action,
  reason,
  moderator,
  duration
}) {
  try {
    if (!target) {
      return false;
    }

    const targetUser =
      target.user || target;

    if (!targetUser.send) {
      return false;
    }

    const lines = [
      `**Server:** ${guild?.name || "Unknown Server"}`,
      `**Action:** ${action || "Moderation Action"}`,
      `**Reason:** ${reason || "No reason"}`,
      `**Moderator:** ${
        moderator?.tag ||
        moderator?.user?.tag ||
        "Unknown"
      }`
    ];

    if (duration) {
      lines.push(
        `**Duration:** ${duration}`
      );
    }

    await targetUser.send(
      "## 🚨 Moderation Notice\n\n" +
      lines.join("\n")
    );

    return true;

  } catch (error) {
    console.log(
      `⚠️ Could not DM user: ${error.message}`
    );

    return false;
  }
}

// =====================================
// AUTOMOD LOG
// =====================================

async function sendAutoModLog({
  guild,
  target,
  channel,
  reason,
  violations,
  action,
  deleted,
  timedOut
}) {
  return sendLog({
    guild,
    type: "mod",
    title: "🛡️ AutoMod Action",
    action:
      action || "AutoMod Violation",
    target,
    reason,
    color: "#ED4245",

    fields: [
      {
        name: "📍 Channel",
        value:
          channel
            ? `${channel}\nID: \`${channel.id}\``
            : "Unknown",
        inline: true
      },

      {
        name: "🔢 Violations",
        value:
          String(
            violations ?? "Unknown"
          ),
        inline: true
      },

      {
        name: "🗑️ Message Deleted",
        value:
          deleted ? "Yes" : "No",
        inline: true
      },

      {
        name: "⏱️ Timeout",
        value:
          timedOut ? "Yes" : "No",
        inline: true
      }
    ]
  });
}

// =====================================
// ROLE PING LOG
// =====================================

async function sendRolePingLog({
  guild,
  target,
  channel,
  blockedCount,
  deleted,
  timedOut,
  details
}) {
  return sendLog({
    guild,
    type: "rolePing",
    title:
      "🚨 Unauthorized Role Ping",
    action:
      "Protected Role Ping Blocked",
    target,
    color: "#FEE75C",

    fields: [
      {
        name: "📍 Channel",
        value:
          channel
            ? `${channel}\nID: \`${channel.id}\``
            : "Unknown",
        inline: true
      },

      {
        name: "🔢 Unauthorized Pings",
        value:
          String(
            blockedCount || 0
          ),
        inline: true
      },

      {
        name: "🗑️ Message Deleted",
        value:
          deleted ? "Yes" : "No",
        inline: true
      },

      {
        name: "⏱️ Timeout",
        value:
          timedOut ? "1 minute" : "No",
        inline: true
      },

      ...(details
        ? [
            {
              name:
                "🎯 Protected Targets",
              value:
                String(details)
                  .slice(0, 1024),
              inline: false
            }
          ]
        : [])
    ]
  });
}

// =====================================
// EXPORT
// =====================================

module.exports = {
  getLogsConfig,
  getLogChannel,
  sendLog,
  sendDM,
  sendAutoModLog,
  sendRolePingLog
};
