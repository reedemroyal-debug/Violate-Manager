const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const {
  sendLog,
  sendDM
} = require("../utils/modLogger");

const data =
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
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
    );

module.exports = {
  data,

  execute: async interaction => {
    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.BanMembers
      )
    ) {
      return interaction.reply({
        content:
          "❌ You need Ban Members.",
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
      ) || "No reason";

    try {
      await interaction.guild.members.ban(
        user.id,
        { reason }
      );

      await sendLog({
        guild: interaction.guild,
        type: "ban",
        title: "🔨 Member Banned",
        action: "Ban",
        target: user,
        moderator: interaction.user,
        reason
      });

      await sendDM({
        guild: interaction.guild,
        target: user,
        action: "🔨 Banned",
        moderator: interaction.user,
        reason
      });

      await interaction.reply(
        `🔨 Banned ${user.tag}.`
      );
    } catch (error) {
      await interaction.reply({
        content:
          `❌ ${error.message}`,
        ephemeral: true
      });
    }
  }
};
