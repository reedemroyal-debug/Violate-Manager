const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "levelingData.json");

const DEFAULT_CONFIG = {
  enabled: true,
  minXP: 15,
  maxXP: 25,
  cooldown: 60000,
  levelUpChannel: null,
  levelUpMessage: "🎉 Congratulations {user}! You reached **Level {level}**!",
  ignoredChannels: [],
  ignoredRoles: []
};

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getGuild(data, guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      config: { ...DEFAULT_CONFIG },
      users: {}
    };
  }

  data[guildId].config = {
    ...DEFAULT_CONFIG,
    ...(data[guildId].config || {})
  };

  data[guildId].users ||= {};
  return data[guildId];
}

function xpForLevel(level) {
  return 100 * level * level;
}

function totalXpForLevel(level) {
  return 100 * level * (level - 1) * (2 * level - 1) / 6;
}

function getUser(data, guildId, userId) {
  const guild = getGuild(data, guildId);

  if (!guild.users[userId]) {
    guild.users[userId] = {
      xp: 0,
      level: 0,
      totalXp: 0,
      messages: 0,
      lastXpAt: 0
    };
  }

  return guild.users[userId];
}

function randomXP(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function handleMessage(message) {
  if (!message.guild || message.author.bot) return;

  const data = load();
  const guild = getGuild(data, message.guild.id);
  const config = guild.config;

  if (!config.enabled) return;

  if (config.ignoredChannels?.includes(message.channel.id)) return;

  if (
    message.member &&
    config.ignoredRoles?.some(roleId =>
      message.member.roles.cache.has(roleId)
    )
  ) return;

  const user = getUser(data, message.guild.id, message.author.id);

  const now = Date.now();

  if (now - user.lastXpAt < Number(config.cooldown || 60000)) {
    return;
  }

  const xp = randomXP(
    Number(config.minXP || 15),
    Number(config.maxXP || 25)
  );

  const oldLevel = user.level;

  user.xp += xp;
  user.totalXp += xp;
  user.messages += 1;
  user.lastXpAt = now;

  while (user.xp >= xpForLevel(user.level + 1)) {
    user.xp -= xpForLevel(user.level + 1);
    user.level++;
  }

  save(data);

  if (user.level > oldLevel) {
    let channel = message.channel;

    if (config.levelUpChannel) {
      const configured = message.guild.channels.cache.get(
        config.levelUpChannel
      );

      if (configured) channel = configured;
    }

    const text = String(config.levelUpMessage || DEFAULT_CONFIG.levelUpMessage)
      .replaceAll("{user}", `<@${message.author.id}>`)
      .replaceAll("{username}", message.author.username)
      .replaceAll("{level}", String(user.level))
      .replaceAll("{xp}", String(user.xp))
      .replaceAll("{server}", message.guild.name);

    try {
      const nextXP = xpForLevel(user.level + 1);
      const percent = Math.min(
        100,
        Math.floor((user.xp / nextXP) * 100)
      );

      const barLength = 18;
      const filled = Math.round(
        (percent / 100) * barLength
      );

      const progressBar =
        "█".repeat(filled) +
        "░".repeat(Math.max(0, barLength - filled));

      const embed = {
        color: 0xff4db8,
        author: {
          name: "SERVER LEVELING"
        },
        title: "🎉 LEVEL-UP!",
        description:
          `${text}\n\n` +
          `**Level ${user.level}**`,
        thumbnail: {
          url: message.author.displayAvatarURL({
            size: 256
          })
        },
        fields: [
          {
            name: "⭐ XP",
            value:
              `${progressBar}\n` +
              `**${user.xp} / ${nextXP} XP** (${percent}%)`
          }
        ],
        footer: {
          text: message.guild.name
        }
      };

      await channel.send({
        embeds: [embed]
      });
    } catch (error) {
      console.error("❌ Level-up announcement error:", error);
    }
  }
}

function getProfile(guildId, userId) {
  const data = load();
  const user = getUser(data, guildId, userId);

  const currentLevelXP = xpForLevel(user.level + 1);

  return {
    ...user,
    nextLevelXP: currentLevelXP,
    progressXP: user.xp,
    progressPercent: Math.min(
      100,
      Math.floor((user.xp / currentLevelXP) * 100)
    )
  };
}

function getLeaderboard(guildId, limit = 10) {
  const data = load();
  const guild = getGuild(data, guildId);

  return Object.entries(guild.users)
    .map(([userId, user]) => ({
      userId,
      ...user
    }))
    .sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      return b.totalXp - a.totalXp;
    })
    .slice(0, limit);
}

function getConfig(guildId) {
  const data = load();
  return getGuild(data, guildId).config;
}

function updateConfig(guildId, changes) {
  const data = load();
  const guild = getGuild(data, guildId);

  guild.config = {
    ...guild.config,
    ...changes
  };

  save(data);
  return guild.config;
}

function addXP(guildId, userId, amount) {
  const data = load();
  const user = getUser(data, guildId, userId);

  user.xp += Number(amount);
  user.totalXp += Number(amount);

  while (user.xp >= xpForLevel(user.level + 1)) {
    user.xp -= xpForLevel(user.level + 1);
    user.level++;
  }

  save(data);
  return user;
}

function resetUser(guildId, userId) {
  const data = load();
  const guild = getGuild(data, guildId);

  delete guild.users[userId];

  save(data);
}

module.exports = {
  DEFAULT_CONFIG,
  xpForLevel,
  handleMessage,
  getProfile,
  getLeaderboard,
  getConfig,
  updateConfig,
  addXP,
  resetUser
};
