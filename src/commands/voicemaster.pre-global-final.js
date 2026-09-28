const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const manager = require("../voicemaster/manager");

const CATEGORY = "༺🔊 VIOLATE VC MASTER ༻";
const CONTROL = "🎛️・vc-control";
const MASTER = "ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("voicemaster")
    .setDescription("VoiceMaster configuration")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s =>
      s.setName("setup").setDescription("Setup VoiceMaster")
    ),

  async execute(i) {
    if (!i.guild) return;

    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return i.reply({
        content: "❌ Manage Server permission required.",
        ephemeral: true
      });
    }

    await i.deferReply({ ephemeral: true });

    const guild = i.guild;

    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name === CATEGORY
    );

    if (!category) {
      category = await guild.channels.create({
        name: CATEGORY,
        type: ChannelType.GuildCategory
      });
    }

    let control = guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildText &&
        c.name === CONTROL &&
        c.parentId === category.id
    );

    if (!control) {
      control = await guild.channels.create({
        name: CONTROL,
        type: ChannelType.GuildText,
        parent: category.id
      });
    }

    let master = guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildVoice &&
        c.name === MASTER &&
        c.parentId === category.id
    );

    if (!master) {
      master = await guild.channels.create({
        name: MASTER,
        type: ChannelType.GuildVoice,
        parent: category.id
      });
    }

    manager.setup(
      guild.id,
      category.id,
      master.id,
      control.id
    );

    const panel = require("../events/voiceMaster");
    await panel.setupPanel(guild, control);

    await i.editReply(
      `✅ **VoiceMaster Setup Complete!**\n\n` +
      `📁 ${category}\n` +
      `🎛️ ${control}\n` +
      `🔊 ${master}\n\n` +
      `⚡ Global control panel is ready.`
    );
  }
};
