const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const logsFile = path.join(__dirname, "logsData.json");

function getLogsConfig() {
  try {
    if (!fs.existsSync(logsFile)) return {};
    return JSON.parse(fs.readFileSync(logsFile, "utf8"));
  } catch (error) {
    console.error("❌ Logs config read error:", error.message);
    return {};
  }
}

function getLogChannel(guild, type) {
  try {
    const id = getLogsConfig()?.[guild?.id]?.[type];
    if (!id || !guild) return null;
    const channel = guild.channels.cache.get(id);
    return channel?.isTextBased() ? channel : null;
  } catch { return null; }
}

function personInfo(person) {
  if (!person) return null;
  const user = person.user || person;
  const id = user.id || person.id || "Unknown";
  const tag = user.tag || user.username || "Unknown";
  return { id, tag };
}

function channelInfo(channel) {
  if (!channel) return null;
  return `${channel.name ? `#${channel.name}` : `<#${channel.id}>`}\nID: \`${channel.id}\``;
}

async function sendLog({
  guild, type, title, action, target, moderator, reason, duration,
  description, fields = [], color = 0x5865F2, channel = null,
  messageId = null, channelId = null, files = []
}) {
  try {
    if (!guild) return false;
    const logChannel = getLogChannel(guild, type);
    if (!logChannel) return false;

    const embed = new EmbedBuilder()
      .setTitle(title || "📋 Log")
      .setColor(color)
      .setTimestamp();

    if (description) embed.setDescription(description);

    const t = personInfo(target);
    if (t) embed.addFields({ name: "🎯 Target", value: `${t.tag}\nID: \`${t.id}\``, inline: false });

    const m = personInfo(moderator);
    if (m) embed.addFields({ name: "👮 Moderator / Executor", value: `${m.tag}\nID: \`${m.id}\``, inline: false });

    if (channel || channelId) {
      const cid = channel?.id || channelId;
      embed.addFields({ name: "📍 Channel", value: channelInfo(channel) || `<#${cid}>\nID: \`${cid}\``, inline: true });
    }

    if (messageId) embed.addFields({ name: "🆔 Message ID", value: `\`${messageId}\``, inline: true });
    if (action) embed.addFields({ name: "🛡️ Action", value: String(action).slice(0, 1024), inline: true });
    if (reason) embed.addFields({ name: "📝 Reason", value: String(reason).slice(0, 1024), inline: false });
    if (duration) embed.addFields({ name: "⏱️ Duration", value: String(duration), inline: true });

    const valid = Array.isArray(fields) ? fields.filter(f => f?.name && f?.value).map(f => ({
      name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline
    })) : [];
    if (valid.length) embed.addFields(valid.slice(0, 25));

    embed.setFooter({ text: `VIOLATE MANAGER • ${String(type).toUpperCase()} LOG` });

    await logChannel.send({ embeds: [embed], files: Array.isArray(files) ? files : [] });
    return true;
  } catch (error) {
    console.error(`❌ ${type} log failed:`, error.message);
    return false;
  }
}

async function sendDM({ guild, target, action, reason, moderator, duration }) {
  try {
    const user = target?.user || target;
    if (!user?.send) return false;
    const m = personInfo(moderator);
    const lines = [
      `**Server:** ${guild?.name || "Unknown Server"}`,
      `**Action:** ${action || "Moderation Action"}`,
      `**Reason:** ${reason || "No reason"}`,
      `**Moderator:** ${m ? `${m.tag} (${m.id})` : "Unknown"}`
    ];
    if (duration) lines.push(`**Duration:** ${duration}`);
    await user.send("## 🚨 Moderation Notice\n\n" + lines.join("\n"));
    return true;
  } catch { return false; }
}

async function sendAutoModLog(data) { return sendLog({ ...data, type: "mod", title: data.title || "🛡️ AutoMod Action", color: 0xED4245 }); }
async function sendRolePingLog(data) { return sendLog({ ...data, type: "rolePing", title: data.title || "🚨 Unauthorized Role Ping", color: 0xFEE75C }); }

module.exports = { getLogsConfig, getLogChannel, sendLog, sendDM, sendAutoModLog, sendRolePingLog };
