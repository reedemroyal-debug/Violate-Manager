const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play music")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("Song name or URL")
        .setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: "❌ Pehle voice channel join kar bhai.",
        ephemeral: true
      });
    }

    const query = interaction.options.getString("query");

    await interaction.deferReply();

    try {
      const player = interaction.client.musicPlayer;

      if (!player) {
        return interaction.editReply(
          "❌ Music player initialize nahi hua."
        );
      }

      await player.play(voiceChannel, query, {
        nodeOptions: {
          metadata: interaction
        }
      });

      const embed = new EmbedBuilder()
        .setTitle("🎵 VIOLATE MUSIC")
        .setDescription(
          `**🎶 ${query}**\n\n` +
          `👤 Requested by: ${interaction.user}\n\n` +
          `Use the controls below to control the music.`
        )
        .setFooter({
          text: "VIOLATE MANAGER • Music System"
        });

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("music_pause")
          .setEmoji("⏯️")
          .setLabel("Pause")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("music_skip")
          .setEmoji("⏭️")
          .setLabel("Skip")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("music_stop")
          .setEmoji("⏹️")
          .setLabel("Stop")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("music_loop")
          .setEmoji("🔁")
          .setLabel("Loop")
          .setStyle(ButtonStyle.Secondary)
      );

      const extra = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("music_queue")
          .setEmoji("📜")
          .setLabel("Queue")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("music_shuffle")
          .setEmoji("🔀")
          .setLabel("Shuffle")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.editReply({
        embeds: [embed],
        components: [
          controls,
          extra
        ]
      });

    } catch (error) {
      console.error("❌ Play error:", error);

      return interaction.editReply(
        `❌ Music play nahi hua.\n\`${error.message}\``
      );
    }
  }
};
