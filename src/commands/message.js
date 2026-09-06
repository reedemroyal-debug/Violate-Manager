const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");

const COLORS = {
  BLUE: 0x3498db,
  RED: 0xe74c3c,
  GREEN: 0x2ecc71,
  YELLOW: 0xf1c40f,
  ORANGE: 0xe67e22,
  PURPLE: 0x9b59b6,
  PINK: 0xe91e63,
  CYAN: 0x00bcd4,
  WHITE: 0xffffff,
  BLACK: 0x000000
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("message")
    .setDescription("Send a custom embed message")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageMessages
    )

    .addSubcommand(sub =>
      sub
        .setName("send")
        .setDescription("Send an embed message to a channel")

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
        )

        .addStringOption(option =>
          option
            .setName("color")
            .setDescription("Color of the embed side bar")
            .setRequired(true)
            .addChoices(
              { name: "🔵 Blue", value: "BLUE" },
              { name: "🔴 Red", value: "RED" },
              { name: "🟢 Green", value: "GREEN" },
              { name: "🟡 Yellow", value: "YELLOW" },
              { name: "🟠 Orange", value: "ORANGE" },
              { name: "🟣 Purple", value: "PURPLE" },
              { name: "🩷 Pink", value: "PINK" },
              { name: "🩵 Cyan", value: "CYAN" },
              { name: "⚪ White", value: "WHITE" },
              { name: "⚫ Black", value: "BLACK" }
            )
        )
    ),

  execute: async interaction => {
    if (interaction.options.getSubcommand() !== "send") {
      return;
    }

    const channel = interaction.options.getChannel("channel");
    const message = interaction.options.getString("message");
    const color = interaction.options.getString("color");

    if (!channel.isTextBased()) {
      return interaction.reply({
        content: "❌ Please select a text channel.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setDescription(message)
      .setColor(COLORS[color] ?? COLORS.BLUE);

    await channel.send({
      embeds: [embed]
    });

    await interaction.reply({
      content: `✅ Message sent to ${channel}.`,
      ephemeral: true
    });
  }
};
