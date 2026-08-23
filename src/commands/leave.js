const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave the voice channel."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue) {
      return interaction.reply({
        content: "❌ Main kisi voice channel mein nahi hoon.",
        ephemeral: true
      });
    }

    queue.delete();

    return interaction.reply(
      "👋 Voice channel se nikal gaya."
    );
  }
};
