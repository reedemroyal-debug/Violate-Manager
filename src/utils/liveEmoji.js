const fs = require("fs");
const path = require("path");

const CACHE = path.join(__dirname, "liveEmojiCache.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(CACHE, JSON.stringify(data, null, 2));
}

async function replaceExternalEmojis(guild, text) {
  if (!guild || !text) return text;

  const regex = /<(a?):([A-Za-z0-9_]{2,32}):(\d{17,20})>/g;
  const matches = [...text.matchAll(regex)];

  if (!matches.length) return text;

  const me = guild.members.me;

  if (!me?.permissions.has("ManageGuildExpressions")) {
    console.log("❌ LiveEmoji: Give bot Manage Expressions permission.");
    return text;
  }

  const cache = load();
  cache[guild.id] ??= {};

  let result = text;

  for (const match of matches) {
    const animated = match[1] === "a";
    const name = match[2];
    const sourceId = match[3];
    const original = match[0];

    try {
      let targetId = cache[guild.id][sourceId];

      if (targetId && !guild.emojis.cache.has(targetId)) {
        targetId = null;
        delete cache[guild.id][sourceId];
      }

      if (!targetId) {
        const extension = animated ? "gif" : "png";
        const url =
          `https://cdn.discordapp.com/emojis/${sourceId}.${extension}?quality=lossless`;

        const created = await guild.emojis.create({
          attachment: url,
          name
        });

        targetId = created.id;
        cache[guild.id][sourceId] = targetId;
        save(cache);

        console.log(
          `✅ LiveEmoji cloned: ${name} ${sourceId} -> ${targetId}`
        );
      }

      const replacement = animated
        ? `<a:${name}:${targetId}>`
        : `<:${name}:${targetId}>`;

      result = result.split(original).join(replacement);
    } catch (err) {
      console.error(
        `❌ LiveEmoji failed for ${name} (${sourceId}):`,
        err.message
      );
    }
  }

  return result;
}

module.exports = { replaceExternalEmojis };
