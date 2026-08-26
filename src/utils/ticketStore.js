const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "tickets.json");

function load() {
  if (!fs.existsSync(file)) {
    return {};
  }

  try {
    return JSON.parse(
      fs.readFileSync(file, "utf8")
    );
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

function getGuild(guildId) {
  const data = load();

  if (!data[guildId]) {
    data[guildId] = {
      setup: {
        title: "",
        description: "",
        color: "#5865F2",
        image: "",
        thumbnail: "",
        buttonText: "Create Ticket",
        buttonEmoji: "🎫",
        categoryId: "",
        staffRoleId: "",
        logChannelId: ""
      },
      tickets: {}
    };

    save(data);
  }

  return data[guildId];
}

function updateGuild(guildId, guildData) {
  const data = load();

  data[guildId] = guildData;

  save(data);
}

function removeGuild(guildId) {
  const data = load();

  delete data[guildId];

  save(data);
}

module.exports = {
  load,
  save,
  getGuild,
  updateGuild,
  removeGuild
};
