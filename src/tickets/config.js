const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "ticketData.json");

const DEFAULT = {
  guilds: {}
};

function load() {
  try {
    if (!fs.existsSync(FILE)) {
      fs.writeFileSync(FILE, JSON.stringify(DEFAULT, null, 2));
      return structuredClone(DEFAULT);
    }

    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getGuild(guildId) {
  const data = load();

  data.guilds[guildId] ??= {
    enabled: false,
    panel: {
      title: "Support Tickets",
      description: "Select a category below to create a ticket.",
      color: "#5865F2",
      image: null,
      thumbnail: null,
      channelId: null
    },
    categories: {},
    ticketCategoryId: null,
    staffRoleId: null,
    logChannelId: null
  };

  save(data);
  return data.guilds[guildId];
}

function updateGuild(guildId, guildConfig) {
  const data = load();
  data.guilds[guildId] = guildConfig;
  save(data);
}

module.exports = {
  load,
  save,
  getGuild,
  updateGuild
};
