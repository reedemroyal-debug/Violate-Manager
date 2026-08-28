const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock or unlock the current channel")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels
    )
    .addSubcommand(sub =>
      sub
        .setName("lock")
        .setDescription("Lock this channel")
        .addStringOption(option =>
          option
            .setName("reason")
            .setDescription("Reason for locking")
            .setRequired(false)
            .setMaxLength(500)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("unlock")
        .setDescription("Unlock this channel")
        .addStringOption(option =>
          option
            .setName("reason")
            .setDescription("Reason for unlocking")
            .setRequired(false)
            .setMaxLength(500)
        )
    ),

  async execute(interaction) {
    const action =
      interaction.options.getSubcommand();

    const reason =
      interaction.options.getString("reason") ||
      (action === "lock"
        ? "Channel locked"
        : "Channel unlocked");

    const everyone =
      interaction.guild.roles.everyone;

    const botMember =
      interaction.guild.members.me;

    if (!botMember) {
      return interaction.reply({
        content: "❌ I couldn't find my server member.",
        ephemeral: true
      });
    }

    if (
      !interaction.channel
        .permissionsFor(botMember)
        .has(PermissionFlagsBits.ManageChannels)
    ) {
      return interaction.reply({
        content:
          "❌ I need **Manage Channels** permission here.",
        ephemeral: true
      });
    }

    try {
      if (action === "lock") {
        await interaction.channel.permissionOverwrites.edit(
          everyone,
          {
            SendMessages: false
          },
          { reason }
        );

        await interaction.reply(
          `🔒 **${interaction.channel.name}** has been locked.\n📝 Reason: **${reason}**`
        );
      } else {
        await interaction.channel.permissionOverwrites.edit(
          everyone,
          {
            SendMessages: null
          },
          { reason }
        );

        await interaction.reply(
          `🔓 **${interaction.channel.name}** has been unlocked.\n📝 Reason: **${reason}**`
        );
      }
    } catch (error) {
      console.error(
        "❌ Lock Error:",
        error
      );

      await interaction.reply({
        content:
          "❌ Failed to change the channel lock status.",
        ephemeral: true
      });
    }
  }
};
