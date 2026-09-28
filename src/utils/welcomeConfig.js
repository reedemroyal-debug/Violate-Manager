const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'welcomeConfig.json');

const DEFAULT = {
  enabled: false,
  channelId: null,
  message: 'Welcome {user} to **{server}**! You are member #{memberCount}. 🎉',
  image: null,
  embed: true,
  embedColor: '#5865F2',
  leaveEnabled: false,
  leaveChannelId: null,
  leaveMessage: '👋 **{username}** has left **{server}**. We now have {memberCount} members.',
  dmEnabled: false,
  dmMessage: 'Welcome to **{server}**, {username}! 🎉',
};

function loadAll() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}

function saveAll(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function get(guildId) {
  const all = loadAll();
  return { ...DEFAULT, ...(all[guildId] || {}) };
}

function update(guildId, patch) {
  const all = loadAll();
  all[guildId] = { ...DEFAULT, ...(all[guildId] || {}), ...patch };
  saveAll(all);
  return all[guildId];
}

module.exports = { DEFAULT, loadAll, saveAll, get, update };
