const {
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const manager = require("../voicemaster/manager");
const staff = require("../voicemaster/staff");

const MASTER = "ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ";

let refreshTimer = null;

function getRooms(guild) {
  return manager.getRooms(guild.id) || [];
}

function ownRoom(guild, userId) {
  return getRooms(guild).find(r => r.ownerId === userId);
}

function panel(guild) {
  const rooms = getRooms(guild);

  const select = new StringSelectMenuBuilder()
    .setCustomId("vm_select")
    .setPlaceholder("🎙️ Select your Voice Channel")
    .addOptions(
      rooms.length
        ? rooms.map(r => ({
            label: `${r.name || "My Voice"}`.slice(0, 100),
            description: "Control your own Voice Channel",
            value: r.channelId
          }))
        : [{
            label: "No active Voice Channels",
            description: "Join the master channel first",
            value: "none"
          }]
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("vm_lock")
      .setLabel("Lock")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("vm_unlock")
      .setLabel("Unlock")
      .setEmoji("🔓")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("vm_rename")
      .setLabel("Rename")
      .setEmoji("✏️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("vm_delete")
      .setLabel("Delete")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Secondary)
  );

  return [
    new ActionRowBuilder().addComponents(select),
    buttons
  ];
}

function embed() {
  return new EmbedBuilder()
    .setColor(0x00d9ff)
    .setTitle("🎛️ VIOLATE VoiceMaster")
    .setDescription(
      "Create and control your temporary Voice Channel.\n\n" +
      "🎙️ **How to use**\n" +
      "Join `ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ` and your personal VC will be created automatically.\n\n" +
      "🔒 **Lock** — Hide/block normal members\n" +
      "🔓 **Unlock** — Allow members again\n" +
      "✏️ **Rename** — Rename your VC\n" +
      "🗑️ **Delete** — Delete your VC\n\n" +
      "🛡️ Staff can bypass locked VCs but cannot control another owner's VC."
    )
    .setFooter({ text: "VIOLATE GAMINGZ • VoiceMaster" });
}

async function setupPanel(guild, channel) {
  let message = null;

  const oldId = manager.get?.(guild.id)?.controlMessageId;

  if (oldId) {
    try {
      message = await channel.messages.fetch(oldId);
    } catch {}
  }

  if (!message) {
    const messages = await channel.messages.fetch({ limit: 20 });
    message = messages.find(
      m =>
        m.author.id === guild.members.me?.id &&
        m.embeds?.[0]?.title === "🎛️ VIOLATE VoiceMaster"
    );
  }

  if (message) {
    await message.edit({
      embeds: [embed()],
      components: panel(guild)
    });
  } else {
    message = await channel.send({
      embeds: [embed()],
      components: panel(guild)
    });
  }

  if (manager.setControlMessageId) {
    manager.setControlMessageId(guild.id, message.id);
  }

  return message;
}

function queueRefresh(guild) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      const data = manager.get?.(guild.id);
      if (!data?.controlChannelId) return;

      const channel = guild.channels.cache.get(data.controlChannelId);
      if (channel) await setupPanel(guild, channel);
    } catch {}
  }, 500);
}

async function createRoom(guild, member) {
  if (!member?.voice?.channel) return;
  if (member.voice.channel.name !== MASTER) return;
  if (member.user.bot) return;

  const existing = ownRoom(guild, member.id);
  if (existing) {
    const ch = guild.channels.cache.get(existing.channelId);
    if (ch) {
      await member.voice.setChannel(ch).catch(() => {});
      return;
    }
  }

  const data = manager.get(guild.id);
  if (!data?.categoryId) return;

  const room = await guild.channels.create({
    name: `🎙️・${member.user.username}`,
    type: ChannelType.GuildVoice,
    parent: data.categoryId,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        allow: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: member.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak,
          PermissionsBitField.Flags.Stream
        ]
      }
    ]
  });

  manager.addRoom(guild.id, {
    channelId: room.id,
    ownerId: member.id,
    name: room.name
  });

  await member.voice.setChannel(room).catch(() => {});
  queueRefresh(guild);
}

async function cleanup(guild, channel) {
  const room = getRooms(guild).find(r => r.channelId === channel.id);
  if (!room) return;

  if (channel.members.size === 0) {
    manager.removeRoom(guild.id, channel.id);
    await channel.delete("VoiceMaster empty").catch(() => {});
    queueRefresh(guild);
  }
}

async function handle(i) {
  if (!i.guild) return false;

  if (i.customId === "vm_select") {
    const id = i.values?.[0];
    if (!id || id === "none") {
      await i.reply({ content: "❌ You don't have an active VC.", ephemeral: true });
      return true;
    }

    const room = getRooms(i.guild).find(r => r.channelId === id);

    if (!room || room.ownerId !== i.user.id) {
      await i.reply({
        content: "❌ You can control only your own VC.",
        ephemeral: true
      });
      return true;
    }

    await i.reply({
      content: `✅ Selected **${room.name}**. Now use the buttons below.`,
      ephemeral: true
    });
    return true;
  }

  if (!["vm_lock", "vm_unlock", "vm_rename", "vm_delete"].includes(i.customId))
    return false;

  const room = ownRoom(i.guild, i.user.id);

  if (!room) {
    await i.reply({
      content: "❌ You don't own an active Voice Channel.",
      ephemeral: true
    });
    return true;
  }

  const channel = i.guild.channels.cache.get(room.channelId);

  if (!channel) {
    manager.removeRoom(i.guild.id, room.channelId);
    await i.reply({ content: "❌ Your VC no longer exists.", ephemeral: true });
    return true;
  }

  if (i.customId === "vm_lock") {
    const everyone = i.guild.roles.everyone;

    await channel.permissionOverwrites.edit(everyone, {
      ViewChannel: false,
      Connect: false
    });

    const s = staff.get(i.guild.id);
    if (s?.roleId) {
      const role = i.guild.roles.cache.get(s.roleId);
      if (role) {
        await channel.permissionOverwrites.edit(role, {
          ViewChannel: true,
          Connect: true
        });
      }
    }

    await i.reply({ content: "🔒 Your VC is now locked and hidden.", ephemeral: true });
    queueRefresh(i.guild);
    return true;
  }

  if (i.customId === "vm_unlock") {
    await channel.permissionOverwrites.edit(i.guild.roles.everyone, {
      ViewChannel: true,
      Connect: true
    });

    await i.reply({ content: "🔓 Your VC is unlocked.", ephemeral: true });
    queueRefresh(i.guild);
    return true;
  }

  if (i.customId === "vm_delete") {
    manager.removeRoom(i.guild.id, channel.id);
    await channel.delete("VoiceMaster owner deleted VC").catch(() => {});
    await i.reply({ content: "🗑️ Your VC was deleted.", ephemeral: true });
    queueRefresh(i.guild);
    return true;
  }

  if (i.customId === "vm_rename") {
    const modal = new ModalBuilder()
      .setCustomId("vm_rename_modal")
      .setTitle("Rename Voice Channel");

    const input = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("New channel name")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80)
      .setValue(channel.name);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    await i.showModal(modal);
    return true;
  }

  return false;
}

async function handleModal(i) {
  if (i.customId !== "vm_rename_modal") return false;

  const room = ownRoom(i.guild, i.user.id);

  if (!room) {
    await i.reply({ content: "❌ You don't own an active VC.", ephemeral: true });
    return true;
  }

  const channel = i.guild.channels.cache.get(room.channelId);
  if (!channel) {
    await i.reply({ content: "❌ VC not found.", ephemeral: true });
    return true;
  }

  const name = i.fields.getTextInputValue("name").trim();
  if (!name) {
    await i.reply({ content: "❌ Invalid name.", ephemeral: true });
    return true;
  }

  await channel.setName(name);
  manager.updateRoom?.(i.guild.id, room.channelId, { name });

  await i.reply({
    content: `✏️ VC renamed to **${name}**.`,
    ephemeral: true
  });

  queueRefresh(i.guild);
  return true;
}

function init(client) {
  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      if (newState.channel?.name === MASTER) {
        await createRoom(newState.guild, newState.member);
      }

      if (oldState.channel) {
        await cleanup(oldState.guild, oldState.channel);
      }
    } catch (e) {
      console.error("VoiceMaster:", e);
    }
  });

  client.on("interactionCreate", async i => {
    try {
      if (i.isStringSelectMenu() || i.isButton()) {
        await handle(i);
      }

      if (i.isModalSubmit()) {
        await handleModal(i);
      }
    } catch (e) {
      console.error("VoiceMaster interaction:", e);
    }
  });
}

module.exports = {
  init,
  setupPanel,
  handle,
  handleModal
};
