const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const FILE = path.join(__dirname, 'inviteTracker.json');
const cache = new Map();

function loadAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}
function saveAll(data) { fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); }
function guildData(guildId) {
  const all = loadAll();
  if (!all[guildId]) all[guildId] = { enabled: true, logChannelId: null, users: {} };
  return all[guildId];
}
function saveGuild(guildId, data) {
  const all = loadAll();
  all[guildId] = data;
  saveAll(all);
}

async function snapshotGuild(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    for (const invite of invites.values()) map.set(invite.code, invite.uses || 0);
    cache.set(guild.id, map);
    return map;
  } catch (error) {
    console.error(`❌ Invite snapshot failed for ${guild.name}:`, error.message);
    return null;
  }
}

async function init(client) {
  for (const guild of client.guilds.cache.values()) await snapshotGuild(guild);
  console.log('📨 Invite tracker initialized.');
}

function ensureUser(data, userId) {
  if (!data.users[userId]) data.users[userId] = { joins: 0, leaves: 0, added: 0, removed: 0, joinedMembers: [] };
  data.users[userId].joinedMembers ||= [];
  return data.users[userId];
}

async function handleJoin(member) {
  const data = guildData(member.guild.id);
  if (!data.enabled) return;

  let used = null;
  try {
    const before = cache.get(member.guild.id) || new Map();
    const invites = await member.guild.invites.fetch();
    for (const invite of invites.values()) {
      const oldUses = before.get(invite.code) || 0;
      if ((invite.uses || 0) > oldUses) {
        used = invite;
        break;
      }
    }
    const next = new Map();
    for (const invite of invites.values()) next.set(invite.code, invite.uses || 0);
    cache.set(member.guild.id, next);
  } catch (error) {
    console.error(`❌ Invite join lookup failed in ${member.guild.name}:`, error.message);
  }

  if (!used || !used.inviter) return;

  const stats = ensureUser(data, used.inviter.id);
  stats.joins++;
  stats.joinedMembers.push(member.id);
  saveGuild(member.guild.id, data);

  if (data.logChannelId) {
    const channel = member.guild.channels.cache.get(data.logChannelId);
    if (channel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('📨 Invite Used')
        .setDescription(`${member} joined using an invite from ${used.inviter}.`)
        .addFields(
          { name: 'Inviter', value: `<@${used.inviter.id}>`, inline: true },
          { name: 'Invite', value: `\`${used.code}\``, inline: true },
          { name: 'Inviter Joins', value: String(stats.joins), inline: true }
        )
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

async function handleLeave(member) {
  const data = guildData(member.guild.id);
  if (!data.enabled) return;

  let inviterId = null;
  for (const [userId, stats] of Object.entries(data.users)) {
    if (stats.joinedMembers?.includes(member.id)) {
      inviterId = userId;
      stats.joinedMembers = stats.joinedMembers.filter(id => id !== member.id);
      break;
    }
  }

  if (!inviterId) return;
  const stats = ensureUser(data, inviterId);
  stats.leaves++;
  saveGuild(member.guild.id, data);
}

function getStats(guildId, userId) {
  const data = guildData(guildId);
  return data.users[userId] || { joins: 0, leaves: 0, added: 0, removed: 0 };
}

function getLeaderboard(guildId) {
  const data = guildData(guildId);
  return Object.entries(data.users)
    .map(([userId, stats]) => ({ userId, ...stats, real: Math.max(0, (stats.joins || 0) - (stats.leaves || 0)) }))
    .sort((a, b) => b.joins - a.joins);
}

function change(guildId, userId, amount) {
  const data = guildData(guildId);
  const stats = ensureUser(data, userId);
  stats.added = (stats.added || 0) + amount;
  stats.joins = Math.max(0, (stats.joins || 0) + amount);
  saveGuild(guildId, data);
  return stats;
}

function reset(guildId, userId) {
  const data = guildData(guildId);
  data.users[userId] = { joins: 0, leaves: 0, added: 0, removed: 0, joinedMembers: [] };
  saveGuild(guildId, data);
}

async function setLogChannel(guildId, channelId) {
  const data = guildData(guildId);
  data.logChannelId = channelId;
  saveGuild(guildId, data);
}

module.exports = {
  init,
  handleJoin,
  handleLeave,
  snapshotGuild,
  getStats,
  getLeaderboard,
  change,
  reset,
  setLogChannel
};
