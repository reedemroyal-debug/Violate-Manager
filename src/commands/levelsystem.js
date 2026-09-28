const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require("discord.js");
const leveling = require("../utils/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelsystem")
    .setDescription("Manage the server leveling system")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s
      .setName("start")
      .setDescription("Set the level-up channel")
      .addChannelOption(o => o
        .setName("channel")
        .setDescription("Level-up announcement channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
    .addSubcommand(s => s
      .setName("stop")
      .setDescription("Disable leveling"))
    .addSubcommand(s => s
      .setName("status")
      .setDescription("Show leveling status")),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === "start") {
      const channel = interaction.options.getChannel("channel");

      leveling.updateConfig(guildId, {
        enabled: true,
        levelUpChannel: channel.id
      });

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00ffff)
            .setTitle("🎮 Leveling System Started")
            .setDescription(`Level-up messages will now be sent in ${channel}.`)
            .setFooter({ text: interaction.guild.name })
        ]
      });
    }

    if (sub === "stop") {
      leveling.updateConfig(guildId, {
        enabled: false,
        levelUpChannel: null
      });

      return interaction.reply("🛑 Leveling system disabled.");
    }

    const config = leveling.getConfig(guildId);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.enabled ? 0x00ff88 : 0xff4444)
          .setTitle("🎮 Leveling Status")
          .addFields(
            {
              name: "Status",
              value: config.enabled ? "🟢 Enabled" : "🔴 Disabled",
              inline: true
            },
            {
              name: "Level-up Channel",
              value: config.levelUpChannel
                ? `<#${config.levelUpChannel}>`
                : "Not set",
              inline: true
            }
          )
      ]
    });
  }
};
