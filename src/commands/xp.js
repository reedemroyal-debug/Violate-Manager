const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const leveling = require("../utils/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Manage user XP")
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add XP")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("amount").setDescription("XP amount").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove XP")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("amount").setDescription("XP amount").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription("Reset user's XP")
        .addUserOption(o =>
          o.setName("user").setDescription("User").setRequired(true)
        )
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const sub = interaction.options.getSubcommand();

    if (sub === "reset") {
      leveling.resetUser(
        interaction.guild.id,
        user.id
      );

      return interaction.reply(
        `✅ Reset leveling data for ${user}.`
      );
    }

    const amount =
      interaction.options.getInteger("amount");

    if (sub === "add") {
      leveling.addXP(
        interaction.guild.id,
        user.id,
        amount
      );

      return interaction.reply(
        `✅ Added **${amount} XP** to ${user}.`
      );
    }

    if (sub === "remove") {
      const profile = leveling.getProfile(
        interaction.guild.id,
        user.id
      );

      leveling.resetUser(
        interaction.guild.id,
        user.id
      );

      leveling.addXP(
        interaction.guild.id,
        user.id,
        Math.max(0, profile.totalXp - amount)
      );

      return interaction.reply(
        `✅ Removed **${amount} XP** from ${user}.`
      );
    }
  }
};
