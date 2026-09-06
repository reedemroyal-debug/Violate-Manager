const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Show the currently playing song."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        content: "❌ Kuch play nahi ho raha.",
        ephemeral: true
      });
    }

    const track =
      queue.currentTrack;

    return interaction.reply(
      `🎶 **Now Playing**\n\n🎵 **${track.title}**\n👤 ${track.author || "Unknown"}`
    );
  }
};

