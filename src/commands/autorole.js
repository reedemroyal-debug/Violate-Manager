const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/autorole.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {
      enabled: true,
      roles: []
    };
  }
}

function save(data) {
  fs.writeFileSync(
    DATA,
    JSON.stringify(data, null, 2)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Manage automatic roles")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageRoles
    )

    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a role to autorole")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role to give automatically")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a role from autorole")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role to remove")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all autoroles")
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable autorole")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable autorole?")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub =
      interaction.options.getSubcommand();

    const data = load();

    // ==========================
    // ADD
    // ==========================

    if (sub === "add") {
      const role =
        interaction.options.getRole("role");

      const botMember =
        interaction.guild.members.me;

      if (!botMember.permissions.has(
        PermissionFlagsBits.ManageRoles
      )) {
        return interaction.reply({
          content:
            "❌ I need **Manage Roles** permission.",
          ephemeral: true
        });
      }

      if (role.id === interaction.guild.id) {
        return interaction.reply({
          content:
            "❌ You cannot use @everyone as an autorole.",
          ephemeral: true
        });
      }

      if (role.managed) {
        return interaction.reply({
          content:
            "❌ Managed/integration roles cannot be assigned.",
          ephemeral: true
        });
      }

      if (
        role.position >=
        botMember.roles.highest.position
      ) {
        return interaction.reply({
          content:
            "❌ That role is higher than or equal to my highest role.",
          ephemeral: true
        });
      }

      if (data.roles.includes(role.id)) {
        return interaction.reply({
          content:
            `❌ ${role} is already an autorole.`,
          ephemeral: true
        });
      }

      data.roles.push(role.id);
      save(data);

      return interaction.reply(
        `✅ ${role} has been added to autorole.`
      );
    }

    // ==========================
    // REMOVE
    // ==========================

    if (sub === "remove") {
      const role =
        interaction.options.getRole("role");

      if (!data.roles.includes(role.id)) {
        return interaction.reply({
          content:
            `❌ ${role} is not an autorole.`,
          ephemeral: true
        });
      }

      data.roles =
        data.roles.filter(
          id => id !== role.id
        );

      save(data);

      return interaction.reply(
        `🗑️ ${role} has been removed from autorole.`
      );
    }

    // ==========================
    // LIST
    // ==========================

    if (sub === "list") {
      if (!data.roles.length) {
        return interaction.reply({
          content:
            "📭 No autoroles configured.",
          ephemeral: true
        });
      }

      const roles = data.roles
        .map(id => {
          const role =
            interaction.guild.roles.cache.get(id);

          return role
            ? `• ${role}`
            : `• \`${id}\` *(role not found)*`;
        })
        .join("\n");

      return interaction.reply({
        content:
          `🤖 **Autoroles**\n\n${roles}\n\n` +
          `Status: **${
            data.enabled
              ? "🟢 Enabled"
              : "🔴 Disabled"
          }**`,
        ephemeral: true
      });
    }

    // ==========================
    // TOGGLE
    // ==========================

    if (sub === "toggle") {
      const enabled =
        interaction.options.getBoolean("enabled");

      data.enabled = enabled;
      save(data);

      return interaction.reply(
        `🤖 Autorole is now **${
          enabled
            ? "enabled 🟢"
            : "disabled 🔴"
        }**.`
      );
    }
  }
};
