
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check real bot latency."),

  async execute(interaction) {
    const start = Date.now();

    await interaction.deferReply();

    const apiPing = Date.now() - start;
    const wsPing = interaction.client.ws.ping;

    const wsText =
      Number.isFinite(wsPing) && wsPing >= 0
        ? `${wsPing}ms`
        : "Measuring...";

    return interaction.editReply(
      `🏓 **Pong!**\n` +
      `🌐 API: **${apiPing}ms**\n` +
      `📡 WebSocket: **${wsText}**`
    );
  }
};
