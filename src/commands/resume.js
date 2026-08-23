const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the current song."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue) {
      return interaction.reply({
        content: "❌ Music queue nahi mili.",
        ephemeral: true
      });
    }

    queue.node.setPaused(false);

    return interaction.reply(
      "▶️ Music resumed."
    );
  }
};
