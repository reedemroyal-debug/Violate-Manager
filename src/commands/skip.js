const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip the current song."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue) {
      return interaction.reply({
        content: "❌ Queue empty hai.",
        ephemeral: true
      });
    }

    try {
      await queue.node.skip();

      return interaction.reply(
        "⏭️ Skipped."
      );

    } catch (error) {
      return interaction.reply({
        content:
          `❌ Skip failed: ${error.message}`,
        ephemeral: true
      });
    }
  }
};
