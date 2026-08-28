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

function replaceVariables(text, member) {
  return String(text || "")
    .replaceAll(
      "{user}",
      `<@${member.id}>`
    )
    .replaceAll(
      "{username}",
      member.user.username
    )
    .replaceAll(
      "{server}",
      member.guild.name
    )
    .replaceAll(
      "{membercount}",
      String(member.guild.memberCount)
    );
}

module.exports = {
  async handle(member) {
    if (!member || !member.guild) return;

    const data = load();
    const config = data[member.guild.id];

    if (!config || !config.enabled) return;
    if (!config.channelId) return;

    const channel =
      member.guild.channels.cache.get(
        config.channelId
      );

    if (!channel || !channel.isTextBased()) return;

    const payload = {};

    if (config.message) {
      payload.content =
        replaceVariables(
          config.message,
          member
        );
    }

    if (
      config.title ||
      config.description ||
      config.image ||
      config.thumbnail ||
      config.footer
    ) {
      const {
        EmbedBuilder
      } = require("discord.js");

      const embed =
        new EmbedBuilder()
          .setColor(
            config.color || "#5865F2"
          );

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
        embed.setThumbnail(
          config.thumbnail
        );
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
    }

    if (
      !payload.content &&
      !payload.embeds
    ) {
      return;
    }

    try {
      await channel.send(payload);
      console.log(
        `👋 Welcome sent for ${member.user.tag}`
      );
    } catch (error) {
      console.error(
        "❌ Welcome Error:",
        error
      );
    }
  }
};
