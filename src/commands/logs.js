const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const dataFile = path.join(
  __dirname,
  "../utils/logsData.json"
);

const LOG_CHANNELS = {
  mod: "📋┃mod-logs",
  rolePing: "🛡️┃role-ping-logs",
  ticket: "🎫┃ticket-logs",
  warn: "⚠️┃warn-logs",
  ban: "🔨┃ban-logs",
  kick: "👢┃kick-logs",
  message: "🗑️┃message-logs",
  member: "👤┃member-logs"
};

function saveData(data) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(data, null, 2)
  );
}

function loadData() {
  try {
    if (!fs.existsSync(dataFile)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(dataFile, "utf8")
    );
  } catch {
    return {};
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Manage server logging system.")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription(
          "Create the complete logs category and channels."
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("reset")
        .setDescription(
          "Reset saved log channel configuration."
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription(
          "Show configured log channels."
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
    // SETUP
    // =================================

    if (sub === "setup") {
      await interaction.deferReply({
        ephemeral: true
      });

      const guild =
        interaction.guild;

      let category =
        guild.channels.cache.find(
          channel =>
            channel.type ===
              ChannelType.GuildCategory &&
            channel.name === "📂 ┃ LOGS"
        );

      if (!category) {
        category =
          await guild.channels.create({
            name: "📂 ┃ LOGS",
            type: ChannelType.GuildCategory
          });
      }

      const saved = loadData();

      if (!saved[guild.id]) {
        saved[guild.id] = {};
      }

      const created = [];

      for (
        const [key, channelName]
        of Object.entries(LOG_CHANNELS)
      ) {
        let channel =
          guild.channels.cache.find(
            ch =>
              ch.type ===
                ChannelType.GuildText &&
              ch.name === channelName &&
              ch.parentId === category.id
          );

        if (!channel) {
          channel =
            await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: category.id,
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  deny: [
                    PermissionsBitField.Flags.ViewChannel
                  ]
                }
              ]
            });

          created.push(channelName);
        }

        saved[guild.id][key] =
          channel.id;
      }

      saveData(saved);

      return interaction.editReply({
        content:
          `✅ **Logs system setup complete!**\n\n` +
          `📂 Category: ${category}\n\n` +
          Object.entries(
            saved[guild.id]
          )
            .map(
              ([key, id]) =>
                `• **${key}** → <#${id}>`
            )
            .join("\n") +
          `\n\n${
            created.length
              ? `🆕 Created: ${created.length} channels`
              : "♻️ Existing channels reused."
          }`
      });
    }

    // =================================
    // LIST
    // =================================

    if (sub === "list") {
      const saved =
        loadData();

      const guildLogs =
        saved[interaction.guild.id];

      if (!guildLogs) {
        return interaction.reply({
          content:
            "📭 Logs system is not configured yet.\nUse `/logs setup`.",
          ephemeral: true
        });
      }

      const lines =
        Object.entries(
          guildLogs
        )
          .map(
            ([key, id]) =>
              `• **${key}** → <#${id}>`
          )
          .join("\n");

      return interaction.reply({
        content:
          `## 📋 Configured Logs\n\n${lines}`,
        ephemeral: true
      });
    }

    // =================================
    // RESET
    // =================================

    if (sub === "reset") {
      const saved =
        loadData();

      delete saved[
        interaction.guild.id
      ];

      saveData(saved);

      return interaction.reply({
        content:
          "♻️ Saved log configuration has been reset.\nExisting channels were **not deleted**.",
        ephemeral: true
      });
    }
  }
};
