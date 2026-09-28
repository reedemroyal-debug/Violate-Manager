const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveemojie")
    .setDescription("List all application emojis (from Developer Portal) with their IDs"),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const applicationId = interaction.client.application?.id || process.env.CLIENT_ID;

      if (!applicationId) {
        return interaction.editReply({
          content: `${interaction.user} Unable to resolve application ID.`
        });
      }

      const data = await interaction.client.rest.get(
        `/applications/${applicationId}/emojis`
      );

      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length === 0) {
        return interaction.editReply({
          content: `${interaction.user} No application emojis found for this bot.`
        });
      }

      items.sort((a, b) => a.name.localeCompare(b.name));

      const lines = items.map((emoji) => {
        const mention = `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
        return `${mention}  **${emoji.name}**  \`${emoji.id}\``;
      });

      const embeds = [];
      let currentDesc = "";
      const MAX_DESC = 3900;

      for (const line of lines) {
        if ((currentDesc + line + "\n").length > MAX_DESC) {
          embeds.push(
            new EmbedBuilder()
              .setColor(0x5865f2)
              .setDescription(currentDesc.trim())
          );
          currentDesc = line + "\n";
        } else {
          currentDesc += line + "\n";
        }
      }

      if (currentDesc.trim()) {
        embeds.push(
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setDescription(currentDesc.trim())
        );
      }

      embeds[0]
        .setTitle(`Application Emojis (${items.length})`)
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

      if (embeds.length > 1) {
        embeds.forEach((embed, i) => {
          embed.setTitle(
            i === 0
              ? `Application Emojis (${items.length}) • Page 1/${embeds.length}`
              : `Application Emojis • Page ${i + 1}/${embeds.length}`
          );
        });
      }

      await interaction.editReply({
        content: `${interaction.user}`,
        embeds
      });
    } catch (error) {
      console.error("giveemojie error:", error);
      await interaction.editReply({
        content: `${interaction.user} Failed to fetch application emojis. Please try again later.`
      });
    }
  }
};
