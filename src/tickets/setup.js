const {
  EmbedBuilder,
  MessageFlags
} = require("discord.js");

const { getGuild, updateGuild } = require("./config");
const { resolveEmoji } = require("./emoji");

const TIMEOUT = 10 * 60 * 1000;

async function ask(interaction, text) {
  const channel = interaction.channel;
  const user = interaction.user;

  const prompt = await channel.send({
    content:
      `${text}\n\n` +
      `⏱️ **You have 10 minutes to answer.**`
  });

  try {
    const collected = await channel.awaitMessages({
      filter: message =>
        message.author.id === user.id &&
        !message.author.bot,
      max: 1,
      time: TIMEOUT,
      errors: ["time"]
    });

    const answer = collected.first();

    await prompt.delete().catch(() => {});
    return answer;
  } catch {
    await prompt.edit({
      content: "⌛ **Ticket setup timed out.**"
    }).catch(() => {});

    return null;
  }
}

function cleanId(value) {
  const match = String(value || "").match(/\d{15,25}/);
  return match ? match[0] : null;
}

function color(value) {
  const colors = {
    red: "#ED4245",
    green: "#57F287",
    blue: "#5865F2",
    blurple: "#5865F2",
    yellow: "#FEE75C",
    orange: "#E67E22",
    purple: "#9B59B6",
    pink: "#EB459E",
    black: "#000000",
    white: "#FFFFFF",
    cyan: "#00FFFF"
  };

  return (
    colors[String(value).toLowerCase()] ||
    (/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#5865F2")
  );
}

async function startSetup(interaction) {
  const config = getGuild(interaction.guild.id);

  // Completely fresh setup
  config.enabled = false;
  config.categories = {};
  config.panel = {
    title: "Ticket Support",
    description:
      "Please enter the requested information as prompted.",
    color: "#5865F2",
    image: null,
    thumbnail: null,
    channelId: null
  };

  await interaction.reply({
    content:
      "🎫 **VIOLATE TICKET SETUP STARTED**\n\n" +
      "I will ask you for each setting in this channel.\n" +
      "Every question has a **10-minute timeout**.",
    flags: MessageFlags.Ephemeral
  });

  // TITLE
  let message = await ask(
    interaction,
    "📝 **Ticket Panel Title**\nSend the title you want on the ticket panel."
  );

  if (!message) return;
  config.panel.title = message.content.trim().slice(0, 256);

  // DESCRIPTION
  message = await ask(
    interaction,
    "📄 **Ticket Panel Description**\nSend the description for the ticket panel."
  );

  if (!message) return;
  config.panel.description = message.content.trim().slice(0, 4000);

  // COLOR
  message = await ask(
    interaction,
    "🎨 **Ticket Panel Color**\nSend a color name like `blue`, `red`, `green`, `purple` or a HEX color like `#5865F2`."
  );

  if (!message) return;
  config.panel.color = color(message.content.trim());

  // IMAGE
  message = await ask(
    interaction,
    "🖼️ **Ticket Panel Image**\nSend an image URL, or type `skip`."
  );

  if (!message) return;

  config.panel.image =
    message.content.trim().toLowerCase() === "skip"
      ? null
      : message.content.trim();

  // THUMBNAIL
  message = await ask(
    interaction,
    "🔳 **Ticket Panel Thumbnail**\nSend a thumbnail URL, or type `skip`."
  );

  if (!message) return;

  config.panel.thumbnail =
    message.content.trim().toLowerCase() === "skip"
      ? null
      : message.content.trim();

  // TICKET CATEGORY
  message = await ask(
    interaction,
    "📁 **Ticket Category Channel**\nMention the Discord category where ticket channels should be created, or send its ID."
  );

  if (!message) return;

  const ticketCategoryId = cleanId(message.content);

  if (
    ticketCategoryId &&
    interaction.guild.channels.cache.get(ticketCategoryId)?.type === 4
  ) {
    config.ticketCategoryId = ticketCategoryId;
  } else {
    await interaction.channel.send(
      "⚠️ Invalid category. Tickets will be created without a parent category."
    );
    config.ticketCategoryId = null;
  }

  // STAFF ROLE
  message = await ask(
    interaction,
    "🛡️ **Staff Role**\nMention the staff role or send its ID, or type `skip`."
  );

  if (!message) return;

  if (message.content.trim().toLowerCase() === "skip") {
    config.staffRoleId = null;
  } else {
    const roleId = cleanId(message.content);

    if (roleId && interaction.guild.roles.cache.has(roleId)) {
      config.staffRoleId = roleId;
    } else {
      await interaction.channel.send(
        "⚠️ Invalid role. No staff role has been configured."
      );
      config.staffRoleId = null;
    }
  }

  // LOG CHANNEL
  message = await ask(
    interaction,
    "📋 **Ticket Log Channel**\nMention the log channel or send its ID, or type `skip`."
  );

  if (!message) return;

  if (message.content.trim().toLowerCase() === "skip") {
    config.logChannelId = null;
  } else {
    const channelId = cleanId(message.content);
    const logChannel = channelId
      ? interaction.guild.channels.cache.get(channelId)
      : null;

    if (logChannel?.isTextBased()) {
      config.logChannelId = channelId;
    } else {
      config.logChannelId = null;
      await interaction.channel.send(
        "⚠️ Invalid log channel. Logs are disabled."
      );
    }
  }

  // CATEGORIES
  let addMore = true;

  while (addMore) {
    message = await ask(
      interaction,
      "🏷️ **Ticket Category Name**\nSend the category name."
    );

    if (!message) return;

    const name = message.content.trim().slice(0, 80);

    message = await ask(
      interaction,
      "😀 **Ticket Category Emoji**\nSelect an emoji from your Discord emoji picker and send it here.\n\n" +
      "You can also type `skip` for 🎫."
    );

    if (!message) return;

    let emoji = message.content.trim();

    if (emoji.toLowerCase() === "skip") {
      emoji = "🎫";
    } else {
      // IMPORTANT:
      // Discord picker sends <:name:id> / <a:name:id>
      emoji = await resolveEmoji(
        interaction.guild,
        emoji
      );
    }

    message = await ask(
      interaction,
      "📖 **Category Description**\nSend the description members should see."
    );

    if (!message) return;

    const description =
      message.content.trim().slice(0, 4000);

    const categoryId =
      `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const questions = [];

    // QUESTIONS
    while (true) {
      message = await ask(
        interaction,
        "❓ **Ticket Question**\nSend a question members must answer, or type `done` when finished."
      );

      if (!message) return;

      if (message.content.trim().toLowerCase() === "done") {
        break;
      }

      questions.push(
        message.content.trim().slice(0, 500)
      );

      await interaction.channel.send(
        `✅ Question added. **${questions.length}** question(s) configured.`
      );
    }

    config.categories[categoryId] = {
      id: categoryId,
      name,
      emoji,
      description,
      questions
    };

    updateGuild(interaction.guild.id, config);

    await interaction.channel.send({
      content:
        `✅ **Category Created**\n` +
        `🏷️ ${name}\n` +
        `😀 ${emoji}\n` +
        `❓ Questions: ${questions.length}\n` +
        `🆔 \`${categoryId}\``
    });

    message = await ask(
      interaction,
      "➕ **Add Another Category?**\nSend `yes` to add another category, or `no` to finish."
    );

    if (!message) return;

    addMore =
      ["yes", "y"].includes(
        message.content.trim().toLowerCase()
      );
  }

  // FINAL SAVE
  config.enabled = true;
  updateGuild(interaction.guild.id, config);

  const categories = Object.values(config.categories);

  const embed = new EmbedBuilder()
    .setTitle("🎫 Ticket System Saved")
    .setDescription(
      `**${config.panel.title}**\n\n` +
      `${config.panel.description}\n\n` +
      `🏷️ Categories: **${categories.length}**\n` +
      `🛡️ Staff Role: ${
        config.staffRoleId
          ? `<@&${config.staffRoleId}>`
          : "Not configured"
      }\n` +
      `📋 Logs: ${
        config.logChannelId
          ? `<#${config.logChannelId}>`
          : "Disabled"
      }`
    )
    .setColor(config.panel.color);

  if (config.panel.image) {
    embed.setImage(config.panel.image);
  }

  if (config.panel.thumbnail) {
    embed.setThumbnail(config.panel.thumbnail);
  }

  await interaction.channel.send({
    embeds: [embed]
  });

  await interaction.editReply({
    content:
      "✅ **Ticket setup completed successfully!**\n\n" +
      "Use `/ticket panel` to deploy the panel."
  });
}

module.exports = {
  startSetup
};
