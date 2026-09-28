const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const logsFile = path.join(
  __dirname,
  "../utils/logsData.json"
);

const LOG_TYPES = {
  mod: "🛡️・mod-logs",
  rolePing: "🚨・roleping-logs",
  ticket: "🎫・ticket-logs",
  warn: "⚠️・warn-logs",
  ban: "🔨・ban-logs",
  kick: "👢・kick-logs",
  message: "💬・message-logs",
  member: "👤・member-logs",
  antiNuke: "☢️・antinuke-logs",
  channel: "📁・channel-logs",
  voice: "🔊・voice-logs"
};

function loadLogs() {
  try {
    if (!fs.existsSync(logsFile)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(logsFile, "utf8")
    );
  } catch (error) {
    console.error(
      "❌ Logs config load error:",
      error.message
    );

    return {};
  }
}

function saveLogs(data) {
  fs.writeFileSync(
    logsFile,
    JSON.stringify(data, null, 2)
  );
}

async function findOrCreateCategory(guild) {
  let category =
    guild.channels.cache.find(
      channel =>
        channel.type === ChannelType.GuildCategory &&
        channel.name === "📋・VIOLATE LOGS"
    );

  if (category) {
    return category;
  }

  category =
    await guild.channels.create({
      name: "📋・VIOLATE LOGS",
      type: ChannelType.GuildCategory
    });

  return category;
}

async function findOrCreateLogChannel(
  guild,
  category,
  name
) {
  let channel =
    guild.channels.cache.find(
      ch =>
        ch.type === ChannelType.GuildText &&
        ch.name === name &&
        ch.parentId === category.id
    );

  if (channel) {
    return channel;
  }

  channel =
    await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      reason: "VIOLATE MANAGER automatic logs setup"
    });

  return channel;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configure server logs")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    )
    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription(
          "Automatically create all log channels"
        )
    ),

  async execute(interaction) {
    if (
      !interaction.memberPermissions?.has(
        PermissionFlagsBits.Administrator
      )
    ) {
      return interaction.reply({
        content:
          "❌ Administrator permission required.",
        flags: 64
      });
    }

    await interaction.deferReply();

    try {
      const guild = interaction.guild;

      if (!guild) {
        return interaction.editReply(
          "❌ This command can only be used inside a server."
        );
      }

      const category =
        await findOrCreateCategory(guild);

      const data = loadLogs();

      if (!data[guild.id]) {
        data[guild.id] = {};
      }

      const created = [];
      const existing = [];

      for (const [type, channelName] of Object.entries(
        LOG_TYPES
      )) {
        const channel =
          await findOrCreateLogChannel(
            guild,
            category,
            channelName
          );

        if (
          data[guild.id][type] === channel.id
        ) {
          existing.push(channel);
        } else {
          created.push(channel);
        }

        data[guild.id][type] =
          channel.id;
      }

      saveLogs(data);

      const embed =
        new EmbedBuilder()
          .setTitle(
            "📋 VIOLATE MANAGER • Logs Setup"
          )
          .setDescription(
            "All server log channels have been configured automatically."
          )
          .addFields(
            {
              name: "📂 Category",
              value: `${category}`,
              inline: false
            },
            {
              name: "📊 Log Channels",
              value:
                Object.entries(LOG_TYPES)
                  .map(
                    ([type]) =>
                      `**${type}** → <#${data[guild.id][type]}>`
                  )
                  .join("\n"),
              inline: false
            }
          )
          .setColor("#5865F2")
          .setFooter({
            text:
              "VIOLATE MANAGER • Automatic Logs"
          })
          .setTimestamp();

      await interaction.editReply({
        embeds: [embed]
      });

      console.log(
        `✅ Logs setup completed for ${guild.name} (${guild.id})`
      );

    } catch (error) {
      console.error(
        "❌ Logs setup failed:",
        error
      );

      await interaction.editReply(
        "❌ Failed to setup logs. Check the terminal for the error."
      ).catch(() => {});
    }
  },

  async handleInteraction() {
    return false;
  }
};
