const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop music and clear the queue."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue) {
      return interaction.reply({
        content: "❌ Music already stopped.",
        ephemeral: true
      });
    }

    queue.delete();

    return interaction.reply(
      "⏹️ Music stopped and queue cleared."
    );
  }
};
