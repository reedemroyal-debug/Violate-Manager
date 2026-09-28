const { AuditLogEvent } = require("discord.js");
const { sendLog } = require("../utils/modLogger");
const { findRecentAny } = require("../utils/auditResolver");

async function init(client) {
  client.on("guildMemberAdd", async member => {
    if (member.user.bot) return;
    await sendLog({ guild: member.guild, type: "member", title: "📥 Member Joined", action: "Member joined", target: member.user,
      description: `<@${member.id}> joined the server.`, fields: [{ name: "Member ID", value: `\`${member.id}\``, inline: true }], color: 0x57F287 });
  });

  client.on("guildMemberRemove", async member => {
    const e = await findRecentAny(member.guild, [AuditLogEvent.MemberKick, AuditLogEvent.MemberBanAdd], member.id, null, 15000);
    const action = e?.action === AuditLogEvent.MemberKick ? "Member kicked" : e ? "Member removed / banned" : "Member left";
    await sendLog({ guild: member.guild, type: "member", title: e ? "👋 Member Removed" : "👋 Member Left", action, target: member.user, moderator: e?.executor,
      description: `<@${member.id}> left/was removed from the server.`, fields: [{ name: "Member ID", value: `\`${member.id}\``, inline: true }], color: e ? 0xED4245 : 0xFFAA00 });
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const changes = [];
    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (added.size) changes.push(`➕ Roles added: ${added.map(r => `<@&${r.id}> (\`${r.id}\`)`).join(", ")}`);
    if (removed.size) changes.push(`➖ Roles removed: ${removed.map(r => `<@&${r.id}> (\`${r.id}\`)`).join(", ")}`);
    if (oldMember.nickname !== newMember.nickname) changes.push(`🏷️ Nickname: **${oldMember.nickname || "None"}** → **${newMember.nickname || "None"}**`);
    if (!changes.length) return;
    const e = await findRecentAny(newMember.guild, [AuditLogEvent.MemberRoleUpdate, AuditLogEvent.MemberUpdate], newMember.id, null, 15000);
    await sendLog({ guild: newMember.guild, type: "member", title: "🔄 Member Updated", action: "Member roles/profile updated", target: newMember.user, moderator: e?.executor,
      description: `<@${newMember.id}> member information changed.`, fields: [{ name: "Changes", value: changes.join("\n").slice(0, 1024), inline: false }, { name: "Member ID", value: `\`${newMember.id}\``, inline: true }], color: 0x5865F2 });
  });
  console.log("👤 Member Logs initialized");
}
module.exports = { init };
