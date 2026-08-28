const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

const ticketSetupSelectors = require("./ticketSetupSelectors");

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

function getPanel(userId) {
  const data = load();
  return data.panels[userId];
}

function basePanel(userId) {
  const data = load();

  data.panels[userId] ??= {
    title: null,
    description: null,
    color: null,
    image: null,
    thumbnail: null,
    json: null,
    categories: []
  };

  data.panels[userId].categories ??= [];

  save(data);

  return data.panels[userId];
}

function setupButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_setup_title")
        .setLabel("Title")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("ticket_setup_description")
        .setLabel("Description")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("ticket_setup_color")
        .setLabel("Color")
        .setStyle(ButtonStyle.Primary)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_setup_image")
        .setLabel("Image")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("ticket_setup_thumbnail")
        .setLabel("Thumbnail")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("ticket_setup_json")
        .setLabel("JSON")
        .setStyle(ButtonStyle.Success)
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_setup_save_category")
        .setLabel("Save & Set Category")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("ticket_setup_exit")
        .setLabel("Exit")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function setupEmbed(panel) {
  const embed = new EmbedBuilder()
    .setTitle(panel.title || "Ticket Setup")
    .setDescription(
      panel.description ||
      "Please enter the requested information as prompted.\n\n" +
      "Title, Description and Color are required.\n" +
      "Image, Thumbnail and JSON are optional."
    );

  if (panel.color) {
    try {
      embed.setColor(panel.color);
    } catch {}
  }

  if (panel.image) {
    embed.setImage(panel.image);
  }

  if (panel.thumbnail) {
    embed.setThumbnail(panel.thumbnail);
  }

  return embed;
}

function fieldModal(customId, title, fieldId, label, placeholder, style) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId(fieldId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setStyle(style || TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(input)
  );

  return modal;
}

module.exports = {

  async handle(interaction) {

    /*
     * ================================
     * BUTTONS
     * ================================
     */

    if (interaction.isButton()) {

      const panel = getPanel(
        interaction.user.id
      );

      /*
       * SETUP FIELD BUTTONS
       */

      if (
        interaction.customId ===
        "ticket_setup_title"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_title",
            "Ticket Panel Title",
            "value",
            "Title",
            "Example: 🎫 Support Center"
          )
        );

        return true;
      }

      if (
        interaction.customId ===
        "ticket_setup_description"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_description",
            "Ticket Panel Description",
            "value",
            "Description",
            "Example: Choose a category below to contact our staff.",
            TextInputStyle.Paragraph
          )
        );

        return true;
      }

      if (
        interaction.customId ===
        "ticket_setup_color"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_color",
            "Ticket Panel Color",
            "value",
            "Color",
            "Example: #00FFFF"
          )
        );

        return true;
      }

      if (
        interaction.customId ===
        "ticket_setup_image"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_image",
            "Ticket Panel Image",
            "value",
            "Image URL",
            "https://example.com/image.png"
          )
        );

        return true;
      }

      if (
        interaction.customId ===
        "ticket_setup_thumbnail"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_thumbnail",
            "Ticket Panel Thumbnail",
            "value",
            "Thumbnail URL",
            "https://example.com/thumb.png"
          )
        );

        return true;
      }

      if (
        interaction.customId ===
        "ticket_setup_json"
      ) {
        if (!panel) {
          basePanel(interaction.user.id);
        }

        await interaction.showModal(
          fieldModal(
            "ticket_modal_json",
            "Ticket Panel JSON",
            "value",
            "JSON",
            '{"footer":{"text":"VIOLATE MANAGER"}}',
            TextInputStyle.Paragraph
          )
        );

        return true;
      }

      /*
       * SAVE & CATEGORY
       */

      if (
        interaction.customId ===
        "ticket_setup_save_category"
      ) {
        const current = getPanel(
          interaction.user.id
        );

        if (!current) {
          await interaction.reply({
            content:
              "❌ Setup expired. Run `/ticket setup` again.",
            ephemeral: true
          });

          return true;
        }

        if (
          !current.title ||
          !current.description ||
          !current.color
        ) {
          await interaction.reply({
            content:
              "❌ **Title, Description and Color are compulsory.**\n\n" +
              "Please complete all three before adding categories.",
            ephemeral: true
          });

          return true;
        }

        const categoryButtons =
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("ticket_add_category")
              .setLabel("Add Select Menu Option")
              .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
              .setCustomId("ticket_finish")
              .setLabel("FINISH")
              .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
              .setCustomId("ticket_remove_category")
              .setLabel("Remove Category")
              .setStyle(ButtonStyle.Danger)
          );

        const categoryEmbed =
          new EmbedBuilder()
            .setTitle("🎫 Ticket Categories")
            .setDescription(
              "Use the buttons below to configure your ticket categories.\\n\\n" +
              "**Add Select Menu Option** — Create a new ticket category.\\n" +
              "**FINISH** — Create the final ticket panel.\\n" +
              "**Remove Category** — Remove an existing category."
            )
            .setColor(current.color);

        if (current.categories?.length) {
          categoryEmbed.addFields({
            name: "Current Categories",
            value: current.categories
              .map(
                c =>
                  `${c.emoji || "🎫"} **${c.name}**`
              )
              .join("\\n")
              .slice(0, 1024)
          });
        } else {
          categoryEmbed.addFields({
            name: "Current Categories",
            value: "No categories added yet."
          });
        }

        await interaction.reply({
          embeds: [categoryEmbed],
          components: [categoryButtons],
          ephemeral: true
        });

        return true;
      }

      /*
       * ADD CATEGORY
       */

      if (
        interaction.customId ===
        "ticket_add_category"
      ) {
        const current = getPanel(
          interaction.user.id
        );

        if (!current) {
          await interaction.reply({
            content:
              "❌ Ticket setup expired. Run `/ticket setup` again.",
            ephemeral: true
          });

          return true;
        }

        const modal = new ModalBuilder()
          .setCustomId(
            "ticket_category_modal"
          )
          .setTitle("Add Ticket Category");

        const name =
          new TextInputBuilder()
            .setCustomId("category_name")
            .setLabel("Category Name")
            .setPlaceholder(
              "Example: General Support"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(80);

        const description =
          new TextInputBuilder()
            .setCustomId(
              "category_description"
            )
            .setLabel("Description")
            .setPlaceholder(
              "Example: Get help from our support team"
            )
            .setStyle(
              TextInputStyle.Paragraph
            )
            .setRequired(true)
            .setMaxLength(200);

        const emoji =
          new TextInputBuilder()
            .setCustomId("category_emoji")
            .setLabel("Custom Emoji")
            .setPlaceholder(
              "🎫 or <:support:123456789>"
            )
            .setStyle(
              TextInputStyle.Short
            )
            .setRequired(true)
            .setMaxLength(100);

        modal.addComponents(
          new ActionRowBuilder()
            .addComponents(name),

          new ActionRowBuilder()
            .addComponents(description),

          new ActionRowBuilder()
            .addComponents(emoji)
        );

        await interaction.showModal(
          modal
        );

        return true;
      }

      /*
       * EXIT
       */

      if (
        interaction.customId ===
        "ticket_setup_exit"
      ) {
        const data = load();

        delete data.panels[
          interaction.user.id
        ];

        save(data);

        await interaction.update({
          content:
            "❌ Ticket setup cancelled.",
          embeds: [],
          components: []
        });

        return true;
      }

      return false;
    }

    /*
     * ================================
     * MODALS
     * ================================
     */

    if (interaction.isModalSubmit()) {

      /*
       * PANEL TITLE
       */

      if (
        interaction.customId ===
        "ticket_modal_title"
      ) {
        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.title =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            `✅ Title set to **${panel.title}**.`,
          ephemeral: true
        });

        return true;
      }

      /*
       * DESCRIPTION
       */

      if (
        interaction.customId ===
        "ticket_modal_description"
      ) {
        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.description =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            "✅ Description saved.",
          ephemeral: true
        });

        return true;
      }

      /*
       * COLOR
       */

      if (
        interaction.customId ===
        "ticket_modal_color"
      ) {
        const value =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        if (
          !/^#?[0-9A-Fa-f]{6}$/.test(
            value
          )
        ) {
          await interaction.reply({
            content:
              "❌ Invalid color. Use HEX like `#00FFFF`.",
            ephemeral: true
          });

          return true;
        }

        const color =
          value.startsWith("#")
            ? value
            : `#${value}`;

        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.color = color;

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            `✅ Color set to **${color}**.`,
          ephemeral: true
        });

        return true;
      }

      /*
       * IMAGE
       */

      if (
        interaction.customId ===
        "ticket_modal_image"
      ) {
        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.image =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            "✅ Image saved.",
          ephemeral: true
        });

        return true;
      }

      /*
       * THUMBNAIL
       */

      if (
        interaction.customId ===
        "ticket_modal_thumbnail"
      ) {
        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.thumbnail =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            "✅ Thumbnail saved.",
          ephemeral: true
        });

        return true;
      }

      /*
       * JSON
       */

      if (
        interaction.customId ===
        "ticket_modal_json"
      ) {
        const value =
          interaction.fields
            .getTextInputValue("value")
            .trim();

        try {
          JSON.parse(value);
        } catch {
          await interaction.reply({
            content:
              "❌ Invalid JSON.",
            ephemeral: true
          });

          return true;
        }

        const data = load();
        const panel =
          data.panels[
            interaction.user.id
          ] || basePanel(
            interaction.user.id
          );

        panel.json = value;

        data.panels[
          interaction.user.id
        ] = panel;

        save(data);

        await interaction.reply({
          content:
            "✅ JSON saved.",
          ephemeral: true
        });

        return true;
      }

      /*
       * CATEGORY MODAL
       */

      if (
        interaction.customId ===
        "ticket_category_modal"
      ) {
        const data = load();

        data.panels[
          interaction.user.id
        ] ??= {
          title: null,
          description: null,
          color: null,
          image: null,
          thumbnail: null,
          json: null,
          categories: []
        };

        data.panels[
          interaction.user.id
        ].categories ??= [];

        const category = {
          id:
            `category_${Date.now()}`,
          name:
            interaction.fields
              .getTextInputValue(
                "category_name"
              )
              .trim(),

          description:
            interaction.fields
              .getTextInputValue(
                "category_description"
              )
              .trim(),

          emoji:
            interaction.fields
              .getTextInputValue(
                "category_emoji"
              )
              .trim(),

          discordCategoryId: null,
          staffRoleId: null
        };

        data.panels[
          interaction.user.id
        ].categories.push(
          category
        );

        save(data);

        const channelRow =
          new ActionRowBuilder().addComponents(
            new (require("discord.js").ChannelSelectMenuBuilder)()
              .setCustomId(
                `ticket_channel_category_${category.id}`
              )
              .setPlaceholder(
                "📁 Select Discord Category"
              )
              .setChannelTypes(
                require("discord.js").ChannelType.GuildCategory
              )
              .setMinValues(1)
              .setMaxValues(1)
          );

        const roleRow =
          new ActionRowBuilder().addComponents(
            new (require("discord.js").RoleSelectMenuBuilder)()
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
            `✅ **${category.name}** created.\n\n` +
            "📁 Select Discord Category\n" +
            "👮 Select Staff Role",
          components: [
            channelRow,
            roleRow
          ],
          ephemeral: true
        });

        return true;
      }

      return false;
    }

    return false;
  },

  setupEmbed,
  setupButtons,
  basePanel
};
