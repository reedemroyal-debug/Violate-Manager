const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "extraOwners.json");

function load() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify({ users: [] }, null, 2)
      );
    }

    const data = JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );

    if (!Array.isArray(data.users)) {
      data.users = [];
    }

    return data;
  } catch (error) {
    console.error("❌ Extra Owner load error:", error);
    return { users: [] };
  }
}

function save(data) {
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2)
  );
}

function isMainOwner(userId) {
  return Boolean(
    process.env.BOT_OWNER_ID &&
    userId === process.env.BOT_OWNER_ID
  );
}

function isExtraOwner(userId) {
  return load().users.includes(userId);
}

function add(userId) {
  const data = load();

  if (data.users.includes(userId)) {
    return false;
  }

  data.users.push(userId);
  save(data);
  return true;
}

function remove(userId) {
  const data = load();
  const index = data.users.indexOf(userId);

  if (index === -1) {
    return false;
  }

  data.users.splice(index, 1);
  save(data);
  return true;
}

function list() {
  return load().users;
}

module.exports = {
  isMainOwner,
  isExtraOwner,
  add,
  remove,
  list
};
