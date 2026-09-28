const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const leveling = require("../utils/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("View your or another user's level")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target =
      interaction.options.getUser("user") || interaction.user;

    const profile = leveling.getProfile(
      interaction.guild.id,
      target.id
    );

    const leaderboard = leveling.getLeaderboard(
      interaction.guild.id,
      1000
    );

    const rank =
      leaderboard.findIndex(x => x.userId === target.id) + 1;

    const barLength = 15;
    const filled = Math.round(
      (profile.progressPercent / 100) * barLength
    );

    const bar =
      "█".repeat(filled) +
      "░".repeat(Math.max(0, barLength - filled));

    const embed = new EmbedBuilder()
      .setColor(0x00ffff)
      .setAuthor({
        name: `${target.username}'s Level`
      })
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "🏆 Level",
          value: `**${profile.level}**`,
          inline: true
        },
        {
          name: "⭐ Total XP",
          value: `**${profile.totalXp}**`,
          inline: true
        },
        {
          name: "📊 Server Rank",
          value: rank > 0 ? `**#${rank}**` : "Unranked",
          inline: true
        },
        {
          name: "Progress",
          value:
            `${bar}\n` +
            `**${profile.progressXP} / ${profile.nextLevelXP} XP** ` +
            `(${profile.progressPercent}%)`
        },
        {
          name: "💬 Messages",
          value: `**${profile.messages}**`,
          inline: true
        }
      )
      .setFooter({
        text: interaction.guild.name
      });

    await interaction.reply({
      embeds: [embed]
    });
  }
};
