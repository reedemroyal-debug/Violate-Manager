const {
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/welcome.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {};
  }
}

function replaceCustomEmojis(text, member) {
  return String(text || "").replace(
    /:([a-zA-Z0-9_]+):/g,
    (match, name) => {
      const wanted = name.toLowerCase();

      const emoji = member.guild.emojis.cache.find(
        e => e.name && e.name.toLowerCase() === wanted
      );

      return emoji ? emoji.toString() : match;
    }
  );
}

function replaceVariables(text, member) {
  const result = String(text || "")
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user.username)
    .replaceAll("{server}", member.guild.name)
    .replaceAll(
      "{membercount}",
      String(member.guild.memberCount)
    );

  return replaceCustomEmojis(result, member);
}

async function sendWelcome(member) {
  const data = load();
  const config = data[member.guild.id];

  if (!config || !config.enabled) return false;
  if (!config.channelId) return false;

  const channel =
    member.guild.channels.cache.get(
      config.channelId
    );

  if (!channel || !channel.isTextBased()) {
    return false;
  }

  const payload = {};

  if (config.message) {
    payload.content =
      replaceVariables(
        config.message,
        member
      );
  }

  const embed = new EmbedBuilder()
    .setColor(config.color || "#5865F2");

  if (config.title) {
    embed.setTitle(
      replaceVariables(
        config.title,
        member
      )
    );
  }

  if (config.description) {
    embed.setDescription(
      replaceVariables(
        config.description,
        member
      )
    );
  }

  if (config.image) {
    embed.setImage(config.image);
  }

  if (config.thumbnail) {
    embed.setThumbnail(config.thumbnail);
  }

  if (config.footer) {
    embed.setFooter({
      text: replaceVariables(
        config.footer,
        member
      )
    });
  }

  payload.embeds = [embed];

  await channel.send(payload);

  console.log(
    `👋 Welcome sent for ${member.user.tag}`
  );

  return true;
}

module.exports = {
  async handle(member) {
    try {
      await sendWelcome(member);
    } catch (error) {
      console.error(
        "❌ Welcome Error:",
        error
      );
    }
  },

  sendWelcome
};
