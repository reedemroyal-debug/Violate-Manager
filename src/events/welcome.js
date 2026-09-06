const { EmbedBuilder } = require("discord.js");
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

/*
 * Discord custom emojis are already represented as:
 *
 * <:emoji_name:EMOJI_ID>
 * <a:emoji_name:EMOJI_ID>
 *
 * We DO NOT try to invent emoji IDs.
 * Existing Discord emoji mentions are preserved exactly.
 */

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

async function sendWelcome(member) {
  const data = load();
  const config =
    data[member.guild.id];

  if (!config || !config.enabled) {
    return false;
  }

  if (!config.channelId) {
    return false;
  }

  const channel =
    member.guild.channels.cache.get(
      config.channelId
    );

  if (
    !channel ||
    !channel.isTextBased()
  ) {
    return false;
  }

  const payload = {};

  /*
   * Message above embed
   */
  if (config.message) {
    payload.content =
      replaceVariables(
        config.message,
        member
      );
  }

  const embed =
    new EmbedBuilder();

  /*
   * Color
   */
  try {
    embed.setColor(
      config.color || "#5865F2"
    );
  } catch {
    embed.setColor("#5865F2");
  }

  /*
   * Title
   */
  if (config.title) {
    embed.setTitle(
      replaceVariables(
        config.title,
        member
      )
    );
  }

  /*
   * Description
   */
  if (config.description) {
    embed.setDescription(
      replaceVariables(
        config.description,
        member
      )
    );
  }

  /*
   * Image
   */
  if (config.image) {
    try {
      embed.setImage(
        config.image
      );
    } catch {}
  }

  /*
   * Thumbnail
   */
  if (config.thumbnail) {
    try {
      embed.setThumbnail(
        config.thumbnail
      );
    } catch {}
  }

  /*
   * Footer
   */
  if (config.footer) {
    embed.setFooter({
      text:
        replaceVariables(
          config.footer,
          member
        )
    });
  }

  /*
   * Optional standalone emoji.
   *
   * IMPORTANT:
   * If config.emoji contains:
   *
   * <a:heart_gif:123456789>
   *
   * it is sent directly.
   */
  if (config.emoji) {
    const emoji =
      replaceVariables(
        config.emoji,
        member
      );

    const oldDescription =
      embed.data.description || "";

    embed.setDescription(
      `${emoji}${oldDescription ? ` ${oldDescription}` : ""}`
    );
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
