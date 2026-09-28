const { EmbedBuilder } = require('discord.js');
const config = require('../utils/welcomeConfig');

function render(text, member) {
  return String(text || '')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', String(member.guild.memberCount))
    .replaceAll('{userId}', member.id)
    .replaceAll('{serverId}', member.guild.id);
}

async function sendWelcome(member) {
  const c = config.get(member.guild.id);
  if (!c.enabled || !c.channelId) return;
  const channel = member.guild.channels.cache.get(c.channelId);
  if (!channel?.isTextBased()) return;

  const text = render(c.message, member);
  const payload = {};
  if (c.embed) {
    const embed = new EmbedBuilder().setDescription(text).setColor(c.embedColor || '#5865F2');
    if (c.image) embed.setImage(c.image);
    payload.embeds = [embed];
  } else payload.content = text;

  await channel.send(payload).catch(error => console.error('❌ Welcome send error:', error.message));

  if (c.dmEnabled && c.dmMessage) {
    await member.send({ content: render(c.dmMessage, member) }).catch(() => {});
  }
}

async function sendLeave(member) {
  const c = config.get(member.guild.id);
  if (!c.leaveEnabled || !c.leaveChannelId) return;
  const channel = member.guild.channels.cache.get(c.leaveChannelId);
  if (!channel?.isTextBased()) return;
  await channel.send({ content: render(c.leaveMessage, member) }).catch(() => {});
}

module.exports = { sendWelcome, sendLeave };
