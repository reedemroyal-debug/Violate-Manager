const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");

const leveling = require("../utils/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the server XP leaderboard"),

  async execute(interaction) {
    const users = leveling.getLeaderboard(
      interaction.guild.id,
      10
    );

    if (!users.length) {
      return interaction.reply("📊 No leveling data yet.");
    }

    const lines = users.map((user, index) => {
      const medals = ["🥇", "🥈", "🥉"];
      const prefix = medals[index] || `**${index + 1}.**`;

      return `${prefix} <@${user.userId}> — Level **${user.level}** • **${user.totalXp} XP**`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x00ffff)
      .setTitle("🏆 VIOLATE XP LEADERBOARD")
      .setDescription(lines.join("\n"))
      .setFooter({
        text: interaction.guild.name
      });

    await interaction.reply({
      embeds: [embed]
    });
  }
};
