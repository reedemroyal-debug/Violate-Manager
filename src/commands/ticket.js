const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const { getGuild, updateGuild } =
  require("../utils/ticketStore");

const DEF = {
  title: "🎫 Support",
  description: "Click the button below to create a ticket.",
  color: "#5865F2",
  image: "",
  thumbnail: "",
  buttonText: "Create Ticket",
  buttonEmoji: "🎫",
  categoryId: "",
  staffRoleId: "",
  logChannelId: ""
};

function cfg(id) {
  const c = getGuild(id);
  c.setup = { ...DEF, ...(c.setup || {}) };
  c.tickets ??= {};
  updateGuild(id, c);
  return c;
}

function validURL(x) {
  if (!x) return true;
  try {
    return ["http:", "https:"].includes(new URL(x).protocol);
  } catch {
    return false;
  }
}

function validColor(x) {
  return /^#[0-9A-Fa-f]{6}$/.test(x);
}

function emoji(x) {
  if (!x) return null;
  const m = x.match(/^<(a?):(\w+):(\d+)>$/);

  if (m)
    return {
      id: m[3],
      name: m[2],
      animated: m[1] === "a"
    };

  return { name: x };
}

function setupEmbed(s) {
  const e = new EmbedBuilder()
    .setTitle(s.title)
    .setDescription(s.description)
    .setColor(s.color);

  if (s.image) e.setImage(s.image);
  if (s.thumbnail) e.setThumbnail(s.thumbnail);

  return e;
}

function ticketButton(s) {
  const b = new ButtonBuilder()
    .setCustomId("ticket_create")
    .setLabel(s.buttonText || "Create Ticket")
    .setStyle(ButtonStyle.Primary);

  try {
    if (s.buttonEmoji)
      b.setEmoji(emoji(s.buttonEmoji));
  } catch {
    b.setEmoji("🎫");
  }

  return b;
}

function setupPanel() {
  const b = (id, label, em, style = ButtonStyle.Secondary) =>
    new ButtonBuilder()
      .setCustomId(id)
      .setLabel(label)
      .setEmoji(em)
      .setStyle(style);

  return [
    new ActionRowBuilder().addComponents(
      b("ticket_title", "Title", "📝", ButtonStyle.Primary),
      b("ticket_desc", "Description", "📄", ButtonStyle.Primary),
      b("ticket_color", "Color", "🎨")
    ),
    new ActionRowBuilder().addComponents(
      b("ticket_image", "Image URL", "🖼️"),
      b("ticket_thumb", "Thumbnail", "🔍"),
      b("ticket_button", "Button", "🔘")
    ),
    new ActionRowBuilder().addComponents(
      b("ticket_category", "Category", "📂"),
      b("ticket_staff", "Staff Role", "👮"),
      b("ticket_logs", "Logs", "📋")
    ),
    new ActionRowBuilder().addComponents(
      b("ticket_preview", "Preview", "👀", ButtonStyle.Primary),
      b("ticket_save", "Save", "💾", ButtonStyle.Success)
    )
  ];
}

function modal(id, title, fields) {
  return new ModalBuilder()
    .setCustomId(id)
    .setTitle(title)
    .addComponents(
      ...fields.map(f =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(f.id)
            .setLabel(f.label)
            .setStyle(f.style || TextInputStyle.Short)
            .setRequired(f.required ?? true)
            .setValue(f.value || "")
            .setPlaceholder(f.placeholder || "")
        )
      )
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    )
    .addSubcommand(s =>
      s.setName("setup")
        .setDescription("Configure ticket system")
    )
    .addSubcommand(s =>
      s.setName("panel")
        .setDescription("Send the ticket panel")
        .addChannelOption(o =>
          o.setName("channel")
            .setDescription("Channel for ticket panel")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(i) {
    const c = cfg(i.guild.id);
    const s = c.setup;

    if (i.options.getSubcommand() === "panel") {
      if (!s.categoryId || !s.staffRoleId)
        return i.reply({
          content:
            "❌ Pehle `/ticket setup` mein Category aur Staff Role set karo.",
          ephemeral: true
        });

      const ch = i.options.getChannel("channel");

      await ch.send({
        embeds: [setupEmbed(s)],
        components: [
          new ActionRowBuilder().addComponents(
            ticketButton(s)
          )
        ]
      });

      return i.reply({
        content: `✅ Ticket panel sent in ${ch}.`,
        ephemeral: true
      });
    }

    return i.reply({
      embeds: [setupEmbed(s)],
      components: setupPanel(),
      ephemeral: true
    });
  },

  async handle(i) {
    if (!i.customId?.startsWith("ticket_"))
      return false;

    const c = cfg(i.guild.id);
    const s = c.setup;

    /* CREATE TICKET */

    if (i.customId === "ticket_create") {
      const old = Object.values(c.tickets)
        .find(t => t.userId === i.user.id && t.open);

      if (old) {
        const ch = i.guild.channels.cache.get(old.channelId);

        return i.reply({
          content: ch
            ? `❌ You already have a ticket: ${ch}`
            : "❌ You already have an open ticket.",
          ephemeral: true
        });
      }

      const channel = await i.guild.channels.create({
        name: `ticket-${i.user.username}`.toLowerCase().slice(0, 90),
        type: ChannelType.GuildText,
        parent: s.categoryId,
        permissionOverwrites: [
          {
            id: i.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: i.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: s.staffRoleId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ]
          },
          {
            id: i.client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels
            ]
          }
        ]
      });

      c.tickets[channel.id] = {
        channelId: channel.id,
        userId: i.user.id,
        open: true,
        createdAt: Date.now()
      };

      updateGuild(i.guild.id, c);

      const close = new ButtonBuilder()
        .setCustomId("ticket_close")
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      await channel.send({
        content: `${i.user} <@&${s.staffRoleId}>`,
        embeds: [
          new EmbedBuilder()
            .setTitle("🎫 Ticket Created")
            .setDescription(
              "Support team will assist you here.\n\n" +
              "Click **Close Ticket** when your issue is resolved."
            )
            .setColor(s.color)
        ],
        components: [
          new ActionRowBuilder().addComponents(close)
        ]
      });

      if (s.logChannelId) {
        const log = i.guild.channels.cache.get(s.logChannelId);

        if (log)
          await log.send(
            `🎫 Ticket created: ${channel} by ${i.user.tag}`
          ).catch(() => {});
      }

      return i.reply({
        content: `✅ Your ticket has been created: ${channel}`,
        ephemeral: true
      });
    }

    /* CLOSE TICKET */

    if (i.customId === "ticket_close") {
      const t = c.tickets[i.channel.id];

      if (!t)
        return i.reply({
          content: "❌ This is not a ticket.",
          ephemeral: true
        });

      t.open = false;
      t.closedAt = Date.now();
      t.closedBy = i.user.id;

      updateGuild(i.guild.id, c);

      await i.reply("🔒 Ticket closing...");

      setTimeout(() => {
        i.channel.delete().catch(() => {});
      }, 3000);

      return true;
    }

    /* SETUP MODALS */

    const M = {
      ticket_title: [
        "ticket_m_title",
        "Ticket Title",
        [{ id: "v", label: "Title", value: s.title }]
      ],

      ticket_desc: [
        "ticket_m_desc",
        "Ticket Description",
        [{
          id: "v",
          label: "Description",
          style: TextInputStyle.Paragraph,
          value: s.description
        }]
      ],

      ticket_color: [
        "ticket_m_color",
        "Embed Color",
        [{
          id: "v",
          label: "HEX Color",
          value: s.color,
          placeholder: "#5865F2"
        }]
      ],

      ticket_image: [
        "ticket_m_image",
        "Image URL",
        [{
          id: "v",
          label: "Image URL",
          value: s.image,
          required: false,
          placeholder: "https://..."
        }]
      ],

      ticket_thumb: [
        "ticket_m_thumb",
        "Thumbnail URL",
        [{
          id: "v",
          label: "Thumbnail URL",
          value: s.thumbnail,
          required: false,
          placeholder: "https://..."
        }]
      ],

      ticket_button: [
        "ticket_m_button",
        "Ticket Button",
        [
          {
            id: "text",
            label: "Button Text",
            value: s.buttonText
          },
          {
            id: "emoji",
            label: "Emoji / Custom Emoji",
            value: s.buttonEmoji,
            required: false,
            placeholder: "🎫 or <:name:id>"
          }
        ]
      ]
    };

    if (M[i.customId]) {
      const [id, title, fields] = M[i.customId];
      await i.showModal(modal(id, title, fields));
      return true;
    }

    /* MODAL SUBMIT */

    if (i.isModalSubmit()) {
      const v = id =>
        i.fields.getTextInputValue(id).trim();

      if (i.customId === "ticket_m_title")
        s.title = v("v");

      if (i.customId === "ticket_m_desc")
        s.description = v("v");

      if (i.customId === "ticket_m_color") {
        if (!validColor(v("v")))
          return i.reply({
            content: "❌ Invalid HEX color.",
            ephemeral: true
          });

        s.color = v("v").toUpperCase();
      }

      if (i.customId === "ticket_m_image") {
        if (!validURL(v("v")))
          return i.reply({
            content: "❌ Invalid image URL.",
            ephemeral: true
          });

        s.image = v("v");
      }

      if (i.customId === "ticket_m_thumb") {
        if (!validURL(v("v")))
          return i.reply({
            content: "❌ Invalid thumbnail URL.",
            ephemeral: true
          });

        s.thumbnail = v("v");
      }

      if (i.customId === "ticket_m_button") {
        s.buttonText =
          v("text") || "Create Ticket";

        s.buttonEmoji =
          v("emoji") || "🎫";
      }

      updateGuild(i.guild.id, c);

      return i.reply({
        embeds: [setupEmbed(s)],
        components: setupPanel(),
        ephemeral: true
      });
    }

    /* CATEGORY */

    if (i.customId === "ticket_category") {
      const m = new ChannelSelectMenuBuilder()
        .setCustomId("ticket_cat")
        .setPlaceholder("Select ticket category")
        .setChannelTypes(ChannelType.GuildCategory);

      return i.update({
        content: "📂 Select ticket category:",
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(m)
        ]
      });
    }

    /* STAFF */

    if (i.customId === "ticket_staff") {
      const m = new RoleSelectMenuBuilder()
        .setCustomId("ticket_role")
        .setPlaceholder("Select staff role");

      return i.update({
        content: "👮 Select staff role:",
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(m)
        ]
      });
    }

    /* LOGS */

    if (i.customId === "ticket_logs") {
      const m = new ChannelSelectMenuBuilder()
        .setCustomId("ticket_log")
        .setPlaceholder("Select log channel")
        .setChannelTypes(ChannelType.GuildText);

      return i.update({
        content: "📋 Select log channel:",
        embeds: [],
        components: [
          new ActionRowBuilder().addComponents(m)
        ]
      });
    }

    if (i.isChannelSelectMenu()) {
      if (i.customId === "ticket_cat")
        s.categoryId = i.values[0];

      if (i.customId === "ticket_log")
        s.logChannelId = i.values[0];

      updateGuild(i.guild.id, c);

      return i.update({
        content: null,
        embeds: [setupEmbed(s)],
        components: setupPanel()
      });
    }

    if (i.isRoleSelectMenu()) {
      s.staffRoleId = i.values[0];

      updateGuild(i.guild.id, c);

      return i.update({
        content: null,
        embeds: [setupEmbed(s)],
        components: setupPanel()
      });
    }

    /* PREVIEW */

    if (i.customId === "ticket_preview") {
      return i.reply({
        content: "👀 Ticket Preview",
        embeds: [setupEmbed(s)],
        components: [
          new ActionRowBuilder().addComponents(
            ticketButton(s)
          )
        ],
        ephemeral: true
      });
    }

    /* SAVE */

    if (i.customId === "ticket_save") {
      if (!s.title || !s.description)
        return i.reply({
          content:
            "❌ Title and Description required.",
          ephemeral: true
        });

      if (!s.categoryId || !s.staffRoleId)
        return i.reply({
          content:
            "❌ Select Category and Staff Role first.",
          ephemeral: true
        });

      updateGuild(i.guild.id, c);

      return i.update({
        content:
          "✅ Ticket configuration saved!\n\nUse `/ticket panel` to send the public ticket panel.",
        embeds: [setupEmbed(s)],
        components: []
      });
    }

    return true;
  }
};
