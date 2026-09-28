const { AuditLogEvent } = require("discord.js");
const { sendLog } = require("../utils/modLogger");
const { findRecent } = require("../utils/auditResolver");

async function init(client) {
  client.on("channelCreate", async channel => {
    if (!channel.guild) return;
    const e = await findRecent(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    await sendLog({ guild: channel.guild, type: "channel", title: "📁 Channel Created", action: "Channel created", moderator: e?.executor, channel,
      fields: [{ name: "Type", value: String(channel.type), inline: true }, { name: "Channel ID", value: `\`${channel.id}\``, inline: true }], color: 0x57F287 });
  });

  client.on("channelDelete", async channel => {
    if (!channel.guild) return;
    const e = await findRecent(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    await sendLog({ guild: channel.guild, type: "channel", title: "🗑️ Channel Deleted", action: "Channel deleted", moderator: e?.executor, channelId: channel.id,
      fields: [{ name: "Channel", value: `#${channel.name || "unknown"}`, inline: true }, { name: "Channel ID", value: `\`${channel.id}\``, inline: true }, { name: "Type", value: String(channel.type), inline: true }], color: 0xED4245 });
  });

  client.on("channelUpdate", async (oldChannel, newChannel) => {
    if (!newChannel.guild) return;
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`Name: **${oldChannel.name}** → **${newChannel.name}**`);
    if (oldChannel.topic !== newChannel.topic) changes.push("Topic changed");
    if (oldChannel.parentId !== newChannel.parentId) changes.push(`Category: \`${oldChannel.parentId || "None"}\` → \`${newChannel.parentId || "None"}\``);
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`Slowmode: **${oldChannel.rateLimitPerUser || 0}s** → **${newChannel.rateLimitPerUser || 0}s**`);
    const oldOw = oldChannel.permissionOverwrites?.cache; const newOw = newChannel.permissionOverwrites?.cache;
    if (oldOw && newOw) {
      for (const [id, ow] of newOw) {
        const prev = oldOw.get(id);
        if (!prev) changes.push(`➕ Permission overwrite added: \`${id}\``);
        else if (prev.allow.bitfield !== ow.allow.bitfield || prev.deny.bitfield !== ow.deny.bitfield) changes.push(`🔐 Permission overwrite updated: \`${id}\``);
      }
      for (const [id] of oldOw) if (!newOw.has(id)) changes.push(`➖ Permission overwrite removed: \`${id}\``);
    }
    if (!changes.length) return;
    const e = await findRecent(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    await sendLog({ guild: newChannel.guild, type: "channel", title: "🔐 Channel Updated", action: "Channel / permissions updated", moderator: e?.executor, channel: newChannel,
      fields: [{ name: "Changes", value: changes.join("\n").slice(0, 1024), inline: false }], color: 0xFEE75C });
  });
  console.log("📁 Channel Logs initialized");
}
module.exports = { init };
