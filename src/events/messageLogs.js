const { AuditLogEvent } = require("discord.js");
const { sendLog } = require("../utils/modLogger");
const { findRecent } = require("../utils/auditResolver");

function transcript(name, lines) {
  return { attachment: Buffer.from(lines.join("\n"), "utf8"), name: `${name}.txt` };
}

async function deleteExecutor(guild, channelId, authorId) {
  const entry = await findRecent(guild, AuditLogEvent.MessageDelete, authorId, e => e.extra?.channel?.id === channelId, 15000);
  return entry?.executor || null;
}

async function init(client) {
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    await sendLog({
      guild: message.guild, type: "message", title: "📨 Message Sent", action: "Message sent",
      target: message.author, channel: message.channel, messageId: message.id,
      description: `<@${message.author.id}> sent a message.`,
      fields: [{ name: "💬 Content", value: message.content?.slice(0, 1024) || "*No text content*", inline: false }], color: 0x57F287
    });
  });

  client.on("messageUpdate", async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    const file = transcript(`edited-${newMessage.id}`, [
      `Guild: ${newMessage.guild.id}`, `Channel: ${newMessage.channelId}`, `Message: ${newMessage.id}`,
      `User: ${newMessage.author?.tag || "Unknown"} (${newMessage.author?.id || "Unknown"})`,
      "", "OLD MESSAGE:", oldMessage.content || "[unknown]", "", "EDITED MESSAGE:", newMessage.content || "[empty]"
    ]);
    await sendLog({
      guild: newMessage.guild, type: "message", title: "✏️ Message Edited", action: "Message edited",
      target: newMessage.author, channel: newMessage.channel, messageId: newMessage.id,
      description: `<@${newMessage.author?.id}> edited a message.`,
      fields: [
        { name: "Before", value: oldMessage.content?.slice(0, 1024) || "*Unknown*", inline: false },
        { name: "After", value: newMessage.content?.slice(0, 1024) || "*Empty*", inline: false }
      ], files: [file], color: 0xFEE75C
    });
  });

  client.on("messageDelete", async message => {
    if (!message.guild || message.author?.bot) return;
    const executor = await deleteExecutor(message.guild, message.channelId, message.author?.id);
    const file = transcript(`deleted-${message.id}`, [
      `Guild: ${message.guild.id}`, `Channel: ${message.channelId}`, `Message: ${message.id}`,
      `Author: ${message.author?.tag || "Unknown"} (${message.author?.id || "Unknown"})`,
      `Deleted By: ${executor?.tag || "Unknown / Discord"} (${executor?.id || "Unknown"})`, "",
      "DELETED MESSAGE:", message.content || "[content unavailable]"
    ]);
    await sendLog({
      guild: message.guild, type: "message", title: "🗑️ Message Deleted", action: "Message deleted",
      target: message.author, moderator: executor, channelId: message.channelId, messageId: message.id,
      description: `A message was deleted.`,
      fields: [{ name: "💬 Content", value: message.content?.slice(0, 1024) || "*Content unavailable*", inline: false }],
      files: [file], color: 0xED4245
    });
  });

  client.on("messageDeleteBulk", async messages => {
    if (!messages.size) return;
    const first = messages.first(); const guild = first?.guild;
    if (!guild) return;
    const lines = [`Guild: ${guild.id}`, `Channel: ${first.channelId}`, `Messages: ${messages.size}`, ""];
    let i = 0;
    for (const msg of messages.values()) lines.push(`--- ${++i} | ${msg.id} | ${msg.author?.tag || "Unknown"} (${msg.author?.id || "Unknown"}) ---`, msg.content || "[content unavailable]");
    await sendLog({
      guild, type: "message", title: "🧹 Bulk Messages Deleted", action: "Bulk message deletion",
      channelId: first.channelId, description: `**${messages.size}** messages were deleted.`,
      fields: [{ name: "Messages Deleted", value: String(messages.size), inline: true }],
      files: [transcript(`bulk-delete-${Date.now()}`, lines)], color: 0xED4245
    });
  });

  console.log("💬 Message Logs initialized");
}
module.exports = { init };
