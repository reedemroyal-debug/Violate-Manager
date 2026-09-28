
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

function panel(queue) {
  const track = queue?.currentTrack;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎵 VIOLATE MUSIC")
    .setDescription(
      track
        ? `🎧 **Now Playing**\n**${track.title}**\n${track.author || "Unknown Artist"}`
        : "📭 Nothing is playing right now."
    )
    .setFooter({
      text: "VIOLATE MANAGER • Music Control"
    });

  if (track?.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setLabel("Pause / Resume")
      .setEmoji("⏯️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("music_skip")
      .setLabel("Skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("music_stop")
      .setLabel("Stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_shuffle")
      .setLabel("Shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("music_loop")
      .setLabel("Loop")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("music_queue")
      .setLabel("Queue")
      .setEmoji("📜")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_vol_down")
      .setLabel("Volume −")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("music_vol_up")
      .setLabel("Volume +")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3]
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("music")
    .setDescription("Open the VIOLATE music control panel.")
    .addSubcommand(sub =>
      sub
        .setName("panel")
        .setDescription("Open the music control panel.")
    ),

  async execute(interaction) {
    const queue =
      interaction.client.musicPlayer?.nodes.get(
        interaction.guild.id
      );

    return interaction.reply(panel(queue));
  },

  panel
};
