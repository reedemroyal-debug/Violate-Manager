const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete messages from this channel")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Only delete messages from this user")
        .setRequired(false)
    ),

  async execute(interaction) {
    const amount =
      interaction.options.getInteger("amount");

    const user =
      interaction.options.getUser("user");

    if (!interaction.channel.isTextBased()) {
      return interaction.reply({
        content: "❌ This command can only be used in a text channel.",
        ephemeral: true
      });
    }

    const botMember =
      interaction.guild.members.me;

    if (
      !botMember ||
      !interaction.channel
        .permissionsFor(botMember)
        .has(PermissionFlagsBits.ManageMessages)
    ) {
      return interaction.reply({
        content:
          "❌ I need **Manage Messages** permission in this channel.",
        ephemeral: true
      });
    }

    await interaction.deferReply({
      ephemeral: true
    });

    try {
      const messages =
        await interaction.channel.messages.fetch({
          limit: 100
        });

      let targets =
        [...messages.values()]
          .filter(message =>
            !message.pinned &&
            (!user || message.author.id === user.id)
          )
          .slice(0, amount);

      if (!targets.length) {
        return interaction.editReply(
          "❌ No matching messages found."
        );
      }

      const deleted =
        await interaction.channel.bulkDelete(
          targets,
          true
        );

      await interaction.editReply(
        `🗑️ Successfully deleted **${deleted.size}** message(s)${
          user ? ` from **${user.tag}**` : ""
        }.`
      );
    } catch (error) {
      console.error(
        "❌ Purge Error:",
        error
      );

      await interaction.editReply(
        "❌ Failed to delete the messages. Check my permissions."
      );
    }
  }
};
