const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(__dirname, "../utils/ticketConfig.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
  } catch {
    return {
      global: { roleAssignmentEnabled: false },
      categories: {},
      tickets: {}
    };
  }
}

function save(data) {
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

function ensure(data) {
  data.global ??= {};
  data.global.roleAssignmentEnabled ??= false;
  data.categories ??= {};
  data.tickets ??= {};
}

function findCategory(data, value) {
  if (data.categories[value]) return data.categories[value];

  return Object.values(data.categories).find(
    c => c.id === value ||
         c.name.toLowerCase() === value.toLowerCase()
  );
}

async function handleCommand(interaction) {
  const sub = interaction.options.getSubcommand();
  const data = load();
  ensure(data);

  if (sub === "category-create") {
    const id = `category_${Date.now()}`;

    data.categories[id] = {
      id,
      name: interaction.options.getString("name"),
      emoji: interaction.options.getString("emoji"),
      description: interaction.options.getString("description"),
      discordCategoryId: interaction.options.getChannel("ticket-category").id,
      staffRoleId: interaction.options.getRole("staff-role").id,
      passRoleId: null,
      questions: []
    };

    save(data);

    return interaction.reply({
      content:
        `✅ Category created!\n\n` +
        `**${data.categories[id].name}**\n` +
        `🆔 \`${id}\`\n` +
        `📁 <#${data.categories[id].discordCategoryId}>\n` +
        `👮 <@&${data.categories[id].staffRoleId}>`,
      ephemeral: true
    });
  }

  if (sub === "category-delete") {
    const category = findCategory(
      data,
      interaction.options.getString("category")
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
    }

    delete data.categories[category.id];
    save(data);

    return interaction.reply({
      content: `🗑️ Deleted **${category.name}**.`,
      ephemeral: true
    });
  }

  if (sub === "question-add") {
    const category = findCategory(
      data,
      interaction.options.getString("category")
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
    }

    const question = interaction.options.getString("question");
    const minLength =
      interaction.options.getInteger("min-length") ?? 0;

    const keywordsRaw =
      interaction.options.getString("keywords") || "";

    const keywords = keywordsRaw
      .split(",")
      .map(x => x.trim().toLowerCase())
      .filter(Boolean);

    category.questions ??= [];

    category.questions.push({
      id: `question_${Date.now()}`,
      question,
      minLength,
      keywords
    });

    save(data);

    return interaction.reply({
      content:
        `✅ Question added to **${category.name}**.\n\n` +
        `**${category.questions.length}.** ${question}`,
      ephemeral: true
    });
  }

  if (sub === "question-remove") {
    const category = findCategory(
      data,
      interaction.options.getString("category")
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
    }

    const number = interaction.options.getInteger("number");

    if (!category.questions?.[number - 1]) {
      return interaction.reply({
        content: "❌ Question not found.",
        ephemeral: true
      });
    }

    const removed = category.questions.splice(number - 1, 1)[0];
    save(data);

    return interaction.reply({
      content: `🗑️ Removed question **${removed.question}**.`,
      ephemeral: true
    });
  }

  if (sub === "questions") {
    const category = findCategory(
      data,
      interaction.options.getString("category")
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
    }

    if (!category.questions?.length) {
      return interaction.reply({
        content: `📋 **${category.name}** has no questions.`,
        ephemeral: true
      });
    }

    const text = category.questions
      .map((q, i) =>
        `**${i + 1}.** ${q.question}\n` +
        `Minimum: ${q.minLength || 0} chars` +
        (q.keywords?.length
          ? ` | Keywords: ${q.keywords.join(", ")}`
          : "")
      )
      .join("\n\n");

    return interaction.reply({
      content: `📋 **${category.name} Questions**\n\n${text.slice(0, 3900)}`,
      ephemeral: true
    });
  }

  if (sub === "role-set") {
    const category = findCategory(
      data,
      interaction.options.getString("category")
    );

    if (!category) {
      return interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
    }

    const role = interaction.options.getRole("role");

    category.passRoleId = role.id;
    save(data);

    return interaction.reply({
      content:
        `✅ Pass role set for **${category.name}** → <@&${role.id}>`,
      ephemeral: true
    });
  }

  if (sub === "role-toggle") {
    const enabled = interaction.options.getBoolean("enabled");

    data.global.roleAssignmentEnabled = enabled;
    save(data);

    return interaction.reply({
      content:
        `✅ Automatic role assignment is now **${enabled ? "ENABLED" : "DISABLED"}**.`,
      ephemeral: true
    });
  }

  if (sub === "panel") {
    const categories = Object.values(data.categories);

    if (!categories.length) {
      return interaction.reply({
        content: "❌ Create at least one ticket category first.",
        ephemeral: true
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("🎫 Select a ticket category")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        categories.slice(0, 25).map(c =>
          new StringSelectMenuOptionBuilder()
            .setLabel(c.name.slice(0, 100))
            .setDescription(c.description.slice(0, 100))
            .setValue(c.id)
            .setEmoji(c.emoji || "🎫")
        )
      );

    const embed = new EmbedBuilder()
      .setTitle("🎫 VIOLATE SUPPORT")
      .setDescription(
        "Select a category below to create a ticket.\n\n" +
        "🤖 Some applications may require an automated interview."
      )
      .setColor("#5865F2");

    await interaction.channel.send({
      embeds: [embed],
      components: [
        new ActionRowBuilder().addComponents(menu)
      ]
    });

    return interaction.reply({
      content: "✅ Ticket panel sent.",
      ephemeral: true
    });
  }
}

async function createTicket(interaction, category) {
  const data = load();
  ensure(data);

  // Find only a REAL open ticket whose Discord channel still exists
  let existing = null;

  for (const ticket of Object.values(data.tickets || {})) {
    if (
      ticket.guildId !== interaction.guild.id ||
      ticket.userId !== interaction.user.id ||
      ticket.closed === true ||
      ticket.status === "closed"
    ) {
      continue;
    }

    const existingChannel = await interaction.guild.channels
      .fetch(ticket.channelId)
      .catch(() => null);

    if (existingChannel) {
      existing = ticket;
      break;
    }

    // Channel was deleted manually, so clean the stale record
    delete data.tickets[ticket.id];
  }

  save(data);

  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open ticket: <#${existing.channelId}>`,
      ephemeral: true
    });
  }

  const staffRole = interaction.guild.roles.cache.get(
    category.staffRoleId
  );

  if (!staffRole) {
    return interaction.reply({
      content: "❌ Staff role for this category no longer exists.",
      ephemeral: true
    });
  }

  const channel = await interaction.guild.channels.create({
    name:
      `${category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${interaction.user.username}`
        .slice(0, 90),
    type: 0,
    parent: category.discordCategoryId,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      },
      {
        id: staffRole.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageMessages
        ]
      }
    ]
  });

  const ticketId = `ticket_${Date.now()}`;

  data.tickets[ticketId] = {
    id: ticketId,
    guildId: interaction.guild.id,
    channelId: channel.id,
    userId: interaction.user.id,
    categoryId: category.id,
    createdAt: Date.now(),
    closed: false
  };

  save(data);

  await interaction.reply({
    content: `✅ Ticket created: <#${channel.id}>`,
    ephemeral: true
  });

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle(`🤖 ${category.name} Interview`)
        .setDescription(
          `Welcome <@${interaction.user.id}>!\n\n` +
          `I will ask you ${category.questions?.length || 0} question(s).\n` +
          `Please answer honestly and clearly.`
        )
        .setColor("#5865F2")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      )
    ]
  });

  if (!category.questions?.length) {
    await channel.send(
      "ℹ️ This category has no interview questions. Staff will assist you shortly."
    );
    return;
  }

  await runInterview(channel, interaction.user, category, ticketId);
}

async function runInterview(channel, user, category, ticketId) {
  const questions = category.questions || [];
  let passed = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    await channel.send(
      `**Question ${i + 1}/${questions.length}**\n\n${q.question}\n\n` +
      "✍️ Reply with your answer."
    );

    let collected;

    try {
      collected = await channel.awaitMessages({
        filter: m =>
          m.author.id === user.id &&
          !m.author.bot,
        max: 1,
        time: 5 * 60 * 1000
      });
    } catch {
      return;
    }

    if (!collected.size) {
      await channel.send(
        "⏰ Interview timed out. A staff member can continue this ticket."
      );
      return;
    }

    const answer = collected.first().content.trim();

    const minLength = Number(q.minLength || 0);
    const keywords = Array.isArray(q.keywords)
      ? q.keywords.filter(Boolean)
      : [];

    const lengthOK =
      minLength > 0 &&
      answer.length >= minLength;

    const keywordOK =
      keywords.length > 0 &&
      keywords.some(keyword =>
        answer.toLowerCase().includes(keyword.toLowerCase())
      );

    if (lengthOK && keywordOK) {
      passed++;

      await channel.send(
        `✅ Answer ${i + 1} accepted.`
      );
    } else {
      await channel.send(
        `⚠️ Answer ${i + 1} did not meet the configured requirements.`
      );
    }
  }

  const requiredPasses =
    Math.ceil(questions.length * 0.6);

  const passedApplication =
    passed >= requiredPasses;

  const data = load();
  const ticket = data.tickets[ticketId];

  if (ticket) {
    ticket.score = passed;
    ticket.totalQuestions = questions.length;
    ticket.passed = passedApplication;
    ticket.completedAt = Date.now();
    save(data);
  }

  if (passedApplication) {
    const embed = new EmbedBuilder()
      .setTitle("✅ APPLICATION PASSED")
      .setDescription(
        `Congratulations <@${user.id}>!\n\n` +
        `You passed the **${category.name}** interview.\n\n` +
        `Score: **${passed}/${questions.length}**`
      )
      .setColor("#57F287");

    await channel.send({ embeds: [embed] });

    if (data.global.roleAssignmentEnabled && category.passRoleId) {
      const member = await channel.guild.members
        .fetch(user.id)
        .catch(() => null);

      const role = channel.guild.roles.cache.get(
        category.passRoleId
      );

      if (member && role) {
        if (
          role.position <
          channel.guild.members.me.roles.highest.position
        ) {
          await member.roles.add(
            role,
            `Passed ${category.name} interview`
          ).catch(() => {});

          await channel.send(
            `🎉 <@${user.id}> has received <@&${role.id}>.`
          );
        } else {
          await channel.send(
            "⚠️ I passed your application, but I cannot assign the configured role because my bot role is not high enough."
          );
        }
      }
    }
  } else {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ APPLICATION NOT PASSED")
          .setDescription(
            `Your **${category.name}** interview was not passed.\n\n` +
            `Score: **${passed}/${questions.length}**\n\n` +
            `Staff may review this ticket manually.`
          )
          .setColor("#ED4245")
      ]
    });
  }


  // =================================
  // AUTOMATIC TICKET CLOSE
  // =================================

  await new Promise(resolve => setTimeout(resolve, 5000));

  const freshData = load();
  const freshTicket = freshData.tickets[ticketId];

  if (freshTicket) {
    freshTicket.status = "closed";
    freshTicket.closedAt = Date.now();
    save(freshData);
  }

  await channel.permissionOverwrites.edit(user.id, {
    ViewChannel: true,
    SendMessages: false,
    ReadMessageHistory: true
  }).catch(() => {});

  await channel.send(
    `🔒 <@${user.id}> This ticket has been automatically closed after the interview.`
  ).catch(() => {});

}



async function handleInteraction(interaction) {

  // =================================
  // CLOSE TICKET BUTTON
  // =================================

  if (interaction.isButton()) {
    if (!interaction.customId.startsWith("ticket_close_")) {
      return false;
    }

    const ticketId = interaction.customId.replace("ticket_close_", "");
    const data = load();
    ensure(data);

    const ticket = data.tickets[ticketId];

    if (!ticket) {
      await interaction.reply({
        content: "❌ Ticket record not found.",
        ephemeral: true
      });
      return true;
    }

    if (ticket.closed === true || ticket.status === "closed") {
      await interaction.reply({
        content: "🔒 This ticket is already closed.",
        ephemeral: true
      });
      return true;
    }

    ticket.closed = true;
    ticket.status = "closed";
    ticket.closedAt = Date.now();
    save(data);

    // Lock the ticket creator
    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: true,
      SendMessages: false,
      ReadMessageHistory: true
    }).catch(() => {});

    // Disable close button
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_close_${ticketId}`)
        .setLabel("Ticket Closed")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await interaction.update({
      components: [disabledRow]
    }).catch(async () => {
      await interaction.reply({
        content: "🔒 Ticket closed.",
        ephemeral: true
      });
    });

    await interaction.channel.send(
      `🔒 <@${ticket.userId}> This ticket has been closed.`
    ).catch(() => {});

    return true;
  }

  // =================================
  // TICKET CATEGORY SELECT
  // =================================

  if (!interaction.isStringSelectMenu()) return false;

  if (interaction.customId !== "ticket_category_select") {
    return false;
  }

  const data = load();
  ensure(data);

  const category = data.categories[interaction.values[0]];

  if (!category) {
    await interaction.reply({
      content: "❌ Ticket category no longer exists.",
      ephemeral: true
    });
    return true;
  }

  await createTicket(interaction, category);
  return true;
}

module.exports = {
  handleCommand,
  handleInteraction,
  createTicket,
  runInterview
};
