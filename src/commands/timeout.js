const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ModerateMembers
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Member to timeout")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Timeout duration in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for the timeout")
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    const user =
      interaction.options.getUser("user");

    const minutes =
      interaction.options.getInteger("minutes");

    const reason =
      interaction.options.getString("reason") ||
      "No reason provided";

    const member =
      await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

    if (!member) {
      return interaction.reply({
        content: "❌ That user isn't in this server.",
        ephemeral: true
      });
    }

    if (member.id === interaction.user.id) {
      return interaction.reply({
        content: "❌ You can't timeout yourself.",
        ephemeral: true
      });
    }

    if (!member.moderatable) {
      return interaction.reply({
        content:
          "❌ I can't timeout this member. Check my role position and permissions.",
        ephemeral: true
      });
    }

    const duration =
      minutes * 60 * 1000;

    try {
      await member.timeout(
        duration,
        reason
      );

      await interaction.reply(
        `🔇 **${member.user.tag}** has been timed out for **${minutes} minute(s)**.\n` +
        `📝 Reason: **${reason}**`
      );
    } catch (error) {
      console.error(
        "❌ Timeout Error:",
        error
      );

      await interaction.reply({
        content:
          "❌ Failed to timeout that member.",
        ephemeral: true
      });
    }
  }
};
