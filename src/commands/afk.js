const {
  SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const DATA = path.join(
  __dirname,
  "../utils/afk.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(DATA, "utf8")
    );
  } catch {
    return {};
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
    .setName("afk")
    .setDescription("Set or remove your AFK status")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Why are you AFK?")
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction) {
    const data = load();
    const reason =
      interaction.options.getString("reason");

    if (!reason) {
      if (!data[interaction.user.id]) {
        await interaction.reply({
          content: "❌ You are not AFK.",
          ephemeral: true
        });
        return;
      }

      delete data[interaction.user.id];
      save(data);

      await interaction.reply(
        "✅ Your AFK status has been removed."
      );
      return;
    }

    data[interaction.user.id] = {
      reason,
      since: Date.now()
    };

    save(data);

    await interaction.reply(
      `💤 **${interaction.user.tag}** is now AFK.\n` +
      `📝 Reason: **${reason}**`
    );
  }
};
