const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder
} = require("discord.js");

const vm = require("./manager");
const staff = require("./staff");

const CATEGORY = "༺🔊 VIOLATE VC MASTER ༻";
const MASTER = "ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ";
const CONTROL = "🎛️・vc-control";

const selected = new Map();

function rooms(guild) {
  const cfg = vm.get(guild.id);
  if (!cfg?.rooms) return [];

  return Object.entries(cfg.rooms)
    .map(([channelId, room]) => {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) return null;

      return {
        channel,
        channelId,
        ownerId: room.ownerId
      };
    })
    .filter(Boolean);
}

function ownRoom(guild, userId) {
  const cfg = vm.get(guild.id);
  if (!cfg?.rooms) return null;

  for (const [channelId, room] of Object.entries(cfg.rooms)) {
    if (room.ownerId === userId) {
      const channel = guild.channels.cache.get(channelId);
      if (channel) return channel;
    }
  }

  return null;
}

function selectedRoom(guild, userId) {
  const id = selected.get(userId);
  if (!id) return null;

  const own = ownRoom(guild, userId);

  if (!own || own.id !== id) return null;

  return own;
}

function payload(guild) {
  const list = rooms(guild).slice(0, 25);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("vmsg_select")
    .setPlaceholder(
      list.length ? "🎙️ Select your own VC" : "No active VCs"
    )
    .setDisabled(!list.length);

  if (list.length) {
    menu.addOptions(
      list.map(r => ({
        label: r.channel.name.slice(0, 100),
        description: `Owner: ${guild.members.cache.get(r.ownerId)?.user.username || "Unknown"}`,
        value: r.channelId
      }))
    );
  } else {
    menu.addOptions({
      label: "No active Voice Channels",
      value: "none"
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0x00d9ff)
    .setTitle("🎛️ VIOLATE VC MASTER")
    .setDescription(
      "Create and manage your temporary Voice Channel.\n\n" +
      "🎙️ Join `ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ` to create your VC.\n\n" +
      "Select **your own VC** below, then use the controls.\n\n" +
      "🔒 Lock / Unlock\n" +
      "✏️ Rename\n" +
      "👥 User Limit\n" +
      "👢 Kick Member\n" +
      "👑 Transfer Ownership\n" +
      "🗑️ Delete VC"
    )
    .setFooter({
      text: "VIOLATE GAMINGZ • VoiceMaster"
    });

  const row1 = new ActionRowBuilder().addComponents(menu);

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vmsg_lock")
      .setLabel("Lock")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("vmsg_unlock")
      .setLabel("Unlock")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("vmsg_rename")
      .setLabel("Rename")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("vmsg_limit")
      .setLabel("Limit")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vmsg_kick")
      .setLabel("Kick")
      .setEmoji("👢")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("vmsg_transfer")
      .setLabel("Transfer")
      .setEmoji("👑")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("vmsg_delete")
      .setLabel("Delete VC")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId("vmsg_refresh")
      .setLabel("Refresh")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row1, row2, row3]
  };
}

async function panel(guild) {
  const cfg = vm.get(guild.id);

  const controlId = cfg?.controlId;

  if (!controlId) return;

  const control = guild.channels.cache.get(controlId);

  if (!control) return;

  const messages = await control.messages
    .fetch({ limit: 20 })
    .catch(() => null);

  const old = messages?.find(
    m =>
      m.author.id === guild.client.user.id &&
      m.embeds?.[0]?.title === "🎛️ VIOLATE VC MASTER"
  );

  const data = payload(guild);

  if (old) {
    await old.edit(data).catch(() => {});
    return;
  }

  await control.send(data).catch(() => {});
}

async function handle(interaction) {
  if (!interaction.guild) return false;

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === "vmsg_select"
  ) {
    const id = interaction.values[0];

    if (id === "none") {
      await interaction.reply({
        content: "❌ No active VC.",
        ephemeral: true
      });
      return true;
    }

    const own = ownRoom(
      interaction.guild,
      interaction.user.id
    );

    if (!own || own.id !== id) {
      await interaction.reply({
        content: "❌ You can control only your own VC.",
        ephemeral: true
      });
      return true;
    }

    selected.set(interaction.user.id, id);

    await interaction.reply({
      content: `✅ Selected **${own.name}**.`,
      ephemeral: true
    });

    return true;
  }

  if (
    interaction.isUserSelectMenu() &&
    (
      interaction.customId === "vmsg_kick_select" ||
      interaction.customId === "vmsg_transfer_select"
    )
  ) {
    const channel = selectedRoom(
      interaction.guild,
      interaction.user.id
    );

    if (!channel) {
      await interaction.reply({
        content: "❌ Select your own VC first.",
        ephemeral: true
      });
      return true;
    }

    const targetId = interaction.values[0];

    if (!channel.members.has(targetId)) {
      await interaction.reply({
        content: "❌ That member is not inside your VC.",
        ephemeral: true
      });
      return true;
    }

    const target =
      interaction.guild.members.cache.get(targetId);

    if (!target) return true;

    if (interaction.customId === "vmsg_kick_select") {
      await target.voice
        .disconnect("VIOLATE VC MASTER owner kick")
        .catch(() => {});

      await interaction.update({
        content: `👢 <@${targetId}> was kicked from your VC.`,
        components: []
      });

      return true;
    }

    if (interaction.customId === "vmsg_transfer_select") {
      const oldOwner = interaction.user.id;

      const cfg = vm.get(interaction.guild.id);

      if (!cfg?.rooms?.[channel.id]) {
        await interaction.update({
          content: "❌ VC data not found.",
          components: []
        });
        return true;
      }

      cfg.rooms[channel.id].ownerId = targetId;
      vm.save(vm.load());

      await channel.permissionOverwrites.edit(
        oldOwner,
        {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          ManageChannels: false,
          MoveMembers: false
        }
      );

      await channel.permissionOverwrites.edit(
        targetId,
        {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          ManageChannels: true,
          MoveMembers: true
        }
      );

      selected.delete(oldOwner);
      selected.set(targetId, channel.id);

      await interaction.update({
        content: `👑 Ownership transferred to <@${targetId}>.`,
        components: []
      });

      return true;
    }
  }

  if (!interaction.isButton()) return false;

  if (!interaction.customId.startsWith("vmsg_"))
    return false;

  if (interaction.customId === "vmsg_refresh") {
    await panel(interaction.guild);

    await interaction.reply({
      content: "🔄 Panel refreshed.",
      ephemeral: true
    });

    return true;
  }

  const channel = selectedRoom(
    interaction.guild,
    interaction.user.id
  );

  if (!channel) {
    await interaction.reply({
      content: "❌ Select your own VC first.",
      ephemeral: true
    });
    return true;
  }

  if (interaction.customId === "vmsg_lock") {
    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      {
        ViewChannel: false,
        Connect: false
      }
    );

    const s = staff.get(interaction.guild.id);

    if (s?.roleId) {
      await channel.permissionOverwrites.edit(
        s.roleId,
        {
          ViewChannel: true,
          Connect: true
        }
      ).catch(() => {});
    }

    await interaction.reply({
      content: "🔒 Your VC is locked + hidden.",
      ephemeral: true
    });

    return true;
  }

  if (interaction.customId === "vmsg_unlock") {
    await channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      {
        ViewChannel: true,
        Connect: true
      }
    );

    await interaction.reply({
      content: "🔓 Your VC is unlocked.",
      ephemeral: true
    });

    return true;
  }

  if (interaction.customId === "vmsg_rename") {
    const modal = new ModalBuilder()
      .setCustomId(`vmsg_rename:${channel.id}`)
      .setTitle("Rename Voice Channel");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("New VC Name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100)
      .setValue(channel.name);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === "vmsg_limit") {
    const modal = new ModalBuilder()
      .setCustomId(`vmsg_limit:${channel.id}`)
      .setTitle("Set User Limit");

    const input = new TextInputBuilder()
      .setCustomId("limit")
      .setLabel("0 = Unlimited, max 99")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder("10");

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === "vmsg_kick") {
    const menu = new UserSelectMenuBuilder()
      .setCustomId("vmsg_kick_select")
      .setPlaceholder("👢 Select member to kick")
      .setMinValues(1)
      .setMaxValues(1);

    await interaction.reply({
      content: "👢 Select the member:",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });

    return true;
  }

  if (interaction.customId === "vmsg_transfer") {
    const menu = new UserSelectMenuBuilder()
      .setCustomId("vmsg_transfer_select")
      .setPlaceholder("👑 Select new owner")
      .setMinValues(1)
      .setMaxValues(1);

    await interaction.reply({
      content: "👑 Select the new owner:",
      components: [
        new ActionRowBuilder().addComponents(menu)
      ],
      ephemeral: true
    });

    return true;
  }

  if (interaction.customId === "vmsg_delete") {
    const id = channel.id;

    selected.delete(interaction.user.id);

    vm.removeRoom(
      interaction.guild.id,
      id
    );

    await channel
      .delete("VIOLATE VC MASTER owner deleted VC")
      .catch(() => {});

    await interaction.reply({
      content: "🗑️ Your VC was deleted.",
      ephemeral: true
    });

    return true;
  }

  return true;
}

async function modal(interaction) {
  if (!interaction.isModalSubmit()) return false;

  if (
    !interaction.customId.startsWith("vmsg_rename:") &&
    !interaction.customId.startsWith("vmsg_limit:")
  ) {
    return false;
  }

  const id = interaction.customId.split(":")[1];

  const own = ownRoom(
    interaction.guild,
    interaction.user.id
  );

  if (!own || own.id !== id) {
    await interaction.reply({
      content: "❌ You can control only your own VC.",
      ephemeral: true
    });
    return true;
  }

  if (interaction.customId.startsWith("vmsg_rename:")) {
    const name =
      interaction.fields.getTextInputValue("name").trim();

    if (!name) {
      await interaction.reply({
        content: "❌ Invalid name.",
        ephemeral: true
      });
      return true;
    }

    await own.setName(name);

    await interaction.reply({
      content: `✏️ VC renamed to **${name}**.`,
      ephemeral: true
    });

    return true;
  }

  const amount = Number(
    interaction.fields.getTextInputValue("limit").trim()
  );

  if (!Number.isInteger(amount) || amount < 0 || amount > 99) {
    await interaction.reply({
      content: "❌ Limit must be between 0 and 99.",
      ephemeral: true
    });
    return true;
  }

  await own.setUserLimit(amount);

  await interaction.reply({
    content:
      `👥 User limit: **${amount === 0 ? "Unlimited" : amount}**.`,
    ephemeral: true
  });

  return true;
}

module.exports = {
  panel,
  handle,
  modal
};
