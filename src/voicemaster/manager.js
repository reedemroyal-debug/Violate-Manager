const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "data.json");

let data = {};
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, "utf8")) || {};
  } catch {
    data = {};
  }
  return data;
}

function saveNow() {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {}
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 1000);
}

function get(guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      categoryId: null,
      masterId: null,
      controlChannelId: null,
      controlMessageId: null,
      rooms: {}
    };
  }

  return data[guildId];
}

function setup(guildId, categoryId, masterId, controlChannelId) {
  const g = get(guildId);

  g.categoryId = categoryId;
  g.masterId = masterId;
  g.controlChannelId = controlChannelId;

  scheduleSave();
  return g;
}

function setControlMessage(guildId, messageId) {
  get(guildId).controlMessageId = messageId;
  scheduleSave();
}

function addRoom(guildId, room) {
  get(guildId).rooms[room.channelId] = room;
  scheduleSave();
}

function removeRoom(guildId, channelId) {
  delete get(guildId).rooms[channelId];
  scheduleSave();
}

function getRoom(guildId, channelId) {
  return get(guildId).rooms[channelId] || null;
}

function getRooms(guildId) {
  return Object.values(get(guildId).rooms);
}

function findOwnerRoom(guildId, ownerId) {
  return getRooms(guildId).find(x => x.ownerId === ownerId) || null;
}

load();

module.exports = {
  load,
  save: saveNow,
  get,
  setup,
  setControlMessage,
  addRoom,
  removeRoom,
  getRoom,
  getRooms,
  findOwnerRoom
};
