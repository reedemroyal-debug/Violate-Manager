const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(
  __dirname,
  "../utils/ticketConfig.json"
);

function loadConfig() {
  if (!fs.existsSync(CONFIG)) {
    return {
      global: {
        roleAssignmentEnabled: true
      },
      categories: {},
      tickets: {},
      setup: {},
      serverSetup: {}
    };
  }

  const data = JSON.parse(
    fs.readFileSync(CONFIG, "utf8")
  );

  data.global ??= {
    roleAssignmentEnabled: true
  };

  data.categories ??= {};
  data.tickets ??= {};
  data.setup ??= {};
  data.serverSetup ??= {};

  return data;
}

function saveConfig(data) {
  fs.writeFileSync(
    CONFIG,
    JSON.stringify(data, null, 2)
  );
}

function getSetup(data, guildId) {
  data.serverSetup[guildId] ??= {
    title: "Support Ticket",
    description:
      "Please select a ticket category.",
    image: null,
    color: "#5865F2",
    categories: {},
    assistRoleIds: []
  };

  const setup =
    data.serverSetup[guildId];

  setup.categories ??= {};
  setup.assistRoleIds ??= [];

  return setup;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticketassistrole")
    .setDescription(
      "Manage ticket assistance roles"
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels.toString()
    )

    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription(
          "Add multiple ticket assist roles"
        )

        .addRoleOption(option =>
          option
            .setName("role1")
            .setDescription(
              "First assist role"
            )
            .setRequired(true)
        )

        .addRoleOption(option =>
          option
            .setName("role2")
            .setDescription(
              "Second assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role3")
            .setDescription(
              "Third assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role4")
            .setDescription(
              "Fourth assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role5")
            .setDescription(
              "Fifth assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role6")
            .setDescription(
              "Sixth assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role7")
            .setDescription(
              "Seventh assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role8")
            .setDescription(
              "Eighth assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role9")
            .setDescription(
              "Ninth assist role"
            )
            .setRequired(false)
        )

        .addRoleOption(option =>
          option
            .setName("role10")
            .setDescription(
              "Tenth assist role"
            )
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription(
          "Remove a ticket assist role"
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription(
              "Role to remove"
            )
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("clear")
        .setDescription(
          "Remove all ticket assist roles"
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription(
          "List all ticket assist roles"
        )
    ),

  async execute(interaction) {
    try {
      const data = loadConfig();

      const setup =
        getSetup(
          data,
          interaction.guild.id
        );

      const subcommand =
        interaction.options.getSubcommand();

      if (subcommand === "add") {
        const roles = [];

        for (
          let number = 1;
          number <= 10;
          number++
        ) {
          const role =
            interaction.options.getRole(
              `role${number}`
            );

          if (role) {
            roles.push(role);
          }
        }

        if (!roles.length) {
          return interaction.reply({
            content:
              "❌ Please provide at least one role.",
            ephemeral: true
          });
        }

        const added = [];
        const alreadyAdded = [];

        for (const role of roles) {
          if (
            setup.assistRoleIds.includes(
              role.id
            )
          ) {
            alreadyAdded.push(role);
            continue;
          }

          setup.assistRoleIds.push(
            role.id
          );

          added.push(role);
        }

        saveConfig(data);

        let response =
          "🎫 **Ticket Assist Roles Updated**\n\n";

        if (added.length) {
          response +=
            "**✅ Added:**\n" +
            added
              .map(role =>
                `• ${role}`
              )
              .join("\n") +
            "\n\n";
        }

        if (alreadyAdded.length) {
          response +=
            "**ℹ️ Already configured:**\n" +
            alreadyAdded
              .map(role =>
                `• ${role}`
              )
              .join("\n");
        }

        return interaction.reply({
          content: response,
          ephemeral: true
        });
      }

      if (subcommand === "remove") {
        const role =
          interaction.options.getRole(
            "role"
          );

        if (
          !setup.assistRoleIds.includes(
            role.id
          )
        ) {
          return interaction.reply({
            content:
              `❌ ${role} is not configured as a ticket assist role.`,
            ephemeral: true
          });
        }

        setup.assistRoleIds =
          setup.assistRoleIds.filter(
            id =>
              id !== role.id
          );

        saveConfig(data);

        return interaction.reply({
          content:
            `✅ Removed ${role} from ticket assist roles.`,
          ephemeral: true
        });
      }

      if (subcommand === "clear") {
        const count =
          setup.assistRoleIds.length;

        setup.assistRoleIds = [];

        saveConfig(data);

        return interaction.reply({
          content:
            `🗑️ Cleared **${count}** ticket assist role(s).`,
          ephemeral: true
        });
      }

      if (subcommand === "list") {
        if (
          !setup.assistRoleIds.length
        ) {
          return interaction.reply({
            content:
              "📋 **Ticket Assist Roles**\n\nNo assist roles are configured.",
            ephemeral: true
          });
        }

        const roleList =
          setup.assistRoleIds
            .map((roleId, index) => {
              const role =
                interaction.guild.roles.cache.get(
                  roleId
                );

              if (role) {
                return `${index + 1}. ${role}`;
              }

              return `${index + 1}. Unknown Role (${roleId})`;
            })
            .join("\n");

        return interaction.reply({
          content:
            `📋 **Ticket Assist Roles**\n\n${roleList}\n\n` +
            `Total: **${setup.assistRoleIds.length}**`,
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "❌ Unknown ticket assist role action.",
        ephemeral: true
      });
    } catch (error) {
      console.error(
        "❌ TicketAssistRole Error:",
        error
      );

      if (interaction.replied ||
          interaction.deferred) {
        return interaction.followUp({
          content:
            "❌ Something went wrong while managing ticket assist roles.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "❌ Something went wrong while managing ticket assist roles.",
        ephemeral: true
      });
    }
  }
};
