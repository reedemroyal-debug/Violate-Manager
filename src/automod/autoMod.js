const {
  PermissionFlagsBits
} = require("discord.js");

const {
  getConfig,
  getPunishment
} = require("./config");

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

const spam = new Map();

// =====================================
// BYPASS
// =====================================

function isBypass(message, config) {
  const member = message.member;

  if (!member) return true;

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
      PermissionFlagsBits.ManageMessages
    )
  ) {
    return true;
  }

  const bypassRoles =
    config.bypass?.roles || [];

  return member.roles.cache.some(role =>
    bypassRoles.includes(role.id)
  );
}

// =====================================
// DETECTION
// =====================================

function hasLink(content) {
  return /(https?:\/\/|www\.)\S+/i.test(
    String(content || "")
  );
}

function hasInvite(content) {
  return /(discord\.gg\/|discord(?:app)?\.com\/invite\/)\S+/i.test(
    String(content || "")
  );
}

function hasBadWord(content, words) {
  if (!Array.isArray(words)) {
    return false;
  }

  const text =
    String(content || "").toLowerCase();

  return words.some(word => {
    const blocked =
      String(word || "")
        .trim()
        .toLowerCase();

    if (!blocked) {
      return false;
    }

    return text.includes(blocked);
  });
}

// =====================================
// VIOLATIONS
// =====================================

function addViolation(
  guildId,
  userId,
  reason
) {
  const db = load();

  db.automodViolations ??= {};
  db.automodViolations[guildId] ??= {};
  db.automodViolations[guildId][userId] ??= [];

  db.automodViolations[guildId][userId].push({
    reason,
    time: Date.now()
  });

  const cutoff =
    Date.now() - 24 * 60 * 60 * 1000;

  db.automodViolations[guildId][userId] =
    db.automodViolations[guildId][userId]
      .filter(item =>
        item.time >= cutoff
      );

  save(db);

  return db.automodViolations[guildId][userId]
    .length;
}

// =====================================
// WARN
// =====================================

async function addWarning(
  message,
  reason
) {
  try {
    const db = load();

    db.warnings ??= {};
    db.warnings[message.author.id] ??= [];

    db.warnings[message.author.id].push({
      guild: message.guild.id,
      by: message.client.user.id,
      reason: `AutoMod: ${reason}`,
      time: Date.now()
    });

    save(db);

    return true;
  } catch (error) {
    console.error(
      "❌ AutoMod warning failed:",
      error.message
    );

    return false;
  }
}

// =====================================
// PUNISHMENT NAME
// =====================================

function getPunishmentName(action) {
  switch (String(action).toLowerCase()) {
    case "timeout":
      return "Timeout";

    case "kick":
      return "Kick";

    case "ban":
      return "Ban";

    case "delete":
      return "Delete";

    case "warn":
    default:
      return "Warn";
  }
}

// =====================================
// RESOLVE PUNISHMENT
// =====================================

function resolveAction(punishment) {
  if (!punishment) {
    return "warn";
  }

  const selected =
    String(
      punishment.action ||
      punishment.type ||
      ""
    ).toLowerCase();

  if (
    ["warn", "timeout", "kick", "ban"].includes(
      selected
    )
  ) {
    return selected;
  }

  // Backward compatibility
  if (punishment.ban) {
    return "ban";
  }

  if (punishment.kick) {
    return "kick";
  }

  if (punishment.timeout) {
    return "timeout";
  }

  if (punishment.warn) {
    return "warn";
  }

  return "warn";
}

// =====================================
// EXECUTE PUNISHMENT
// =====================================

async function executePunishment(
  message,
  rule,
  reason,
  violations
) {
  const config =
    getConfig(message.guild.id);

  const punishmentConfig =
    getPunishment(
      config,
      rule
    );

  if (!punishmentConfig) {
    console.error(
      `❌ No punishment config for rule: ${rule}`
    );

    return {
      punishment: "warn",
      success: false,
      violations
    };
  }

  const configuredAction =
    resolveAction(
      punishmentConfig
    );

  const threshold =
    Math.max(
      1,
      Number(
        punishmentConfig.violations
      ) || 1
    );

  /*
   * IMPORTANT:
   *
   * If action = timeout/kick/ban,
   * that action is NOT executed until
   * the configured violation threshold
   * is reached.
   *
   * Before threshold:
   *   delete message
   *   optional warning
   *
   * Example:
   * violations = 3
   * punishment.violations = 3
   *
   * 1st = warn
   * 2nd = warn
   * 3rd = timeout/kick/ban
   */

  let action =
    configuredAction;

  const escalationReached =
    violations >= threshold;

  if (
    configuredAction !== "warn" &&
    !escalationReached
  ) {
    action = "warn";
  }

  // ===================================
  // DELETE MESSAGE
  // ===================================

  let deleted = false;

  if (
    punishmentConfig.deleteMessage
  ) {
    try {
      await message.delete();
      deleted = true;
    } catch (error) {
      console.error(
        "❌ AutoMod message delete failed:",
        error.message
      );
    }
  }

  // ===================================
  // WARNING
  // ===================================

  let warned = false;

  /*
   * Warn when:
   * - configured action is warn
   * - escalation has not yet been reached
   * - explicit warn is enabled
   */

  const shouldWarn =
    action === "warn" ||
    (
      punishmentConfig.warn === true &&
      !escalationReached
    );

  if (shouldWarn) {
    warned =
      await addWarning(
        message,
        reason
      );
  }

  // ===================================
  // TARGET MEMBER
  // ===================================

  const member =
    message.member ||
    await message.guild.members
      .fetch(message.author.id)
      .catch(() => null);

  let success = false;
  let resultReason = "Completed";

  // ===================================
  // WARN
  // ===================================

  if (action === "warn") {
    success = warned;
  }

  // ===================================
  // TIMEOUT
  // ===================================

  else if (action === "timeout") {
    if (!member) {
      resultReason =
        "Member not found.";
    }

    else if (!member.moderatable) {
      resultReason =
        "Bot cannot timeout this member due to permissions or role hierarchy.";
    }

    else {
      const minutes =
        Math.max(
          1,
          Number(
            punishmentConfig.timeoutMinutes
          ) || 5
        );

      try {
        await member.timeout(
          minutes * 60 * 1000,
          `AutoMod: ${reason}`
        );

        success = true;
      } catch (error) {
        resultReason =
          error.message;

        console.error(
          "❌ AutoMod timeout failed:",
          error.message
        );
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
    }

    else if (!member.kickable) {
      resultReason =
        "Bot cannot kick this member due to permissions or role hierarchy.";
    }

    else {
      try {
        await member.kick(
          `AutoMod: ${reason}`
        );

        success = true;
      } catch (error) {
        resultReason =
          error.message;

        console.error(
          "❌ AutoMod kick failed:",
          error.message
        );
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
    }

    else if (!member.bannable) {
      resultReason =
        "Bot cannot ban this member due to permissions or role hierarchy.";
    }

    else {
      try {
        await member.ban({
          reason:
            `AutoMod: ${reason}`
        });

        success = true;
      } catch (error) {
        resultReason =
          error.message;

        console.error(
          "❌ AutoMod ban failed:",
          error.message
        );
      }
    }
  }

  // ===================================
  // DM USER
  // ===================================

  let dmSent = false;

  try {
    dmSent =
      await sendDM({
        guild:
          message.guild,

        target:
          message.author,

        action:
          getPunishmentName(action),

        reason,

        moderator:
          message.client.user,

        duration:
          action === "timeout"
            ? `${Math.max(
                1,
                Number(
                  punishmentConfig.timeoutMinutes
                ) || 5
              )} minutes`
            : undefined
      });
  } catch (error) {
    console.error(
      "❌ AutoMod DM failed:",
      error.message
    );
  }

  // ===================================
  // LOG
  // ===================================

  try {
    await sendLog({
      guild:
        message.guild,

      type:
        "mod",

      title:
        "🛡️ AutoMod Action",

      action:
        getPunishmentName(action),

      target:
        message.author,

      moderator:
        message.client.user,

      reason:
        `${reason} | Rule: ${rule} | Violations: ${violations}/${threshold}`,

      duration:
        action === "timeout"
          ? `${Math.max(
              1,
              Number(
                punishmentConfig.timeoutMinutes
              ) || 5
            )} minutes`
          : undefined
    });
  } catch (error) {
    console.error(
      "❌ AutoMod log failed:",
      error.message
    );
  }

  // ===================================
  // CHANNEL NOTICE
  // ===================================

  if (
    action === "warn" ||
    action === "timeout"
  ) {
    try {
      const warning =
        await message.channel
          .send({
            content:
              action === "timeout"
                ? `🚫 ${message.author}, your message was removed.\n**Reason:** ${reason}\n⏱️ You have been timed out.`
                : `⚠️ ${message.author}, your message was removed.\n**Reason:** ${reason}\n⚠️ You have received a warning.`
          })
          .catch(() => null);

      if (warning) {
        setTimeout(
          () =>
            warning
              .delete()
              .catch(() => {}),
          7000
        );
      }
    } catch {}
  }

  return {
    punishment: action,
    configuredPunishment:
      configuredAction,
    success,
    deleted,
    warned,
    dmSent,
    resultReason,
    violations,
    threshold,
    escalationReached
  };
}

// =====================================
// SPAM CHECK
// =====================================

function checkSpam(
  message,
  config
) {
  const key =
    `${message.guild.id}:${message.author.id}`;

  const now =
    Date.now();

  const interval =
    Math.max(
      1000,
      Number(
        config.antiSpam?.interval
      ) || 5000
    );

  const maxMessages =
    Math.max(
      1,
      Number(
        config.antiSpam?.maxMessages
      ) || 5
    );

  const list =
    spam.get(key) || [];

  list.push(now);

  const filtered =
    list.filter(
      time =>
        now - time <= interval
    );

  spam.set(
    key,
    filtered
  );

  if (filtered.length > 50) {
    spam.set(
      key,
      filtered.slice(-50)
    );
  }

  return (
    filtered.length >=
    maxMessages
  );
}

// =====================================
// HANDLE AUTOMOD
// =====================================

async function handle(message) {
  try {
    // ---------------------------------
    // IGNORE DMS
    // ---------------------------------

    if (!message.guild) {
      return;
    }

    // ---------------------------------
    // IGNORE BOTS
    // ---------------------------------

    if (message.author.bot) {
      return;
    }

    // ---------------------------------
    // CONFIG
    // ---------------------------------

    const config =
      getConfig(
        message.guild.id
      );

    // ---------------------------------
    // GLOBAL DISABLE
    // ---------------------------------

    if (!config.enabled) {
      return;
    }

    // ---------------------------------
    // BYPASS
    // ---------------------------------

    if (
      isBypass(
        message,
        config
      )
    ) {
      return;
    }

    const content =
      message.content || "";

    // =================================
    // ANTI INVITE
    // =================================

    if (
      config.antiInvite?.enabled &&
      hasInvite(content)
    ) {
      const violations =
        addViolation(
          message.guild.id,
          message.author.id,
          "Discord invite detected"
        );

      return executePunishment(
        message,
        "antiInvite",
        "Discord invite detected",
        violations
      );
    }

    // =================================
    // ANTI LINK
    // =================================

    if (
      config.antiLink?.enabled &&
      hasLink(content)
    ) {
      const violations =
        addViolation(
          message.guild.id,
          message.author.id,
          "Link detected"
        );

      return executePunishment(
        message,
        "antiLink",
        "Link detected",
        violations
      );
    }

    // =================================
    // BAD WORD FILTER
    // =================================

    if (
      config.wordFilter?.enabled &&
      hasBadWord(
        content,
        config.wordFilter.words
      )
    ) {
      const violations =
        addViolation(
          message.guild.id,
          message.author.id,
          "Blocked word detected"
        );

      return executePunishment(
        message,
        "wordFilter",
        "Blocked word detected",
        violations
      );
    }

    // =================================
    // ANTI MENTION
    // =================================

    if (
      config.antiMention?.enabled
    ) {
      const totalMentions =
        message.mentions.users.size +
        message.mentions.roles.size;

      const maxMentions =
        Math.max(
          0,
          Number(
            config.antiMention.maxMentions
          ) || 5
        );

      if (
        totalMentions >
        maxMentions
      ) {
        const violations =
          addViolation(
            message.guild.id,
            message.author.id,
            "Too many mentions"
          );

        return executePunishment(
          message,
          "antiMention",
          "Too many mentions",
          violations
        );
      }
    }

    // =================================
    // ANTI SPAM
    // =================================

    if (
      config.antiSpam?.enabled &&
      checkSpam(
        message,
        config
      )
    ) {
      const violations =
        addViolation(
          message.guild.id,
          message.author.id,
          "Spam detected"
        );

      return executePunishment(
        message,
        "antiSpam",
        "Spam detected",
        violations
      );
    }
  } catch (error) {
    console.error(
      "❌ AutoMod System Error:",
      error
    );
  }
}

// =====================================
// CLEAN SPAM CACHE
// =====================================

setInterval(
  () => {
    const now =
      Date.now();

    for (
      const [
        key,
        timestamps
      ] of spam.entries()
    ) {
      const filtered =
        timestamps.filter(
          time =>
            now - time < 60000
        );

      if (!filtered.length) {
        spam.delete(key);
      } else {
        spam.set(
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
  checkSpam,
  hasLink,
  hasInvite,
  hasBadWord,
  isBypass,
  addViolation,
  executePunishment,
  addWarning,
  getPunishmentName
};
