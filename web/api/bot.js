const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");

function readJSON(file, fallback = {}) {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(ROOT, file), "utf8")
    );
  } catch {
    return fallback;
  }
}

function botStatus() {
  return {
    online: true,
    name: "VIOLATE MANAGER"
  };
}

module.exports = {
  botStatus,
  readJSON
};
