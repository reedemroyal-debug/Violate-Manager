const { AuditLogEvent } = require("discord.js");
const { sendLog } = require("../utils/modLogger");
const { findRecentAny } = require("../utils/auditResolver");

async function init(client) {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const guild = member.guild;

    if (!oldState.channelId && newState.channelId) {
      return sendLog({ guild, type: "voice", title: "🔊 Voice Joined", action: "Joined voice channel", target: member.user, channelId: newState.channelId,
        description: `<@${member.id}> joined a voice channel.`, fields: [{ name: "🆔 Member ID", value: `\`${member.id}\``, inline: true }], color: 0x57F287 });
    }
    if (oldState.channelId && !newState.channelId) {
      const entry = await findRecentAny(guild, [AuditLogEvent.MemberDisconnect], member.id, null, 10000);
      return sendLog({ guild, type: "voice", title: entry ? "👢 Voice Kick / Disconnect" : "🚪 Voice Left", action: entry ? "Moderator disconnected member" : "Left voice channel", target: member.user, moderator: entry?.executor, channelId: oldState.channelId,
        description: `<@${member.id}> left/disconnected from a voice channel.`, color: entry ? 0xED4245 : 0xFFAA00 });
    }
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      return sendLog({ guild, type: "voice", title: "🔄 Voice Moved", action: "Moved voice channel", target: member.user, channelId: newState.channelId,
        description: `<@${member.id}> moved voice channels.`, fields: [{ name: "From", value: `<#${oldState.channelId}>\nID: \`${oldState.channelId}\``, inline: true }, { name: "To", value: `<#${newState.channelId}>\nID: \`${newState.channelId}\``, inline: true }], color: 0x5865F2 });
    }

    if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
      const entry = await findRecentAny(guild, [AuditLogEvent.MemberUpdate], member.id, null, 10000);
      const changes = [];
      if (oldState.serverMute !== newState.serverMute) changes.push(`Server mute: **${newState.serverMute ? "ON" : "OFF"}**`);
      if (oldState.serverDeaf !== newState.serverDeaf) changes.push(`Server deafen: **${newState.serverDeaf ? "ON" : "OFF"}**`);
      await sendLog({ guild, type: "voice", title: "🔇 Voice State Moderation", action: "Server mute/deafen changed", target: member.user, moderator: entry?.executor, channelId: newState.channelId || oldState.channelId,
        description: `<@${member.id}> voice moderation state changed.`, fields: [{ name: "Changes", value: changes.join("\n"), inline: false }], color: 0xFEE75C });
    }
  });
  console.log("🔊 Voice Logs initialized");
}
module.exports = { init };
