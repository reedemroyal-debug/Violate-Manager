const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the current song."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue) {
      return interaction.reply({
        content: "❌ Abhi kuch play nahi ho raha.",
        ephemeral: true
      });
    }

    queue.node.setPaused(true);

    return interaction.reply(
      "⏸️ Music paused."
    );
  }
};
