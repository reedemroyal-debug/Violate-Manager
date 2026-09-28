const { AuditLogEvent } = require('discord.js');

async function findRecent(guild, type, targetId = null, predicate = null, maxAge = 15000) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 10 });
    const now = Date.now();
    const entry = logs.entries.find(e => {
      if (now - e.createdTimestamp > maxAge) return false;
      if (targetId && e.target?.id && e.target.id !== targetId) return false;
      if (predicate && !predicate(e)) return false;
      return true;
    });
    return entry || null;
  } catch (error) {
    console.log(`⚠️ Audit lookup failed: ${error.message}`);
    return null;
  }
}

async function findRecentAny(guild, types, targetId = null, predicate = null, maxAge = 15000) {
  for (const type of types) {
    const entry = await findRecent(guild, type, targetId, predicate, maxAge);
    if (entry) return entry;
  }
  return null;
}

function executor(entry) {
  return entry?.executor || null;
}

module.exports = { AuditLogEvent, findRecent, findRecentAny, executor };
