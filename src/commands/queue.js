
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current music queue."),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer?.nodes.get(
        interaction.guild.id
      );

    if (!queue?.currentTrack) {
      return interaction.reply({
        content: "📭 Queue empty hai.",
        ephemeral: true
      });
    }

    const tracks = queue.tracks.toArray();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📜 Music Queue")
      .setDescription(
        `🎵 **Now Playing:** ${queue.currentTrack.title}\n\n` +
        (
          tracks.length
            ? tracks.slice(0, 15)
                .map((t, i) => `**${i + 1}.** ${t.title}`)
                .join("\n")
            : "📭 No more songs in queue."
        )
      );

    return interaction.reply({ embeds: [embed] });
  }
};
