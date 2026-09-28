const { PermissionFlagsBits } = require("discord.js");

async function resolveTicketEmoji(guild, value) {
  if (!value) return { stored: "🎫", button: "🎫" };

  const raw = String(value).trim();

  if (!raw.startsWith("<") && !raw.startsWith(":")) {
    return { stored: raw, button: raw };
  }

  const match = raw.match(/^<(a?):([^:>]+):(\d{17,20})>$/);
  if (!match) return { stored: "🎫", button: "🎫" };

  const animated = match[1] === "a";
  const name = match[2];
  const id = match[3];

  await guild.emojis.fetch().catch(() => {});

  const existing = guild.emojis.cache.get(id);
  if (existing) {
    return {
      stored: `<${existing.animated ? "a" : ""}:${existing.name}:${existing.id}>`,
      button: { id: existing.id, name: existing.name, animated: existing.animated }
    };
  }

  const sameName = guild.emojis.cache.find(
    e => e.name?.toLowerCase() === name.toLowerCase()
  );

  if (sameName) {
    return {
      stored: `<${sameName.animated ? "a" : ""}:${sameName.name}:${sameName.id}>`,
      button: { id: sameName.id, name: sameName.name, animated: sameName.animated }
    };
  }

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
    console.log(`⚠️ Missing Manage Expressions for ${name}`);
    return { stored: "🎫", button: "🎫" };
  }

  try {
    const ext = animated ? "gif" : "png";
    const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=96&quality=lossless`;

    const created = await guild.emojis.create({
      attachment: url,
      name: name.slice(0, 32),
      reason: "Ticket panel emoji import"
    });

    console.log(`✅ Ticket emoji cloned: ${name}:${id} -> ${created.id}`);

    return {
      stored: `<${created.animated ? "a" : ""}:${created.name}:${created.id}>`,
      button: {
        id: created.id,
        name: created.name,
        animated: created.animated
      }
    };
  } catch (e) {
    console.log(`❌ Emoji clone failed: ${e.message}`);
    return { stored: "🎫", button: "🎫" };
  }
}

module.exports = { resolveTicketEmoji };

module.exports.resolveEmoji = async function(guild, value) {
  const result = await module.exports.resolveTicketEmoji(guild, value);
  return result?.stored || result?.button || "🎫";
};
