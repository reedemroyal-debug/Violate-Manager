const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "rolePingData.json");

const DEFAULT_DATA = {
  rules: {},
  protectedTargets: [],
  logChannel: null
};

function load() {
  try {
    if (!fs.existsSync(file)) {
      save(DEFAULT_DATA);
      return {
        rules: {},
        protectedTargets: [],
        logChannel: null
      };
    }

    const data = JSON.parse(
      fs.readFileSync(file, "utf8")
    );

    return {
      rules: data.rules || {},
      protectedTargets:
        Array.isArray(data.protectedTargets)
          ? data.protectedTargets
          : [],
      logChannel: data.logChannel || null
    };
  } catch (error) {
    console.error(
      "❌ RolePing store error:",
      error
    );

    return {
      rules: {},
      protectedTargets: [],
      logChannel: null
    };
  }
}

function save(data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

// =====================================
// ALLOW SOURCE -> TARGET
// =====================================

function allow(sourceId, targetId) {
  const data = load();

  if (!data.rules[sourceId]) {
    data.rules[sourceId] = [];
  }

  if (!data.rules[sourceId].includes(targetId)) {
    data.rules[sourceId].push(targetId);
  }

  if (!data.protectedTargets.includes(targetId)) {
    data.protectedTargets.push(targetId);
  }

  save(data);
}

// =====================================
// DENY SOURCE -> TARGET
// =====================================

function deny(sourceId, targetId) {
  const data = load();

  if (data.rules[sourceId]) {
    data.rules[sourceId] =
      data.rules[sourceId].filter(
        id => id !== targetId
      );

    if (data.rules[sourceId].length === 0) {
      delete data.rules[sourceId];
    }
  }

  /*
   * IMPORTANT:
   * Target ko protected hi rakho.
   * Sirf source ki permission remove hogi.
   */
  if (!data.protectedTargets.includes(targetId)) {
    data.protectedTargets.push(targetId);
  }

  save(data);
}

// =====================================
// CLEAR SOURCE
// =====================================

function clear(sourceId) {
  const data = load();

  delete data.rules[sourceId];

  save(data);
}

// =====================================
// CHECK WHETHER TARGET IS PROTECTED
// =====================================

function isProtected(targetId) {
  const data = load();

  return data.protectedTargets.includes(
    targetId
  );
}

// =====================================
// CHECK SOURCE -> TARGET
// =====================================

function canPing(member, targetId) {
  if (!member) return false;

  if (
    member.permissions.has(
      "Administrator"
    )
  ) {
    return true;
  }

  const data = load();

  const sourceRoles =
    member.roles.cache
      .filter(
        role =>
          role.id !== member.guild.id
      )
      .map(role => role.id);

  for (const sourceId of sourceRoles) {
    const allowed =
      data.rules[sourceId] || [];

    if (allowed.includes(targetId)) {
      return true;
    }
  }

  return false;
}

// =====================================
// LOG CHANNEL
// =====================================

function setLogChannel(channelId) {
  const data = load();

  data.logChannel = channelId;

  save(data);
}

function getLogChannel() {
  return load().logChannel;
}

// =====================================
// GET RULES
// =====================================

function getRules() {
  return load().rules;
}

function getAll() {
  return load().rules;
}

module.exports = {
  load,
  save,
  allow,
  deny,
  clear,
  isProtected,
  canPing,
  setLogChannel,
  getLogChannel,
  getRules,
  getAll
};

