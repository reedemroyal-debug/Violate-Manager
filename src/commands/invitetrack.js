const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const tracker =
  require("../events/inviteTracker");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invitetrack")
    .setDescription("Manage the invite tracking system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable invite tracking")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable invite tracking?")
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Invite log channel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const enabled =
      interaction.options.getBoolean("enabled");

    const channel =
      interaction.options.getChannel("channel");

    const { data, guild } =
      tracker.getGuildData(
        interaction.guild.id
      );

    guild.enabled = enabled;
    guild.channelId = channel.id;

    tracker.save(data);

    /*
     * Refresh invite cache immediately.
     */
    await tracker
      .init(interaction.client);

    await interaction.reply({
      content:
        `${enabled ? "🟢" : "🔴"} Invite tracking **${
          enabled ? "enabled" : "disabled"
        }**.\n\n` +
        `📢 Log channel: ${channel}`,
      ephemeral: true
    });
  }
};
