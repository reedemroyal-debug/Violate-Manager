const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(
  __dirname,
  "../utils/ticketConfig.json"
);

function load() {
  try {
    return JSON.parse(
      fs.readFileSync(CONFIG, "utf8")
    );
  } catch {
    return {
      panels: {},
      categories: {}
    };
  }
}

function save(data) {
  fs.writeFileSync(
    CONFIG,
    JSON.stringify(data, null, 2)
  );
}

module.exports = {

  async handleSelector(interaction) {

    if (
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu()
    ) {
      return false;
    }

    const id = interaction.customId;

    if (
      !id.startsWith("ticket_channel_category_") &&
      !id.startsWith("ticket_staff_role_")
    ) {
      return false;
    }

    const categoryId =
      id
        .replace(
          "ticket_channel_category_",
          ""
        )
        .replace(
          "ticket_staff_role_",
          ""
        );

    const data = load();

    const panel =
      data.panels[interaction.user.id];

    if (!panel) {
      await interaction.reply({
        content:
          "❌ Ticket setup expired. Run `/ticket setup` again.",
        ephemeral: true
      });

      return true;
    }

    const category =
      panel.categories?.find(
        c => c.id === categoryId
      );

    if (!category) {
      await interaction.reply({
        content:
          "❌ Ticket category not found.",
        ephemeral: true
      });

      return true;
    }

    if (
      id.startsWith(
        "ticket_channel_category_"
      )
    ) {
      category.discordCategoryId =
        interaction.values[0];

      save(data);

      await interaction.reply({
        content:
          `📁 Discord category set for **${category.name}**.`,
        ephemeral: true
      });

      return true;
    }

    if (
      id.startsWith(
        "ticket_staff_role_"
      )
    ) {
      category.staffRoleId =
        interaction.values[0];

      save(data);

      await interaction.reply({
        content:
          `👮 Staff role set for **${category.name}**.`,
        ephemeral: true
      });

      return true;
    }

    return false;
  },

  async showSelectors(interaction, category) {

    const channelRow =
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId(
            `ticket_channel_category_${category.id}`
          )
          .setPlaceholder(
            "📁 Select Discord Category"
          )
          .setChannelTypes(
            ChannelType.GuildCategory
          )
          .setMinValues(1)
          .setMaxValues(1)
      );

    const roleRow =
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(
            `ticket_staff_role_${category.id}`
          )
          .setPlaceholder(
            "👮 Select Staff Role"
          )
          .setMinValues(1)
          .setMaxValues(1)
      );

    await interaction.reply({
      content:
        `🎫 **${category.name}**\n\n` +
        "📁 Select the Discord category where tickets will be created.\n" +
        "👮 Select the staff role that can access these tickets.",
      components: [
        channelRow,
        roleRow
      ],
      ephemeral: true
    });
  }
};
