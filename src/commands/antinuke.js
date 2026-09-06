const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const {
  getConfig,
  updateConfig
} = require("../automod/config");

const RULES = {
  channelDelete: ["🗑️", "Channel Delete", 3, 10000],
  channelCreate: ["📁", "Channel Create", 5, 10000],
  roleDelete: ["🗑️", "Role Delete", 3, 10000],
  roleCreate: ["🏷️", "Role Create", 5, 10000],
  ban: ["🔨", "Mass Ban", 3, 10000],
  kick: ["👢", "Mass Kick", 5, 10000],
  webhookCreate: ["🪝", "Webhook Create", 3, 10000]
};

function ensure(config) {
  config.antiNuke ??= {};
  const n = config.antiNuke;

  n.enabled ??= true;
  n.trustedUsers ??= [];
  n.trustedRoles ??= [];

  for (const [key, [, , maxActions, interval]] of Object.entries(RULES)) {
    n[key] ??= {};
    n[key].enabled ??= true;
    n[key].maxActions ??= maxActions;
    n[key].interval ??= interval;
  }

  n.punishment ??= {};
  n.punishment.timeout ??= true;
  n.punishment.timeoutMinutes ??= 30;
  n.punishment.kick ??= false;
  n.punishment.ban ??= true;

  n.logChannel ??= "";
}

function on(v) {
  return v ? "🟢 ON" : "🔴 OFF";
}

function punishmentText(p) {
  const x = [];

  if (p.timeout) x.push(`⏱️ Timeout ${p.timeoutMinutes || 30}m`);
  if (p.kick) x.push("👢 Kick");
  if (p.ban) x.push("🔨 Ban");

  return x.length ? x.join(" + ") : "None";
}

function panel(config) {
  ensure(config);
  const n = config.antiNuke;

  const rules = Object.entries(RULES)
    .map(([key, [emoji, label]]) => {
      const r = n[key];
      return `${emoji} **${label}** — ${on(r.enabled)} • \`${r.maxActions}/${r.interval / 1000}s\``;
    })
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🚨 VIOLATE MANAGER • ANTINUKE")
    .setDescription(
      `**Protection:** ${on(n.enabled)}\n\n` +
      `**Security Rules**\n${rules}\n\n` +
      `**Punishment:** ${punishmentText(n.punishment)}\n` +
      `🛡️ Trusted Users: **${n.trustedUsers.length}**\n` +
      `🏷️ Trusted Roles: **${n.trustedRoles.length}**\n` +
      `📜 Log Channel: ${n.logChannel ? `<#${n.logChannel}>` : "Not configured"}`
    )
    .setColor(n.enabled ? "#ED4245" : "#5865F2")
    .setFooter({ text: "VIOLATE MANAGER • AntiNuke Setup" });

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("antinuke_toggle")
          .setLabel(n.enabled ? "Disable" : "Enable")
          .setEmoji(n.enabled ? "🔴" : "🟢")
          .setStyle(n.enabled ? ButtonStyle.Danger : ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("antinuke_rules")
          .setLabel("Rules")
          .setEmoji("⚙️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("antinuke_punishments")
          .setLabel("Punishments")
          .setEmoji("⚖️")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("antinuke_whitelist")
          .setLabel("Whitelist")
          .setEmoji("🛡️")
          .setStyle(ButtonStyle.Secondary)
      ),

      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("antinuke_thresholds")
          .setLabel("Thresholds")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("antinuke_logs")
          .setLabel("Logs")
          .setEmoji("📜")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("antinuke_refresh")
          .setLabel("Refresh")
          .setEmoji("🔄")
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

function rulesPanel(config) {
  ensure(config);
  const n = config.antiNuke;

  const menu = new StringSelectMenuBuilder()
    .setCustomId("antinuke_rule_select")
    .setPlaceholder("Select an AntiNuke rule")
    .addOptions(
      Object.entries(RULES).map(([key, [emoji, label]]) => ({
        label,
        value: key,
        emoji,
        description: n[key].enabled ? "Currently enabled" : "Currently disabled"
      }))
    );

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("⚙️ AntiNuke Rules")
        .setDescription(
          "Select a rule to enable/disable it and configure its threshold."
        )
        .setColor("#5865F2")
    ],
    components: [
      new ActionRowBuilder().addComponents(menu),
      backButton("antinuke_back")
    ]
  };
}

function rulePanel(config, key) {
  const n = config.antiNuke;
  const [emoji, label] = RULES[key];
  const r = n[key];

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`${emoji} ${label}`)
        .setDescription(
          `**Status:** ${on(r.enabled)}\n` +
          `**Threshold:** ${r.maxActions} actions\n` +
          `**Window:** ${r.interval / 1000} seconds\n\n` +
          "Configure this rule below."
        )
        .setColor(r.enabled ? "#57F287" : "#ED4245")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`antinuke_rule_toggle_${key}`)
          .setLabel(r.enabled ? "Disable Rule" : "Enable Rule")
          .setStyle(r.enabled ? ButtonStyle.Danger : ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`antinuke_rule_config_${key}`)
          .setLabel("Threshold")
          .setEmoji("📊")
          .setStyle(ButtonStyle.Primary)
      ),
      backButton("antinuke_rules_back")
    ]
  };
}

function punishmentPanel(config) {
  ensure(config);
  const p = config.antiNuke.punishment;

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("⚖️ AntiNuke Punishments")
        .setDescription(
          `⏱️ Timeout: **${on(p.timeout)}** — ${p.timeoutMinutes} min\n` +
          `👢 Kick: **${on(p.kick)}**\n` +
          `🔨 Ban: **${on(p.ban)}**\n\n` +
          "These actions are applied when an AntiNuke rule reaches its threshold."
        )
        .setColor("#5865F2")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("antinuke_punish_timeout")
          .setLabel("Timeout")
          .setEmoji("⏱️")
          .setStyle(p.timeout ? ButtonStyle.Success : ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("antinuke_punish_kick")
          .setLabel("Kick")
          .setEmoji("👢")
          .setStyle(p.kick ? ButtonStyle.Success : ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("antinuke_punish_ban")
          .setLabel("Ban")
          .setEmoji("🔨")
          .setStyle(p.ban ? ButtonStyle.Success : ButtonStyle.Secondary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("antinuke_punish_timeout_time")
          .setLabel("Timeout Duration")
          .setEmoji("🕐")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("antinuke_punishments_back")
          .setLabel("Back")
          .setEmoji("↩️")
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

function whitelistPanel(config) {
  ensure(config);
  const n = config.antiNuke;

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("🛡️ AntiNuke Whitelist")
        .setDescription(
          `**Trusted Users:** ${n.trustedUsers.length}\n` +
          `**Trusted Roles:** ${n.trustedRoles.length}\n\n` +
          "Trusted users/roles will be ignored by AntiNuke."
        )
        .setColor("#5865F2")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("antinuke_whitelist_user")
          .setLabel("Add User")
          .setEmoji("👤")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("antinuke_whitelist_role")
          .setLabel("Add Role")
          .setEmoji("🏷️")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("antinuke_whitelist_clear")
          .setLabel("Clear")
          .setEmoji("🗑️")
          .setStyle(ButtonStyle.Danger)
      ),
      backButton("antinuke_whitelist_back")
    ]
  };
}

function thresholdModal(key) {
  const [, label] = RULES[key];

  return new ModalBuilder()
    .setCustomId(`antinuke_threshold_modal_${key}`)
    .setTitle(`📊 ${label}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("maxActions")
          .setLabel("Maximum actions")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(String(RULES[key][2]))
          .setMinLength(1)
          .setMaxLength(3)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("interval")
          .setLabel("Time window in seconds")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(String(RULES[key][3] / 1000))
          .setMaxLength(5)
      )
    );
}

function timeoutModal(config) {
  ensure(config);

  return new ModalBuilder()
    .setCustomId("antinuke_timeout_modal")
    .setTitle("⏱️ Timeout Duration")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("minutes")
          .setLabel("Timeout duration in minutes")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(String(config.antiNuke.punishment.timeoutMinutes))
          .setMaxLength(5)
      )
    );
}

function backButton(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(id)
      .setLabel("Back")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Configure AntiNuke")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString())
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Open AntiNuke setup panel")
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ Administrator permission required.",
        ephemeral: true
      });
    }

    const config = getConfig(interaction.guild.id);
    ensure(config);
    updateConfig(interaction.guild.id, config);

    return interaction.reply({
      ...panel(config),
      ephemeral: true
    });
  },

  async handle(interaction) {
    if (!interaction.customId?.startsWith("antinuke_")) {
      return false;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Administrator permission required.",
          ephemeral: true
        });
      }
      return true;
    }

    const guildId = interaction.guild.id;
    const config = getConfig(guildId);
    ensure(config);
    const id = interaction.customId;

    if (id === "antinuke_toggle") {
      config.antiNuke.enabled = !config.antiNuke.enabled;
      updateConfig(guildId, config);
      return interaction.update(panel(config));
    }

    if (id === "antinuke_refresh") {
      return interaction.update(panel(config));
    }

    if (id === "antinuke_rules") {
      return interaction.update(rulesPanel(config));
    }

    if (id === "antinuke_back") {
      return interaction.update(panel(config));
    }

    if (id === "antinuke_rules_back") {
      return interaction.update(rulesPanel(config));
    }

    if (id === "antinuke_punishments") {
      return interaction.update(punishmentPanel(config));
    }

    if (id === "antinuke_punishments_back") {
      return interaction.update(panel(config));
    }

    if (id === "antinuke_whitelist") {
      return interaction.update(whitelistPanel(config));
    }

    if (id === "antinuke_whitelist_back") {
      return interaction.update(panel(config));
    }

    if (id === "antinuke_thresholds") {
      return interaction.update(rulesPanel(config));
    }

    if (id.startsWith("antinuke_rule_toggle_")) {
      const key = id.replace("antinuke_rule_toggle_", "");

      if (!RULES[key]) return true;

      config.antiNuke[key].enabled =
        !config.antiNuke[key].enabled;

      updateConfig(guildId, config);

      return interaction.update(rulePanel(config, key));
    }

    if (id.startsWith("antinuke_rule_config_")) {
      const key = id.replace("antinuke_rule_config_", "");

      if (!RULES[key]) return true;

      return interaction.showModal(
        thresholdModal(key)
      );
    }

    if (id === "antinuke_punish_timeout") {
      config.antiNuke.punishment.timeout =
        !config.antiNuke.punishment.timeout;

      updateConfig(guildId, config);
      return interaction.update(punishmentPanel(config));
    }

    if (id === "antinuke_punish_kick") {
      config.antiNuke.punishment.kick =
        !config.antiNuke.punishment.kick;

      updateConfig(guildId, config);
      return interaction.update(punishmentPanel(config));
    }

    if (id === "antinuke_punish_ban") {
      config.antiNuke.punishment.ban =
        !config.antiNuke.punishment.ban;

      updateConfig(guildId, config);
      return interaction.update(punishmentPanel(config));
    }

    if (id === "antinuke_punish_timeout_time") {
      return interaction.showModal(
        timeoutModal(config)
      );
    }

    if (id === "antinuke_whitelist_user") {
      return interaction.reply({
        content: "👤 Select a user to trust:",
        components: [
          new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
              .setCustomId("antinuke_select_user")
              .setPlaceholder("Select trusted user")
              .setMinValues(1)
              .setMaxValues(1)
          )
        ],
        ephemeral: true
      });
    }

    if (id === "antinuke_whitelist_role") {
      return interaction.reply({
        content: "🏷️ Select a role to trust:",
        components: [
          new ActionRowBuilder().addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId("antinuke_select_role")
              .setPlaceholder("Select trusted role")
              .setMinValues(1)
              .setMaxValues(1)
          )
        ],
        ephemeral: true
      });
    }

    if (id === "antinuke_whitelist_clear") {
      config.antiNuke.trustedUsers = [];
      config.antiNuke.trustedRoles = [];

      updateConfig(guildId, config);

      return interaction.update(whitelistPanel(config));
    }

    if (id === "antinuke_select_user") {
      const userId = interaction.values?.[0];

      if (!userId) return true;

      if (!config.antiNuke.trustedUsers.includes(userId)) {
        config.antiNuke.trustedUsers.push(userId);
      }

      updateConfig(guildId, config);

      return interaction.update({
        content: `✅ <@${userId}> added to AntiNuke whitelist.`,
        components: []
      });
    }

    if (id === "antinuke_select_role") {
      const roleId = interaction.values?.[0];

      if (!roleId) return true;

      if (!config.antiNuke.trustedRoles.includes(roleId)) {
        config.antiNuke.trustedRoles.push(roleId);
      }

      updateConfig(guildId, config);

      return interaction.update({
        content: `✅ <@&${roleId}> added to AntiNuke whitelist.`,
        components: []
      });
    }

    if (interaction.isStringSelectMenu() && id === "antinuke_rule_select") {
      const key = interaction.values?.[0];

      if (!RULES[key]) return true;

      return interaction.update(rulePanel(config, key));
    }

    if (interaction.isModalSubmit() && id.startsWith("antinuke_threshold_modal_")) {
      const key = id.replace("antinuke_threshold_modal_", "");

      if (!RULES[key]) return true;

      const maxActions = Number(
        interaction.fields.getTextInputValue("maxActions")
      );

      const seconds = Number(
        interaction.fields.getTextInputValue("interval")
      );

      if (
        !Number.isInteger(maxActions) ||
        maxActions < 1 ||
        maxActions > 100 ||
        !Number.isFinite(seconds) ||
        seconds < 1 ||
        seconds > 300
      ) {
        return interaction.reply({
          content: "❌ Invalid threshold values.",
          ephemeral: true
        });
      }

      config.antiNuke[key].maxActions = maxActions;
      config.antiNuke[key].interval = seconds * 1000;

      updateConfig(guildId, config);

      return interaction.reply({
        content: `✅ **${RULES[key][1]}** threshold updated to **${maxActions} actions / ${seconds}s**.`,
        ephemeral: true
      });
    }

    if (interaction.isModalSubmit() && id === "antinuke_timeout_modal") {
      const minutes = Number(
        interaction.fields.getTextInputValue("minutes")
      );

      if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 1440
      ) {
        return interaction.reply({
          content: "❌ Timeout must be between 1 and 1440 minutes.",
          ephemeral: true
        });
      }

      config.antiNuke.punishment.timeoutMinutes = minutes;

      updateConfig(guildId, config);

      return interaction.reply({
        content: `✅ AntiNuke timeout set to **${minutes} minutes**.`,
        ephemeral: true
      });
    }

    return false;
  }
};
