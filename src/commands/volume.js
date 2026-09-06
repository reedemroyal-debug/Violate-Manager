const {
  SlashCommandBuilder
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set music volume.")
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Volume 1-100")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

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

    const amount =
      interaction.options.getInteger("amount");

    queue.node.setVolume(amount);

    return interaction.reply(
      `🔊 Volume set to **${amount}%**.`
    );
  }
};
