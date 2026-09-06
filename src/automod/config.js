const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "automod.json"
);

// =====================================
// DEFAULT PUNISHMENT
// =====================================

const DEFAULT_PUNISHMENT = {
  deleteMessage: true,
  warn: true,
  timeout: false,
  kick: false,
  ban: false,

  timeoutMinutes: 5,

  // Number of violations before
  // timeout/kick/ban can be applied
  violations: 3
};

// =====================================
// DEFAULT CONFIG
// =====================================

const DEFAULT = {
  enabled: true,

  // ===================================
  // ANTI SPAM
  // ===================================

  antiSpam: {
    enabled: true,

    maxMessages: 5,
    interval: 5000,

    punishment: {
      ...DEFAULT_PUNISHMENT
    }
  },

  // ===================================
  // ANTI LINK
  // ===================================

  antiLink: {
    enabled: false,

    punishment: {
      ...DEFAULT_PUNISHMENT,
      warn: true,
      timeout: false,
      kick: false,
      ban: false
    }
  },

  // ===================================
  // ANTI DISCORD INVITE
  // ===================================

  antiInvite: {
    enabled: true,

    punishment: {
      ...DEFAULT_PUNISHMENT,
      warn: true
    }
  },

  // ===================================
  // BAD WORD FILTER
  // ===================================

  wordFilter: {
    enabled: false,

    words: [],

    punishment: {
      ...DEFAULT_PUNISHMENT,
      warn: true
    }
  },

  // ===================================
  // ANTI MENTION
  // ===================================

  antiMention: {
    enabled: true,

    maxMentions: 5,

    punishment: {
      ...DEFAULT_PUNISHMENT,
    }
  },

  // ===================================
  // ANTI NUKE
  // ===================================

  antiNuke: {
    enabled: true,

    // Number of destructive actions
    // allowed during the time window

    channelDelete: {
      enabled: true,
      maxActions: 3,
      interval: 10000
    },

    channelCreate: {
      enabled: true,
      maxActions: 5,
      interval: 10000
    },

    roleDelete: {
      enabled: true,
      maxActions: 3,
      interval: 10000
    },

    roleCreate: {
      enabled: true,
      maxActions: 5,
      interval: 10000
    },

    ban: {
      enabled: true,
      maxActions: 3,
      interval: 10000
    },

    kick: {
      enabled: true,
      maxActions: 5,
      interval: 10000
    },

    webhookCreate: {
      enabled: true,
      maxActions: 3,
      interval: 10000
    },

    punishment: {
      deleteMessage: false,
      warn: false,

      timeout: true,
      timeoutMinutes: 30,

      kick: false,
      ban: true,

      violations: 1
    }
  },

  // ===================================
  // BYPASS
  // ===================================

  bypass: {
    administrators: true,

    moderators: true,

    roles: []
  },

  // ===================================
  // LOGGING
  // ===================================

  logChannel: ""
};

// =====================================
// LOAD ALL
// =====================================

function loadAll() {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify({}, null, 2)
    );
  }

  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        "utf8"
      )
    );
  } catch (error) {
    console.error(
      "❌ AutoMod config read error:",
      error.message
    );

    return {};
  }
}

// =====================================
// SAVE ALL
// =====================================

function saveAll(data) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

// =====================================
// DEEP MERGE
// =====================================

function mergeDeep(target, source) {
  for (
    const key of Object.keys(source)
  ) {
    const sourceValue =
      source[key];

    const targetValue =
      target[key];

    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      if (
        !targetValue ||
        typeof targetValue !== "object" ||
        Array.isArray(targetValue)
      ) {
        target[key] = {};
      }

      mergeDeep(
        target[key],
        sourceValue
      );

    } else if (
      sourceValue !== undefined
    ) {
      target[key] =
        sourceValue;
    }
  }

  return target;
}

// =====================================
// GET GUILD CONFIG
// =====================================

function getConfig(guildId) {
  const data =
    loadAll();

  if (!data[guildId]) {
    data[guildId] =
      structuredClone(DEFAULT);

    saveAll(data);

    return data[guildId];
  }

  // Upgrade older config files
  const config =
    mergeDeep(
      structuredClone(DEFAULT),
      data[guildId]
    );

  data[guildId] =
    config;

  saveAll(data);

  return config;
}

// =====================================
// UPDATE CONFIG
// =====================================

function updateConfig(
  guildId,
  config
) {
  const data =
    loadAll();

  data[guildId] =
    mergeDeep(
      structuredClone(DEFAULT),
      config
    );

  saveAll(data);

  return data[guildId];
}

// =====================================
// RESET CONFIG
// =====================================

function resetConfig(
  guildId
) {
  const data =
    loadAll();

  data[guildId] =
    structuredClone(DEFAULT);

  saveAll(data);

  return data[guildId];
}

// =====================================
// GET DEFAULT RULE
// =====================================

function getRuleConfig(
  config,
  rule
) {
  if (
    !config ||
    !config[rule]
  ) {
    return null;
  }

  return config[rule];
}

// =====================================
// GET PUNISHMENT
// =====================================

function getPunishment(
  config,
  rule
) {
  const ruleConfig =
    getRuleConfig(
      config,
      rule
    );

  if (
    !ruleConfig
  ) {
    return null;
  }

  return {
    ...structuredClone(
      DEFAULT_PUNISHMENT
    ),
    ...(ruleConfig.punishment || {})
  };
}

// =====================================
// EXPORT
// =====================================

module.exports = {
  DEFAULT,
  DEFAULT_PUNISHMENT,

  getConfig,
  updateConfig,
  resetConfig,

  getRuleConfig,
  getPunishment
};
