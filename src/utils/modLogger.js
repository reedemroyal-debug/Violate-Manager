const {
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const logsFile = path.join(
  __dirname,
  "logsData.json"
);

function getLogChannelId(guildId, type) {
  try {
    if (!fs.existsSync(logsFile)) {
      return null;
    }

    const data = JSON.parse(
      fs.readFileSync(logsFile, "utf8")
    );

    return data[guildId]?.[type] || null;
  } catch (error) {
    console.error(
      "❌ Log config error:",
      error.message
    );

    return null;
  }
}

async function sendLog({
  guild,
  type,
  title,
  action,
  target,
  moderator,
  reason,
  duration
}) {
  try {
    const channelId =
      getLogChannelId(
        guild.id,
        type
      );

    if (!channelId) {
      console.log(
        `⚠️ No ${type} log channel configured.`
      );
      return;
    }

    const channel =
      guild.channels.cache.get(
        channelId
      );

    if (
      !channel ||
      !channel.isTextBased()
    ) {
      console.log(
        `⚠️ ${type} log channel not found.`
      );
      return;
    }

    const fields = [
      {
        name: "🎯 Target",
        value:
          `${target.tag}\nID: \`${target.id}\``
      },
      {
        name: "👮 Moderator",
        value:
          `${moderator.tag}\nID: \`${moderator.id}\``
      },
      {
        name: "📝 Reason",
        value:
          reason || "No reason"
      }
    ];

    if (duration) {
      fields.push({
        name: "⏱️ Duration",
        value: duration
      });
    }

    fields.push({
      name: "🛡️ Action",
      value: action
    });

    const embed =
      new EmbedBuilder()
        .setTitle(title)
        .addFields(fields)
        .setTimestamp();

    await channel.send({
      embeds: [embed]
    });

    console.log(
      `✅ ${type} log sent for ${target.tag}`
    );
  } catch (error) {
    console.error(
      `❌ ${type} log failed:`,
      error.message
    );
  }
}

async function sendDM({
  guild,
  target,
  action,
  reason,
  moderator,
  duration
}) {
  try {
    const fields = [
      `**Server:** ${guild.name}`,
      `**Action:** ${action}`,
      `**Reason:** ${reason || "No reason"}`,
      `**Moderator:** ${moderator.tag}`
    ];

    if (duration) {
      fields.push(
        `**Duration:** ${duration}`
      );
    }

    await target.send(
      `## 🚨 Moderation Notice\n\n` +
      fields.join("\n")
    );

    return true;
  } catch (error) {
    console.log(
      `⚠️ Could not DM ${target.tag}: ${error.message}`
    );

    return false;
  }
}

module.exports = {
  sendLog,
  sendDM
};
