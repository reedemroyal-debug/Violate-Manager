const {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const CONFIG = path.join(__dirname, "../utils/ticketConfig.json");

function load() {
  return JSON.parse(fs.readFileSync(CONFIG, "utf8"));
}

function save(data) {
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

module.exports = {
  async handle(interaction) {
    if (!interaction.isButton()) return false;
    if (interaction.customId !== "ticket_add_category") return false;

    const data = load();
    const panel = data.panels[interaction.user.id];

    if (!panel || !panel.categories?.length) {
      await interaction.reply({
        content: "❌ Pehle category create kar.",
        ephemeral: true
      });
      return true;
    }

    const category =
      panel.categories[panel.categories.length - 1];

    const channelRow = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId(`ticket_channel_category_${category.id}`)
        .setPlaceholder("📁 Select Discord Category")
        .setChannelTypes(ChannelType.GuildCategory)
        .setMinValues(1)
        .setMaxValues(1)
    );

    const roleRow = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId(`ticket_staff_role_${category.id}`)
        .setPlaceholder("👮 Select Staff Role")
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({
      content:
        `🎫 **${category.name}**\n\n` +
        `📁 Select the Discord category where tickets will be created.\n` +
        `👮 Select the staff role that will have access to these tickets.`,
      components: [channelRow, roleRow],
      ephemeral: true
    });

    return true;
  },

  async handleSelector(interaction) {
    if (
      !interaction.isChannelSelectMenu() &&
      !interaction.isRoleSelectMenu()
    ) {
      return false;
    }

    const parts = interaction.customId.split("_");
    const type = parts[2];
    const categoryId = parts.slice(3).join("_");

    if (
      type !== "channel" &&
      type !== "staff"
    ) {
      return false;
    }

    const data = load();
    const panel = data.panels[interaction.user.id];

    if (!panel) {
      await interaction.reply({
        content: "❌ Ticket setup expired.",
        ephemeral: true
      });
      return true;
    }

    const category =
      panel.categories.find(
        c => c.id === categoryId
      );

    if (!category) {
      await interaction.reply({
        content: "❌ Category not found.",
        ephemeral: true
      });
      return true;
    }

    if (type === "channel") {
      category.discordCategoryId =
        interaction.values[0];

      save(data);

      await interaction.reply({
        content:
          `✅ Discord category set for **${category.name}**.`,
        ephemeral: true
      });

      return true;
    }

    if (type === "staff") {
      category.staffRoleId =
        interaction.values[0];

      save(data);

      await interaction.reply({
        content:
          `✅ Staff role set for **${category.name}**.`,
        ephemeral: true
      });

      return true;
    }

    return false;
  }
};
