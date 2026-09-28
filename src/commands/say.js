const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");

const { replaceExternalEmojis } = require("../utils/liveEmoji");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Send a plain message for testing")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel where the message will be sent")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Message content")
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");
    const message = interaction.options.getString("message");
    const liveMessage = await replaceExternalEmojis(interaction.guild, message);

    if (!channel.isTextBased()) {
      return interaction.reply({
        content: "❌ Please select a text channel.",
        flags: 64
      });
    }

    console.log("🧪 SAY INPUT:", JSON.stringify(message));

    await channel.send({
      content: liveMessage
    });

    await interaction.reply({
      content: `✅ Message sent to ${channel}.`,
      flags: 64
    });
  }
};
