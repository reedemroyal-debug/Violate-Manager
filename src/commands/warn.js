const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  sendLog,
  sendDM
} = require("../utils/modLogger");

const {
  load,
  save
} = require("../utils/db");

const data =
  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption(o =>
      o
        .setName("user")
        .setDescription("Member")
        .setRequired(true)
    )
    .addStringOption(o =>
      o
        .setName("reason")
        .setDescription("Reason")
        .setRequired(true)
    );

module.exports = {
  data,

  execute: async interaction => {
    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ModerateMembers
      )
    ) {
      return interaction.reply({
        content:
          "❌ You need Moderate Members.",
        ephemeral: true
      });
    }

    const user =
      interaction.options.getUser(
        "user"
      );

    const reason =
      interaction.options.getString(
        "reason"
      );

    const db = load();

    db.warnings[user.id] ??= [];

    db.warnings[user.id].push({
      guild: interaction.guild.id,
      by: interaction.user.id,
      reason,
      time: Date.now()
    });

    save(db);

    await sendLog({
      guild: interaction.guild,
      type: "warn",
      title: "⚠️ Member Warned",
      action: "Warning",
      target: user,
      moderator: interaction.user,
      reason
    });

    await sendDM({
      guild: interaction.guild,
      target: user,
      action: "⚠️ Warned",
      moderator: interaction.user,
      reason
    });

    await interaction.reply(
      `⚠️ Warned ${user.tag}. Reason: ${reason}`
    );
  }
};
