const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const {
  getConfig,
  updateConfig
} = require("../automod/config");

const RULES = {
  spam: {
    key: "antiSpam",
    label: "Anti-Spam",
    emoji: "💬"
  },
  link: {
    key: "antiLink",
    label: "Anti-Link",
    emoji: "🔗"
  },
  invite: {
    key: "antiInvite",
    label: "Anti-Invite",
    emoji: "📨"
  },
  words: {
    key: "wordFilter",
    label: "Bad Words",
    emoji: "🤬"
  },
  mentions: {
    key: "antiMention",
    label: "Anti-Mention",
    emoji: "📢"
  }
};

function status(value) {
  return value ? "🟢 ON" : "🔴 OFF";
}

function punishmentText(value) {
  const names = {
    warn: "⚠️ Warn",
    timeout: "⏱️ Timeout",
    kick: "👢 Kick",
    ban: "🔨 Ban"
  };

  return names[value] || "⚠️ Warn";
}

function getAction(punishment) {
  if (!punishment) return "warn";

  if (punishment.ban) return "ban";
  if (punishment.kick) return "kick";
  if (punishment.timeout) return "timeout";
  if (punishment.warn) return "warn";

  return "warn";
}

function buildPanel(config) {
  const embed = new EmbedBuilder()
    .setTitle("🛡️ VIOLATE AUTOMOD")
    .setDescription(
      `**Global Status:** ${status(config.enabled)}\n\n` +
      `💬 Anti-Spam: **${status(config.antiSpam.enabled)}** → ${punishmentText(getAction(config.antiSpam?.punishment))}\n` +
      `🔗 Anti-Link: **${status(config.antiLink.enabled)}** → ${punishmentText(getAction(config.antiLink?.punishment))}\n` +
      `📨 Anti-Invite: **${status(config.antiInvite.enabled)}** → ${punishmentText(getAction(config.antiInvite?.punishment))}\n` +
      `🤬 Bad Words: **${status(config.wordFilter.enabled)}** → ${punishmentText(getAction(config.wordFilter?.punishment))}\n` +
      `📢 Anti-Mention: **${status(config.antiMention.enabled)}** → ${punishmentText(getAction(config.antiMention?.punishment))}\n\n` +
      `⚠️ Escalation after **${config.antiSpam?.punishment?.violations ?? 3} violations**\n` +
      `⏱️ Default timeout: **${config.antiSpam?.punishment?.timeoutMinutes ?? 5} min**`
    )
    .setColor(config.enabled ? "#57F287" : "#ED4245")
    .setFooter({
      text: "VIOLATE MANAGER • AutoMod"
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("automod_toggle")
      .setLabel(config.enabled ? "Disable" : "Enable")
      .setEmoji(config.enabled ? "🔴" : "🟢")
      .setStyle(
        config.enabled
          ? ButtonStyle.Danger
          : ButtonStyle.Success
      ),

    new ButtonBuilder()
      .setCustomId("automod_spam")
      .setLabel("Anti-Spam")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("automod_links")
      .setLabel("Links")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("automod_words")
      .setLabel("Words")
      .setEmoji("🤬")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("automod_mentions")
      .setLabel("Mentions")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("automod_punishment")
      .setLabel("Punishments")
      .setEmoji("⚖️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("automod_bypass")
      .setLabel("Bypass")
      .setEmoji("👮")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("automod_thresholds")
      .setLabel("Thresholds")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("automod_refresh")
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2]
  };
}

function ensurePunishments(config) {
  const defaults = {
    warn: true,
    timeout: false,
    kick: false,
    ban: false,
    timeoutMinutes: 5,
    violations: 3
  };

  for (const rule of Object.values(RULES)) {
    config[rule.key] ??= {};
    config[rule.key].punishment ??= { ...defaults };
  }
}

function punishmentMenu(config) {
  ensurePunishments(config);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("automod_punishment_select")
    .setPlaceholder("Select a rule")
    .addOptions(
      Object.entries(RULES).map(
        ([id, rule]) => ({
          label: rule.label,
          description: `Current: ${punishmentText(
            getAction(config[RULES[id].key]?.punishment)
          )}`,
          value: id,
          emoji: rule.emoji
        })
      )
    );

  return new ActionRowBuilder().addComponents(menu);
}

function punishmentActionMenu(ruleId) {
  const rule = RULES[ruleId];

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`automod_action_${ruleId}`)
    .setPlaceholder(
      `Choose punishment for ${rule.label}`
    )
    .addOptions(
      {
        label: "Warn",
        description: "Issue a warning",
        value: "warn",
        emoji: "⚠️"
      },
      {
        label: "Timeout",
        description: "Temporarily timeout member",
        value: "timeout",
        emoji: "⏱️"
      },
      {
        label: "Kick",
        description: "Kick the member",
        value: "kick",
        emoji: "👢"
      },
      {
        label: "Ban",
        description: "Ban the member",
        value: "ban",
        emoji: "🔨"
      }
    );

  return new ActionRowBuilder().addComponents(menu);
}

function thresholdPanel(config) {
  const embed = new EmbedBuilder()
    .setTitle("⚙️ AutoMod Thresholds")
    .setDescription(
      `💬 **Anti-Spam**\n` +
      `Messages: **${config.antiSpam?.maxMessages ?? 5}**\n` +
      `Interval: **${config.antiSpam?.interval ?? 5000}ms**\n\n` +
      `📢 **Anti-Mention**\n` +
      `Maximum mentions: **${config.antiMention?.maxMentions ?? 5}**\n\n` +
      `Use the buttons below to change the limits.`
    )
    .setColor("#5865F2");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("automod_spam_threshold")
      .setLabel("Spam Settings")
      .setEmoji("💬")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("automod_mention_threshold")
      .setLabel("Mention Limit")
      .setEmoji("📢")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("automod_threshold_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

function spamThresholdModal(config) {
  return new ModalBuilder()
    .setCustomId("automod_spam_threshold_modal")
    .setTitle("💬 Anti-Spam Settings")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("maxMessages")
          .setLabel("Maximum messages")
          .setPlaceholder(String(config.antiSpam?.maxMessages ?? 5))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(4)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("interval")
          .setLabel("Interval in milliseconds")
          .setPlaceholder(String(config.antiSpam?.interval ?? 5000))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(7)
      )
    );
}

function mentionThresholdModal(config) {
  return new ModalBuilder()
    .setCustomId("automod_mention_threshold_modal")
    .setTitle("📢 Mention Limit")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("maxMentions")
          .setLabel("Maximum mentions")
          .setPlaceholder(String(config.antiMention?.maxMentions ?? 5))
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(3)
      )
    );
}

function wordsPanel(config) {
  const words = config.wordFilter.words || [];

  const shown =
    words.length
      ? words
          .slice(0, 30)
          .map((word, index) => `\`${index + 1}.\` ${word}`)
          .join("\n")
      : "📭 No bad words configured.";

  const embed = new EmbedBuilder()
    .setTitle("🤬 Bad Words Filter")
    .setDescription(
      `**Status:** ${status(config.wordFilter.enabled)}\n\n` +
      `**Blocked Words:**\n${shown}\n\n` +
      `Total: **${words.length}**`
    )
    .setColor("#ED4245")
    .setFooter({
      text: "VIOLATE MANAGER • Word Filter"
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("automod_words_toggle")
      .setLabel(
        config.wordFilter.enabled
          ? "Disable Filter"
          : "Enable Filter"
      )
      .setEmoji(
        config.wordFilter.enabled
          ? "🔴"
          : "🟢"
      )
      .setStyle(
        config.wordFilter.enabled
          ? ButtonStyle.Danger
          : ButtonStyle.Success
      ),

    new ButtonBuilder()
      .setCustomId("automod_words_add")
      .setLabel("Add Words")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("automod_words_clear")
      .setLabel("Clear All")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("automod_words_back")
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

function wordsModal() {
  return new ModalBuilder()
    .setCustomId("automod_words_modal")
    .setTitle("🤬 Add Bad Words")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("words")
          .setLabel("Add your bad words here")
          .setPlaceholder(
            "word1, word2, word3"
          )
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Manage AutoMod")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Open AutoMod setup")
    ),

  async execute(interaction) {
    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return interaction.reply({
        content: "❌ Manage Server required.",
        ephemeral: true
      });
    }

    const config =
      getConfig(interaction.guild.id);

    ensurePunishments(config);
    updateConfig(
      interaction.guild.id,
      config
    );

    return interaction.reply({
      ...buildPanel(config),
      ephemeral: true
    });
  },

  async handle(interaction) {
    if (
      !interaction.customId?.startsWith(
        "automod_"
      )
    ) {
      return false;
    }

    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      await interaction.reply({
        content: "❌ Manage Server required.",
        ephemeral: true
      });

      return true;
    }

    const guildId =
      interaction.guild.id;

    const config =
      getConfig(guildId);

    ensurePunishments(config);

    const id =
      interaction.customId;

    if (id === "automod_toggle") {
      config.enabled = !config.enabled;
    }

    else if (id === "automod_spam") {
      config.antiSpam.enabled =
        !config.antiSpam.enabled;
    }

    else if (id === "automod_links") {
      config.antiLink.enabled =
        !config.antiLink.enabled;
    }

    else if (id === "automod_words") {
      return interaction.update(
        wordsPanel(config)
      );
    }

    else if (id === "automod_mentions") {
      config.antiMention.enabled =
        !config.antiMention.enabled;
    }

    else if (id === "automod_words_toggle") {
      config.wordFilter.enabled =
        !config.wordFilter.enabled;

      updateConfig(
        guildId,
        config
      );

      return interaction.update(
        wordsPanel(config)
      );
    }

    else if (id === "automod_words_add") {
      return interaction.showModal(
        wordsModal()
      );
    }

    else if (id === "automod_words_clear") {
      config.wordFilter.words = [];

      updateConfig(
        guildId,
        config
      );

      return interaction.update(
        wordsPanel(config)
      );
    }

    else if (id === "automod_words_back") {
      return interaction.update(
        buildPanel(config)
      );
    }

    else if (id === "automod_punishment") {
      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚖️ AutoMod Punishments")
            .setDescription(
              "Select a rule below to configure its punishment."
            )
            .setColor("#5865F2")
        ],
        components: [
          punishmentMenu(config),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                "automod_punishment_back"
              )
              .setLabel("Back")
              .setEmoji("↩️")
              .setStyle(
                ButtonStyle.Secondary
              )
          )
        ]
      });
    }

    else if (
      id === "automod_punishment_back"
    ) {
      return interaction.update(
        buildPanel(config)
      );
    }

    else if (id === "automod_thresholds") {
      return interaction.update(
        thresholdPanel(config)
      );
    }

    else if (id === "automod_threshold_back") {
      return interaction.update(
        buildPanel(config)
      );
    }

    else if (id === "automod_spam_threshold") {
      return interaction.showModal(
        spamThresholdModal(config)
      );
    }

    else if (id === "automod_mention_threshold") {
      return interaction.showModal(
        mentionThresholdModal(config)
      );
    }

    else if (id === "automod_spam_threshold_modal") {
      const maxMessages = Number(
        interaction.fields.getTextInputValue("maxMessages")
      );
      const interval = Number(
        interaction.fields.getTextInputValue("interval")
      );

      if (
        !Number.isInteger(maxMessages) ||
        maxMessages < 2 ||
        maxMessages > 100 ||
        !Number.isInteger(interval) ||
        interval < 1000 ||
        interval > 60000
      ) {
        return interaction.reply({
          content: "❌ Use messages 2-100 and interval 1000-60000 ms.",
          ephemeral: true
        });
      }

      config.antiSpam.maxMessages = maxMessages;
      config.antiSpam.interval = interval;

      updateConfig(guildId, config);

      return interaction.reply({
        content: `✅ Anti-Spam updated: **${maxMessages} messages / ${interval}ms**.`,
        ephemeral: true
      });
    }

    else if (id === "automod_mention_threshold_modal") {
      const maxMentions = Number(
        interaction.fields.getTextInputValue("maxMentions")
      );

      if (
        !Number.isInteger(maxMentions) ||
        maxMentions < 1 ||
        maxMentions > 50
      ) {
        return interaction.reply({
          content: "❌ Mention limit must be between 1 and 50.",
          ephemeral: true
        });
      }

      config.antiMention.maxMentions = maxMentions;

      updateConfig(guildId, config);

      return interaction.reply({
        content: `✅ Mention limit updated to **${maxMentions}**.`,
        ephemeral: true
      });
    }

    else if (
      id === "automod_refresh"
    ) {
      return interaction.update(
        buildPanel(config)
      );
    }

    else if (
      id === "automod_bypass"
    ) {
      return interaction.reply({
        content:
          "👮 Bypass system ko next stage mein configure karenge.",
        ephemeral: true
      });
    }

    else if (
      id === "automod_words_modal"
    ) {
      return true;
    }

    else if (
      id.startsWith(
        "automod_action_"
      )
    ) {
      const ruleId =
        id.replace(
          "automod_action_",
          ""
        );

      const selected =
        interaction.values?.[0];

      if (
        !RULES[ruleId] ||
        !selected
      ) {
        return interaction.reply({
          content:
            "❌ Invalid punishment selection.",
          ephemeral: true
        });
      }

      const ruleKey = RULES[ruleId].key;
      const punishment = config[ruleKey].punishment;

      punishment.warn = selected === "warn";
      punishment.timeout = selected === "timeout";
      punishment.kick = selected === "kick";
      punishment.ban = selected === "ban";

      updateConfig(
        guildId,
        config
      );

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${RULES[ruleId].emoji} ${RULES[ruleId].label}`
            )
            .setDescription(
              `Punishment set to **${punishmentText(
                selected
              )}**.`
            )
            .setColor("#57F287")
        ],
        components: [
          punishmentMenu(config),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                "automod_punishment_back"
              )
              .setLabel("Back")
              .setEmoji("↩️")
              .setStyle(
                ButtonStyle.Secondary
              )
          )
        ]
      });
    }

    else if (
      id === "automod_punishment_select"
    ) {
      const ruleId =
        interaction.values?.[0];

      if (!RULES[ruleId]) {
        return interaction.reply({
          content: "❌ Invalid rule.",
          ephemeral: true
        });
      }

      return interaction.update({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `${RULES[ruleId].emoji} ${RULES[ruleId].label} Punishment`
            )
            .setDescription(
              `Current punishment: **${punishmentText(
                config[RULES[ruleId].key]?.punishment
              )}**\n\nChoose what should happen when this rule is triggered.`
            )
            .setColor("#5865F2")
        ],
        components: [
          punishmentActionMenu(ruleId),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(
                "automod_punishment_back"
              )
              .setLabel("Back")
              .setEmoji("↩️")
              .setStyle(
                ButtonStyle.Secondary
              )
          )
        ]
      });
    }

    else {
      return false;
    }

    updateConfig(
      guildId,
      config
    );

    return interaction.update(
      buildPanel(config)
    );
  }
};
