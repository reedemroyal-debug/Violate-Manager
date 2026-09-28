const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} = require("discord.js");

const { startSetup } = require("../tickets/setup");
const { deployPanel } = require("../tickets/manager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage the ticket system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Start a fresh ticket setup.")
    )

    .addSubcommand(sub =>
      sub
        .setName("panel")
        .setDescription("Deploy the ticket panel.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel where the panel should be sent.")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand =
      interaction.options.getSubcommand();

    if (subcommand === "setup") {
      return startSetup(interaction);
    }

    if (subcommand === "panel") {
      const channel =
        interaction.options.getChannel("channel");

      return deployPanel(interaction, channel);
    }
  }
};
