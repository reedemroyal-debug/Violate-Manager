const {
  AuditLogEvent,
  PermissionFlagsBits
} = require("discord.js");

const { getConfig } = require("../automod/config");
const { sendLog, sendDM } = require("../utils/modLogger");

const actionCache = new Map();
const initializedClients = new WeakSet();

const WINDOW = 10000;

function getGuildConfig(guild) {
  const config = getConfig(guild.id);

  config.antiNuke ??= {};
  const n = config.antiNuke;

  n.enabled ??= true;
  n.trustedUsers ??= [];
  n.trustedRoles ??= [];

  n.channelDelete ??= {
    enabled: true,
    maxActions: 3,
    interval: 10000
  };

  n.channelCreate ??= {
    enabled: true,
    maxActions: 5,
    interval: 10000
  };

  n.roleDelete ??= {
    enabled: true,
    maxActions: 3,
    interval: 10000
  };

  n.roleCreate ??= {
    enabled: true,
    maxActions: 5,
    interval: 10000
  };

  n.ban ??= {
    enabled: true,
    maxActions: 3,
    interval: 10000
  };

  n.kick ??= {
    enabled: true,
    maxActions: 5,
    interval: 10000
  };

  n.webhookCreate ??= {
    enabled: true,
    maxActions: 3,
    interval: 10000
  };

  n.punishment ??= {
    timeout: true,
    timeoutMinutes: 30,
    kick: false,
    ban: true
  };

  return n;
}

function isTrusted(member, config) {
  if (!member) return false;

  if (
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return true;
  }

  if (config.trustedUsers?.includes(member.id)) {
    return true;
  }

  return member.roles.cache.some(role =>
    config.trustedRoles?.includes(role.id)
  );
}

function recordAction(guildId, userId, type, limit, interval = WINDOW) {
  const key = `${guildId}:${userId}:${type}`;
  const now = Date.now();

  const list = actionCache.get(key) || [];

  list.push(now);

  const filtered = list.filter(
    time => now - time <= interval
  );

  actionCache.set(key, filtered);

  return {
    count: filtered.length,
    triggered: filtered.length >= limit
  };
}

function clearUser(guildId, userId) {
  for (const key of actionCache.keys()) {
    if (key.startsWith(`${guildId}:${userId}:`)) {
      actionCache.delete(key);
    }
  }
}

async function getExecutor(guild, auditType, targetId = null) {
  try {
    const logs = await guild.fetchAuditLogs({
      type: auditType,
      limit: 10
    });

    const now = Date.now();

    const entry = logs.entries.find(entry => {
      if (now - entry.createdTimestamp > 15000) {
        return false;
      }

      if (targetId && entry.target?.id !== targetId) {
        return false;
      }

      return true;
    });

    return entry?.executor || null;
  } catch (error) {
    console.error(
      "❌ AntiNuke audit log error:",
      error.message
    );

    return null;
  }
}

async function punish(guild, executor, reason) {
  if (!executor || executor.bot) {
    return false;
  }

  const config = getGuildConfig(guild);

  let member =
    guild.members.cache.get(executor.id) ||
    await guild.members.fetch(executor.id).catch(() => null);

  if (!member) {
    return false;
  }

  if (isTrusted(member, config)) {
    return false;
  }

  let punished = false;

  // Remove dangerous roles first
  try {
    if (member.manageable) {
      const removableRoles = member.roles.cache.filter(role =>
        role.editable &&
        (
          role.permissions.has(PermissionFlagsBits.Administrator) ||
          role.permissions.has(PermissionFlagsBits.ManageGuild) ||
          role.permissions.has(PermissionFlagsBits.ManageChannels) ||
          role.permissions.has(PermissionFlagsBits.ManageRoles) ||
          role.permissions.has(PermissionFlagsBits.BanMembers) ||
          role.permissions.has(PermissionFlagsBits.KickMembers)
        )
      );

      for (const role of removableRoles.values()) {
        await member.roles.remove(role).catch(() => {});
      }
    }
  } catch {}

  // Timeout first
  try {
    if (member.moderatable) {
      await member.timeout(
        60 * 60 * 1000,
        `AntiNuke: ${reason}`
      );

      punished = true;
    }
  } catch (error) {
    console.error(
      "❌ AntiNuke timeout failed:",
      error.message
    );
  }

  // Ban if possible
  try {
    if (member.bannable) {
      await member.ban({
        reason: `AntiNuke: ${reason}`
      });

      punished = true;
    }
  } catch (error) {
    console.error(
      "❌ AntiNuke ban failed:",
      error.message
    );
  }

  try {
    await sendDM({
      guild,
      target: executor,
      action: "Ban",
      reason: `AntiNuke: ${reason}`,
      moderator: guild.client.user
    });
  } catch {}

  try {
    await sendLog({
      guild,
      type: "security",
      title: "🚨 AntiNuke Triggered",
      action: "BAN",
      target: executor,
      moderator: guild.client.user,
      reason
    });
  } catch {}

  return punished;
}

async function detect(guild, executor, type, limit, reason) {
  if (!executor) return;

  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  if (executor.bot) return;

  const member =
    guild.members.cache.get(executor.id) ||
    await guild.members.fetch(executor.id).catch(() => null);

  if (!member || isTrusted(member, config)) {
    return;
  }

  const result = recordAction(
    guild.id,
    executor.id,
    type,
    limit
  );

  if (!result.triggered) {
    return;
  }

  await punish(
    guild,
    executor,
    `${reason} (${result.count} actions in ${WINDOW / 1000}s)`
  );

  clearUser(guild.id, executor.id);
}

async function channelDelete(channel) {
  const guild = channel.guild;
  if (!guild) return;

  const config = getGuildConfig(guild);
  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.ChannelDelete,
    channel.id
  );

  await detect(
    guild,
    executor,
    "channelDelete",
    config.channelDelete?.maxActions || 3,
    "Mass channel deletion detected"
  );
}

async function channelCreate(channel) {
  const guild = channel.guild;
  if (!guild) return;

  const config = getGuildConfig(guild);
  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.ChannelCreate,
    channel.id
  );

  await detect(
    guild,
    executor,
    "channelCreate",
    config.channelCreate?.maxActions || 5,
    "Mass channel creation detected"
  );
}

async function roleDelete(role) {
  const guild = role.guild;
  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.RoleDelete,
    role.id
  );

  await detect(
    guild,
    executor,
    "roleDelete",
    config.roleDelete?.maxActions || 3,
    "Mass role deletion detected"
  );
}

async function roleCreate(role) {
  const guild = role.guild;
  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.RoleCreate,
    role.id
  );

  await detect(
    guild,
    executor,
    "roleCreate",
    config.roleCreate?.maxActions || 5,
    "Mass role creation detected"
  );
}

async function guildBanAdd(ban) {
  const guild = ban.guild;
  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.MemberBanAdd,
    ban.user.id
  );

  await detect(
    guild,
    executor,
    "ban",
    config.ban?.maxActions || 3,
    "Mass ban detected"
  );
}

async function guildMemberRemove(member) {
  const guild = member.guild;
  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.MemberKick,
    member.id
  );

  await detect(
    guild,
    executor,
    "kick",
    config.kick?.maxActions || 5,
    "Mass kick detected"
  );
}

async function webhookUpdate(channel) {
  const guild = channel.guild;
  if (!guild) return;

  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.WebhookCreate
  );

  await detect(
    guild,
    executor,
    "webhookCreate",
    config.webhookCreate?.maxActions || 3,
    "Mass webhook creation detected"
  );
}

async function guildMemberAdd(member) {
  const guild = member.guild;

  if (!member.user.bot) {
    return;
  }

  const config = getGuildConfig(guild);

  if (!config.enabled) return;

  const executor = await getExecutor(
    guild,
    AuditLogEvent.BotAdd,
    member.id
  );

  if (!executor || executor.bot) {
    return;
  }

  const executorMember =
    guild.members.cache.get(executor.id) ||
    await guild.members.fetch(executor.id).catch(() => null);

  if (!executorMember || isTrusted(executorMember, config)) {
    return;
  }

  await member.kick(
    "AntiNuke: Unauthorized bot addition"
  ).catch(() => {});

  await punish(
    guild,
    executor,
    "Unauthorized bot was added to the server"
  );
}

function init(client) {
  if (!client || initializedClients.has(client)) {
    return;
  }

  initializedClients.add(client);

  client.on("channelDelete", channelDelete);
  client.on("channelCreate", channelCreate);
  client.on("roleDelete", roleDelete);
  client.on("roleCreate", roleCreate);
  client.on("guildBanAdd", guildBanAdd);
  client.on("guildMemberRemove", guildMemberRemove);
  client.on("webhookUpdate", webhookUpdate);
  client.on("guildMemberAdd", guildMemberAdd);

  console.log("🛡️ AntiNuke system initialized.");
}

setInterval(() => {
  const cutoff = Date.now() - 60000;

  for (const [key, timestamps] of actionCache.entries()) {
    const filtered = timestamps.filter(
      timestamp => timestamp > cutoff
    );

    if (filtered.length) {
      actionCache.set(key, filtered);
    } else {
      actionCache.delete(key);
    }
  }
}, 60000).unref();

module.exports = {
  init,
  punish,
  detect,
  getExecutor
};
