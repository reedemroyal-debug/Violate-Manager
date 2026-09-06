const {
  AuditLogEvent,
  PermissionFlagsBits
} = require("discord.js");

const {
  getConfig,
  getPunishment
} = require("../automod/config");

const {
  load,
  save
} = require("../utils/db");

const {
  sendLog,
  sendDM
} = require("../utils/modLogger");

// =====================================
// MEMORY
// =====================================

const actionCache = new Map();

// =====================================
// ACTION TYPES
// =====================================

const ACTIONS = {
  channelDelete: AuditLogEvent.ChannelDelete,
  channelCreate: AuditLogEvent.ChannelCreate,
  roleDelete: AuditLogEvent.RoleDelete,
  roleCreate: AuditLogEvent.RoleCreate,
  ban: AuditLogEvent.MemberBanAdd,
  kick: AuditLogEvent.MemberKick,
  webhookCreate: AuditLogEvent.WebhookCreate
};

// =====================================
// BYPASS
// =====================================

function isBypass(member, config) {
  if (!member) {
    return false;
  }

  if (
    config.bypass?.administrators &&
    member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  if (
    config.bypass?.moderators &&
    member.permissions.has(
      PermissionFlagsBits.ManageGuild
    )
  ) {
    return true;
  }

  const roles =
    config.bypass?.roles || [];

  return member.roles.cache.some(
    role => roles.includes(role.id)
  );
}

// =====================================
// CACHE KEY
// =====================================

function getCacheKey(
  guildId,
  executorId,
  action
) {
  return `${guildId}:${executorId}:${action}`;
}

// =====================================
// RECORD ACTION
// =====================================

function recordAction(
  guildId,
  executorId,
  action,
  interval
) {
  const key =
    getCacheKey(
      guildId,
      executorId,
      action
    );

  const now =
    Date.now();

  const existing =
    actionCache.get(key) || [];

  const filtered =
    existing.filter(
      time =>
        now - time <= interval
    );

  filtered.push(now);

  actionCache.set(
    key,
    filtered
  );

  return filtered.length;
}

// =====================================
// VIOLATION STORAGE
// =====================================

function addViolation(
  guildId,
  userId,
  reason
) {
  const db =
    load();

  db.antiNukeViolations ??= {};
  db.antiNukeViolations[guildId] ??= {};
  db.antiNukeViolations[guildId][userId] ??= [];

  db.antiNukeViolations[guildId][userId].push({
    reason,
    time: Date.now()
  });

  const cutoff =
    Date.now() -
    24 * 60 * 60 * 1000;

  db.antiNukeViolations[guildId][userId] =
    db.antiNukeViolations[guildId][userId]
      .filter(
        item =>
          item.time >= cutoff
      );

  save(db);

  return db.antiNukeViolations[guildId][userId]
    .length;
}

// =====================================
// PUNISHMENT NAME
// =====================================

function punishmentName(action) {
  switch (action) {
    case "timeout":
      return "Timeout";

    case "kick":
      return "Kick";

    case "ban":
      return "Ban";

    case "warn":
    default:
      return "Warn";
  }
}

// =====================================
// EXECUTE PUNISHMENT
// =====================================

async function punish(
  guild,
  executor,
  reason,
  config,
  violations
) {
  const punishment =
    getPunishment(
      config,
      "antiNuke"
    ) || config.antiNuke?.punishment || {};

  let action =
    String(
      punishment.action ||
      punishment.type ||
      ""
    ).toLowerCase();

  if (!action) {
    if (punishment.ban) {
      action = "ban";
    } else if (punishment.kick) {
      action = "kick";
    } else if (punishment.timeout) {
      action = "timeout";
    } else {
      action = "warn";
    }
  }

  const required =
    Number(
      punishment.violations
    ) || 1;

  if (violations < required) {
    return {
      action: "warn",
      success: false,
      skipped: true
    };
  }

  let member =
    guild.members.cache.get(
      executor.id
    );

  if (!member) {
    member =
      await guild.members
        .fetch(executor.id)
        .catch(() => null);
  }

  let success = false;
  let resultReason = "Completed";

  // ===================================
  // WARN
  // ===================================

  if (action === "warn") {
    try {
      const db =
        load();

      db.warnings ??= {};
      db.warnings[executor.id] ??= [];

      db.warnings[executor.id].push({
        guild: guild.id,
        by: guild.client.user.id,
        reason: `AntiNuke: ${reason}`,
        time: Date.now()
      });

      save(db);

      success = true;
    } catch (error) {
      resultReason =
        error.message;
    }
  }

  // ===================================
  // TIMEOUT
  // ===================================

  else if (action === "timeout") {
    if (!member) {
      resultReason =
        "Member not found.";
    } else if (!member.moderatable) {
      resultReason =
        "Bot cannot timeout this member.";
    } else {
      const minutes =
        Number(
          punishment.timeoutMinutes
        ) || 30;

      try {
        await member.timeout(
          minutes * 60 * 1000,
          `AntiNuke: ${reason}`
        );

        success = true;
      } catch (error) {
        resultReason =
          error.message;
      }
    }
  }

  // ===================================
  // KICK
  // ===================================

  else if (action === "kick") {
    if (!member) {
      resultReason =
        "Member not found.";
    } else if (!member.kickable) {
      resultReason =
        "Bot cannot kick this member.";
    } else {
      try {
        await member.kick(
          `AntiNuke: ${reason}`
        );

        success = true;
      } catch (error) {
        resultReason =
          error.message;
      }
    }
  }

  // ===================================
  // BAN
  // ===================================

  else if (action === "ban") {
    if (!member) {
      resultReason =
        "Member not found.";
    } else if (!member.bannable) {
      resultReason =
        "Bot cannot ban this member.";
    } else {
      try {
        await member.ban({
          reason:
            `AntiNuke: ${reason}`
        });

        success = true;
      } catch (error) {
        resultReason =
          error.message;
      }
    }
  }

  // ===================================
  // DM
  // ===================================

  try {
    await sendDM({
      guild,
      target: executor,
      action: punishmentName(action),
      reason,
      moderator: guild.client.user,
      duration:
        action === "timeout"
          ? `${Number(
              punishment.timeoutMinutes
            ) || 30} minutes`
          : undefined
    });
  } catch {}

  // ===================================
  // LOG
  // ===================================

  try {
    await sendLog({
      guild,
      type: "mod",
      title: "🛡️ AntiNuke Action",
      action: punishmentName(action),
      target: executor,
      moderator: guild.client.user,
      reason:
        `${reason} | Violations: ${violations}`,
      duration:
        action === "timeout"
          ? `${Number(
              punishment.timeoutMinutes
            ) || 30} minutes`
          : undefined
    });
  } catch (error) {
    console.error(
      "❌ AntiNuke log failed:",
      error.message
    );
  }

  return {
    action,
    success,
    skipped: false,
    resultReason,
    violations
  };
}

// =====================================
// AUDIT LOG EXECUTOR
// =====================================

async function getExecutor(
  guild,
  auditType,
  targetId
) {
  try {
    const logs =
      await guild.fetchAuditLogs({
        type: auditType,
        limit: 10
      });

    const entry =
      logs.entries.find(
        item =>
          (!targetId ||
            item.target?.id === targetId) &&
          Date.now() -
            item.createdTimestamp <
            15000
      );

    return entry || null;
  } catch (error) {
    console.error(
      "❌ AntiNuke audit log error:",
      error.message
    );

    return null;
  }
}

// =====================================
// HANDLE ACTION
// =====================================

async function processAction(
  guild,
  action,
  targetId = null
) {
  const config =
    getConfig(guild.id);

  if (
    !config.antiNuke ||
    !config.antiNuke.enabled
  ) {
    return false;
  }

  const actionConfig =
    config.antiNuke[action];

  if (
    !actionConfig ||
    !actionConfig.enabled
  ) {
    return false;
  }

  const auditType =
    ACTIONS[action];

  if (!auditType) {
    return false;
  }

  const entry =
    await getExecutor(
      guild,
      auditType,
      targetId
    );

  if (!entry || !entry.executor) {
    return false;
  }

  const executor =
    entry.executor;

  if (
    executor.bot &&
    executor.id === guild.client.user.id
  ) {
    return false;
  }

  let member =
    guild.members.cache.get(
      executor.id
    );

  if (!member) {
    member =
      await guild.members
        .fetch(executor.id)
        .catch(() => null);
  }

  if (
    member &&
    isBypass(member, config)
  ) {
    return false;
  }

  const maxActions =
    Number(
      actionConfig.maxActions
    ) || 1;

  const interval =
    Number(
      actionConfig.interval
    ) || 10000;

  const count =
    recordAction(
      guild.id,
      executor.id,
      action,
      interval
    );

  if (count < maxActions) {
    return false;
  }

  const reason =
    getReason(action, count, maxActions);

  const violations =
    addViolation(
      guild.id,
      executor.id,
      reason
    );

  return punish(
    guild,
    executor,
    reason,
    config,
    violations
  );
}

// =====================================
// REASON
// =====================================

function getReason(
  action,
  count,
  max
) {
  const names = {
    channelDelete:
      "Too many channels deleted",

    channelCreate:
      "Too many channels created",

    roleDelete:
      "Too many roles deleted",

    roleCreate:
      "Too many roles created",

    ban:
      "Mass ban detected",

    kick:
      "Mass kick detected",

    webhookCreate:
      "Too many webhooks created"
  };

  return `${
    names[action] || "Suspicious server activity"
  } (${count}/${max} actions)`;
}

// =====================================
// EVENT HANDLER
// =====================================

async function handle(
  event
) {
  try {
    if (!event) {
      return false;
    }

    /*
     * Supported input:
     *
     * handle({
     *   guild,
     *   action,
     *   targetId
     * })
     */

    const guild =
      event.guild;

    if (!guild) {
      return false;
    }

    const action =
      event.action;

    if (!ACTIONS[action]) {
      return false;
    }

    return await processAction(
      guild,
      action,
      event.targetId || null
    );
  } catch (error) {
    console.error(
      "❌ AntiNuke System Error:",
      error
    );

    return false;
  }
}

// =====================================
// DIRECT AUDIT EVENT HANDLER
// =====================================

async function handleAuditLog(
  entry
) {
  try {
    const guild =
      entry.guild;

    if (!guild) {
      return false;
    }

    let action = null;

    switch (entry.action) {
      case AuditLogEvent.ChannelDelete:
        action = "channelDelete";
        break;

      case AuditLogEvent.ChannelCreate:
        action = "channelCreate";
        break;

      case AuditLogEvent.RoleDelete:
        action = "roleDelete";
        break;

      case AuditLogEvent.RoleCreate:
        action = "roleCreate";
        break;

      case AuditLogEvent.MemberBanAdd:
        action = "ban";
        break;

      case AuditLogEvent.MemberKick:
        action = "kick";
        break;

      case AuditLogEvent.WebhookCreate:
        action = "webhookCreate";
        break;

      default:
        return false;
    }

    return await processAction(
      guild,
      action,
      entry.target?.id || null
    );
  } catch (error) {
    console.error(
      "❌ AntiNuke Audit Handler Error:",
      error
    );

    return false;
  }
}

// =====================================
// CLEAN MEMORY
// =====================================

setInterval(
  () => {
    const now =
      Date.now();

    for (
      const [
        key,
        timestamps
      ] of actionCache.entries()
    ) {
      const filtered =
        timestamps.filter(
          time =>
            now - time <
            60000
        );

      if (!filtered.length) {
        actionCache.delete(key);
      } else {
        actionCache.set(
          key,
          filtered
        );
      }
    }
  },
  60000
).unref();

// =====================================
// EXPORT
// =====================================

module.exports = {
  handle,
  handleAuditLog,
  processAction,
  isBypass,
  addViolation,
  punish,
  getExecutor
};
