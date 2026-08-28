const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removetimeout")
    .setDescription("Remove a member's timeout")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member whose timeout should be removed")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for removing the timeout")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    const user =
      interaction.options.getUser("user");

    const reason =
      interaction.options.getString("reason") ||
      "Timeout removed";

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return interaction.reply({
        content:
          "❌ That user isn't in this server.",
        ephemeral: true
      });
    }

    if (!member.communicationDisabledUntilTimestamp) {
      return interaction.reply({
        content:
          "❌ That member is not currently timed out.",
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content:
          "❌ I can't modify this member. Check my role position and permissions.",
        ephemeral: true
      });
    }

    try {
      await member.timeout(null, reason);

      await interaction.reply(
        `🔊 Timeout removed from **${member.user.tag}**.\n` +
        `📝 Reason: **${reason}**`
      );
    } catch (error) {
      console.error(
        "❌ Remove Timeout Error:",
        error
      );

      await interaction.reply({
        content:
          "❌ Failed to remove the timeout.",
        ephemeral: true
      });
    }
  }
};
