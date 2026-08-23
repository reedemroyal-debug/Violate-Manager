const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer.nodes.get(
        interaction.guild.id
      );

    if (!queue || !queue.currentTrack) {
      return interaction.reply({
        content: "📭 Queue empty hai.",
        ephemeral: true
      });
    }

    const tracks =
      queue.tracks.toArray();

    const current =
      queue.currentTrack;

    let text =
      `🎵 **Now Playing:** ${current.title}\n\n`;

    if (!tracks.length) {
      text += "📭 No more songs in queue.";
    } else {
      text += tracks
        .slice(0, 10)
        .map(
          (track, index) =>
            `**${index + 1}.** ${track.title}`
        )
        .join("\n");
    }

    return interaction.reply(text);
  }
};
