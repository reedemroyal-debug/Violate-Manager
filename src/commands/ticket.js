const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("VIOLATE ticket management")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels.toString()
    )

    .addSubcommand(s => s
      .setName("category-create")
      .setDescription("Create a ticket category")
      .addStringOption(o => o.setName("name").setDescription("Category name").setRequired(true))
      .addStringOption(o => o.setName("emoji").setDescription("Category emoji").setRequired(true))
      .addStringOption(o => o.setName("description").setDescription("Category description").setRequired(true))
      .addChannelOption(o => o.setName("ticket-category").setDescription("Discord category").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addRoleOption(o => o.setName("staff-role").setDescription("Staff access role").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("category-delete")
      .setDescription("Delete a ticket category")
      .addStringOption(o => o.setName("category").setDescription("Category ID").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("question-add")
      .setDescription("Add an interview question")
      .addStringOption(o => o.setName("category").setDescription("Category ID").setRequired(true))
      .addStringOption(o => o.setName("question").setDescription("Question").setRequired(true))
      .addIntegerOption(o => o.setName("min-length").setDescription("Minimum answer length").setMinValue(5).setMaxValue(4000).setRequired(true))
      .addStringOption(o => o.setName("keywords").setDescription("Accepted keywords separated by commas").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("question-remove")
      .setDescription("Remove an interview question")
      .addStringOption(o => o.setName("category").setDescription("Category ID").setRequired(true))
      .addIntegerOption(o => o.setName("number").setDescription("Question number").setMinValue(1).setRequired(true))
    )

    .addSubcommand(s => s
      .setName("questions")
      .setDescription("View category questions")
      .addStringOption(o => o.setName("category").setDescription("Category ID").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("role-set")
      .setDescription("Set pass role")
      .addStringOption(o => o.setName("category").setDescription("Category ID").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role to give after passing").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("role-toggle")
      .setDescription("Toggle automatic pass role")
      .addBooleanOption(o => o.setName("enabled").setDescription("Enable automatic role assignment").setRequired(true))
    )

    .addSubcommand(s => s
      .setName("panel")
      .setDescription("Send the ticket panel")
    ),

  async execute(interaction) {
    const ticketSystem = require("../events/ticketSystem");
    await ticketSystem.handleCommand(interaction);
  }
};
