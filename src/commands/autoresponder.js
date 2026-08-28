const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/autoresponders.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {
      enabled: true,
      responders: []
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
    .setName("autoresponder")
    .setDescription("Manage automatic responses")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    )

    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add an autoresponder")
        .addStringOption(option =>
          option
            .setName("trigger")
            .setDescription("Word or phrase that triggers the response")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("message")
            .setDescription("Response message")
            .setRequired(false)
            .setMaxLength(2000)
        )
        .addStringOption(option =>
          option
            .setName("image")
            .setDescription("Image URL")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("embed_title")
            .setDescription("Embed title")
            .setRequired(false)
            .setMaxLength(256)
        )
        .addStringOption(option =>
          option
            .setName("embed_description")
            .setDescription("Embed description")
            .setRequired(false)
            .setMaxLength(4000)
        )
        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("Embed HEX color, e.g. #5865F2")
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName("footer")
            .setDescription("Embed footer")
            .setRequired(false)
            .setMaxLength(2048)
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Only respond in this channel")
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName("case_sensitive")
            .setDescription("Make the trigger case-sensitive")
            .setRequired(false)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove an autoresponder")
        .addStringOption(option =>
          option
            .setName("trigger")
            .setDescription("Trigger to remove")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("list")
        .setDescription("List all autoresponders")
    )

    .addSubcommand(sub =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable autoresponders")
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable autoresponders?")
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
      const trigger =
        interaction.options
          .getString("trigger")
          .trim();

      const message =
        interaction.options
          .getString("message") || "";

      const image =
        interaction.options
          .getString("image") || "";

      const embedTitle =
        interaction.options
          .getString("embed_title") || "";

      const embedDescription =
        interaction.options
          .getString("embed_description") || "";

      const color =
        interaction.options
          .getString("color") || "#5865F2";

      const footer =
        interaction.options
          .getString("footer") || "";

      const channel =
        interaction.options
          .getChannel("channel");

      const caseSensitive =
        interaction.options
          .getBoolean("case_sensitive") || false;

      if (
        !message &&
        !image &&
        !embedTitle &&
        !embedDescription
      ) {
        return interaction.reply({
          content:
            "❌ You must provide at least a message, image, embed title, or embed description.",
          ephemeral: true
        });
      }

      if (
        image &&
        !/^https?:\/\/\S+$/i.test(image)
      ) {
        return interaction.reply({
          content:
            "❌ Invalid image URL.",
          ephemeral: true
        });
      }

      if (
        !/^#[0-9A-Fa-f]{6}$/.test(color)
      ) {
        return interaction.reply({
          content:
            "❌ Invalid HEX color. Example: `#5865F2`",
          ephemeral: true
        });
      }

      const exists =
        data.responders.find(
          r =>
            r.trigger.toLowerCase() ===
            trigger.toLowerCase()
        );

      if (exists) {
        return interaction.reply({
          content:
            `❌ Autoresponder for **${trigger}** already exists.`,
          ephemeral: true
        });
      }

      const responder = {
        id: `ar_${Date.now()}`,
        trigger,
        message,
        image,
        embedTitle,
        embedDescription,
        color,
        footer,
        channelId: channel?.id || null,
        caseSensitive,
        enabled: true,
        createdBy: interaction.user.id,
        createdAt: Date.now()
      };

      data.responders.push(responder);
      save(data);

      return interaction.reply({
        content:
          `✅ Autoresponder created for **${trigger}**.`,
        ephemeral: true
      });
    }

    // ==========================
    // REMOVE
    // ==========================

    if (sub === "remove") {
      const trigger =
        interaction.options
          .getString("trigger")
          .trim();

      const before =
        data.responders.length;

      data.responders =
        data.responders.filter(
          r =>
            r.trigger.toLowerCase() !==
            trigger.toLowerCase()
        );

      if (
        data.responders.length ===
        before
      ) {
        return interaction.reply({
          content:
            `❌ No autoresponder found for **${trigger}**.`,
          ephemeral: true
        });
      }

      save(data);

      return interaction.reply({
        content:
          `🗑️ Autoresponder **${trigger}** removed.`,
        ephemeral: true
      });
    }

    // ==========================
    // LIST
    // ==========================

    if (sub === "list") {
      if (!data.responders.length) {
        return interaction.reply({
          content:
            "📭 No autoresponders configured.",
          ephemeral: true
        });
      }

      const lines =
        data.responders.map(
          (r, index) =>
            `**${index + 1}.** \`${r.trigger}\` — ${
              r.enabled ? "🟢 Enabled" : "🔴 Disabled"
            }`
        );

      const embed =
        new EmbedBuilder()
          .setTitle("🤖 Autoresponders")
          .setDescription(
            lines.join("\n")
          )
          .setColor("#5865F2");

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
    }

    // ==========================
    // TOGGLE
    // ==========================

    if (sub === "toggle") {
      const enabled =
        interaction.options
          .getBoolean("enabled");

      data.enabled = enabled;
      save(data);

      return interaction.reply(
        `🤖 Autoresponders are now **${
          enabled ? "enabled 🟢" : "disabled 🔴"
        }**.`
      );
    }
  }
};
