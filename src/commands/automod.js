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

function buildPanel(config) {
  const embed = new EmbedBuilder()
    .setTitle("🛡️ VIOLATE AUTOMOD")
    .setDescription(
      `**Global Status:** ${status(config.enabled)}\n\n` +
      `💬 Anti-Spam: **${status(config.antiSpam.enabled)}** → ${punishmentText(config.punishments?.spam)}\n` +
      `🔗 Anti-Link: **${status(config.antiLink.enabled)}** → ${punishmentText(config.punishments?.link)}\n` +
      `📨 Anti-Invite: **${status(config.antiInvite.enabled)}** → ${punishmentText(config.punishments?.invite)}\n` +
      `🤬 Bad Words: **${status(config.wordFilter.enabled)}** → ${punishmentText(config.punishments?.words)}\n` +
      `📢 Anti-Mention: **${status(config.antiMention.enabled)}** → ${punishmentText(config.punishments?.mentions)}\n\n` +
      `⚠️ Escalation after **${config.punishment.violations} violations**\n` +
      `⏱️ Default timeout: **${config.punishment.timeoutMinutes} min**`
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
  config.punishments ??= {};

  config.punishments.spam ??= "warn";
  config.punishments.link ??= "warn";
  config.punishments.invite ??= "warn";
  config.punishments.words ??= "warn";
  config.punishments.mentions ??= "warn";
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
            config.punishments[id]
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

      config.punishments[ruleId] =
        selected;

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
                config.punishments[ruleId]
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
