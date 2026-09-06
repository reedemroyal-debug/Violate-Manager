const fs = require("fs");
const path = require("path");

const {
  getUpcomingFestivals: panchangGetUpcomingFestivals,
  Observer
} = require("@ishubhamx/panchangam-js");

const festivalTemplates = require("../utils/festivals");

const DATA = path.join(__dirname, "../utils/festivalConfig.json");

// Default observer: New Delhi, India
const observer = new Observer(28.6139, 77.2090, 216);

// India Standard Time = UTC+5:30
const TIMEZONE_OFFSET = 330;

function load() {
  try {
    if (!fs.existsSync(DATA)) return {};
    return JSON.parse(fs.readFileSync(DATA, "utf8"));
  } catch (error) {
    console.error("❌ Festival config load error:", error.message);
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}

function todayKey() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate()
  };
}

function getUpcomingFestivals(options = {}) {
  return panchangGetUpcomingFestivals({
    date: options.date || new Date(),
    observer: options.observer || observer,
    days: options.days || 30,
    timezoneOffset: options.timezoneOffset ?? TIMEZONE_OFFSET,
    categories: options.categories
  });
}

function getPanchangFestivals() {
  return getUpcomingFestivals({
    date: new Date(),
    days: 1,
    categories: ["major", "jayanti"]
  });
}

function findTemplate(name) {
  if (!Array.isArray(festivalTemplates)) return null;

  return festivalTemplates.find(f => {
    if (!f.name) return false;

    return (
      f.name.toLowerCase() === name.toLowerCase() ||
      name.toLowerCase().includes(f.name.toLowerCase()) ||
      f.name.toLowerCase().includes(name.toLowerCase())
    );
  });
}

function randomTemplate(festival) {
  const template = findTemplate(festival.name);

  if (template && Array.isArray(template.templates)) {
    return template.templates[
      Math.floor(Math.random() * template.templates.length)
    ];
  }

  return (
    `🎉 **${festival.name.toUpperCase()}!** 🎉\n\n` +
    `${festival.description || "Wishing everyone a wonderful and blessed festival!"}\n\n` +
    `✨ **VIOLATE GAMINGZ wishes everyone a very Happy ${festival.name}!**`
  );
}

async function sendFestival(guild, festival, channelId) {
  const channel = guild.channels.cache.get(channelId);

  if (!channel || !channel.isTextBased()) {
    return false;
  }

  let message = randomTemplate(festival);

  try {
    const emojis = await guild.emojis.fetch();

    message = message.replace(
      /:([a-zA-Z0-9_~]+):/g,
      (match, name) => {
        const emoji = emojis.find(e => e.name === name);
        return emoji ? `<:${emoji.name}:${emoji.id}>` : match;
      }
    );
  } catch {}

  try {
    await channel.send({
      content: `@everyone\n${message}`,
      allowedMentions: {
        parse: ["everyone"]
      }
    });

    return true;
  } catch (error) {
    console.error(
      `❌ Festival send error in ${guild.name}:`,
      error.message
    );

    return false;
  }
}

async function checkGuild(guild) {
  const data = load();
  const config = data[guild.id];

  if (!config || !config.enabled || !config.channelId) {
    return false;
  }

  const { year, month, day } = todayKey();

  const festivals = getPanchangFestivals();

  if (!festivals || festivals.length === 0) {
    return false;
  }

  for (const festival of festivals) {
    const festivalDate = new Date(festival.date);

    // Convert detected UTC date to IST
    festivalDate.setMinutes(
      festivalDate.getMinutes() + TIMEZONE_OFFSET
    );

    const fYear = festivalDate.getUTCFullYear();
    const fMonth = festivalDate.getUTCMonth() + 1;
    const fDay = festivalDate.getUTCDate();

    if (
      fYear !== year ||
      fMonth !== month ||
      fDay !== day
    ) {
      continue;
    }

    const sentKey =
      `${year}-${month}-${day}-${festival.name}`;

    if (config.lastSent === sentKey) {
      continue;
    }

    const sent = await sendFestival(
      guild,
      festival,
      config.channelId
    );

    if (sent) {
      config.lastSent = sentKey;
      save(data);

      console.log(
        `🎉 Festival announcement sent: ${festival.name} | ${guild.name}`
      );

      return true;
    }
  }

  return false;
}

async function checkAll(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      await checkGuild(guild);
    } catch (error) {
      console.error(
        `❌ Festival check error in ${guild.name}:`,
        error.message
      );
    }
  }
}

function init(client) {
  checkAll(client);

  // Check every hour
  setInterval(() => {
    checkAll(client);
  }, 60 * 60 * 1000);

  console.log("🎉 Panchang festival system initialized.");
}

module.exports = {
  init,
  checkAll,
  checkGuild,
  sendFestival,
  getPanchangFestivals,
  getUpcomingFestivals
};
