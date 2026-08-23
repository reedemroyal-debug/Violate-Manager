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
    .setName("kick")
    .setDescription("Kick a member")
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
        PermissionFlagsBits.KickMembers
      )
    ) {
      return interaction.reply({
        content:
          "❌ You need Kick Members.",
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
      await interaction.guild.members.kick(
        user.id,
        reason
      );

      await sendLog({
        guild: interaction.guild,
        type: "kick",
        title: "👢 Member Kicked",
        action: "Kick",
        target: user,
        moderator: interaction.user,
        reason
      });

      await sendDM({
        guild: interaction.guild,
        target: user,
        action: "👢 Kicked",
        moderator: interaction.user,
        reason
      });

      await interaction.reply(
        `👢 Kicked ${user.tag}.`
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
