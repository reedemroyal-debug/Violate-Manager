const {
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/autoresponders.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {
      enabled: true,
      responders: []
    };
  }
}

module.exports = {
  async handle(message) {
    if (!message.guild) return;
    if (message.author.bot) return;

    const data = load();

    if (!data.enabled) return;

    const content = message.content.trim();

    for (const responder of data.responders) {
      if (!responder.enabled) continue;

      if (
        responder.channelId &&
        responder.channelId !== message.channel.id
      ) {
        continue;
      }

      const trigger =
        responder.caseSensitive
          ? responder.trigger
          : responder.trigger.toLowerCase();

      const text =
        responder.caseSensitive
          ? content
          : content.toLowerCase();

      if (!text.includes(trigger)) continue;

      const payload = {};

      if (responder.message) {
        payload.content = responder.message;
      }

      if (
        responder.embedTitle ||
        responder.embedDescription ||
        responder.image ||
        responder.footer
      ) {
        const embed = new EmbedBuilder();

        try {
          embed.setColor(
            responder.color || "#5865F2"
          );
        } catch {
          embed.setColor("#5865F2");
        }

        if (responder.embedTitle) {
          embed.setTitle(
            responder.embedTitle
          );
        }

        if (responder.embedDescription) {
          embed.setDescription(
            responder.embedDescription
          );
        }

        if (responder.image) {
          try {
            embed.setImage(
              responder.image
            );
          } catch {}
        }

        if (responder.footer) {
          embed.setFooter({
            text: responder.footer
          });
        }

        payload.embeds = [embed];
      }

      if (
        !payload.content &&
        !payload.embeds
      ) {
        continue;
      }

      try {
        await message.channel.send(
          payload
        );
      } catch (error) {
        console.error(
          "❌ Autoresponder Error:",
          error
        );
      }

      break;
    }
  }
};
