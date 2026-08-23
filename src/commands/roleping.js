const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const store = require("../utils/rolePingStore");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roleping")
    .setDescription(
      "Manage protected role ping permissions."
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
      sub
        .setName("allow")
        .setDescription(
          "Allow one role to ping another role."
        )
        .addRoleOption(option =>
          option
            .setName("source")
            .setDescription(
              "Role receiving permission."
            )
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("target")
            .setDescription(
              "Protected role."
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("deny")
        .setDescription(
          "Remove ping permission but keep target protected."
        )
        .addRoleOption(option =>
          option
            .setName("source")
            .setDescription(
              "Role losing permission."
            )
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName("target")
            .setDescription(
              "Protected role."
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("clear")
        .setDescription(
          "Clear all permissions for a role."
        )
        .addRoleOption(option =>
          option
            .setName("source")
            .setDescription(
              "Role to clear."
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription(
          "Show role ping permissions."
        )
    ),

  async execute(interaction) {
    if (
      !interaction.memberPermissions.has(
        PermissionFlagsBits.ManageGuild
      )
    ) {
      return interaction.reply({
        content:
          "❌ You need Manage Server permission.",
        ephemeral: true
      });
    }

    const sub =
      interaction.options.getSubcommand();

    // =================================
    // ALLOW
    // =================================

    if (sub === "allow") {
      const source =
        interaction.options.getRole(
          "source"
        );

      const target =
        interaction.options.getRole(
          "target"
        );

      if (source.id === target.id) {
        return interaction.reply({
          content:
            "❌ Source and target cannot be the same role.",
          ephemeral: true
        });
      }

      store.allow(
        source.id,
        target.id
      );

      return interaction.reply({
        content:
          `✅ **${source.name}** can now ping **${target.name}**.`
      });
    }

    // =================================
    // DENY
    // =================================

    if (sub === "deny") {
      const source =
        interaction.options.getRole(
          "source"
        );

      const target =
        interaction.options.getRole(
          "target"
        );

      store.deny(
        source.id,
        target.id
      );

      return interaction.reply({
        content:
          `🔒 **${target.name}** is protected. **${source.name}** can no longer ping it.`
      });
    }

    // =================================
    // CLEAR
    // =================================

    if (sub === "clear") {
      const source =
        interaction.options.getRole(
          "source"
        );

      store.clear(source.id);

      return interaction.reply({
        content:
          `🗑️ Cleared all ping permissions for **${source.name}**.`
      });
    }

    // =================================
    // LIST
    // =================================

    if (sub === "list") {
      const rules =
        store.getAll();

      const lines = [];

      for (
        const [sourceId, targetIds]
        of Object.entries(rules)
      ) {
        const source =
          interaction.guild.roles.cache.get(
            sourceId
          );

        if (!source) continue;

        for (const targetId of targetIds) {
          const target =
            interaction.guild.roles.cache.get(
              targetId
            );

          if (!target) continue;

          lines.push(
            `• **${source.name}** → **${target.name}**`
          );
        }
      }

      if (!lines.length) {
        return interaction.reply({
          content:
            "📭 No role ping permissions configured.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          `## 🔔 Role Ping Permissions\n\n${lines.join("\n")}`,
        ephemeral: true
      });
    }
  }
};
