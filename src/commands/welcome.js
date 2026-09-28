const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../utils/welcomeConfig');

function render(text, member) {
  return String(text || '')
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{memberCount}', String(member.guild.memberCount))
    .replaceAll('{userId}', member.id)
    .replaceAll('{serverId}', member.guild.id);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Manage the Welcome system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('enable').setDescription('Enable Welcome'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable Welcome'))
    .addSubcommand(s => s.setName('channel').setDescription('Set welcome channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)))
    .addSubcommand(s => s.setName('message').setDescription('Set welcome message').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true).setMaxLength(2000)))
    .addSubcommand(s => s.setName('image').setDescription('Set welcome image URL').addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(true)))
    .addSubcommand(s => s.setName('test').setDescription('Test the welcome message'))
    .addSubcommand(s => s.setName('status').setDescription('Show Welcome settings')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const current = config.get(guildId);

    if (sub === 'enable') config.update(guildId, { enabled: true });
    if (sub === 'disable') config.update(guildId, { enabled: false });
    if (sub === 'channel') config.update(guildId, { channelId: interaction.options.getChannel('channel').id });
    if (sub === 'message') config.update(guildId, { message: interaction.options.getString('message') });
    if (sub === 'image') {
      const url = interaction.options.getString('url');
      if (!/^https?:\/\/\S+$/i.test(url)) return interaction.reply({ content: '❌ Invalid image URL.', ephemeral: true });
      config.update(guildId, { image: url });
    }
    if (sub === 'test') {
      const target = current.channelId ? interaction.guild.channels.cache.get(current.channelId) : interaction.channel;
      if (!target?.isTextBased()) return interaction.reply({ content: '❌ Welcome channel is not available.', ephemeral: true });
      const payload = { content: render(current.message, interaction.member) };
      if (current.embed) {
        const embed = new EmbedBuilder().setDescription(render(current.message, interaction.member)).setColor(current.embedColor || '#5865F2');
        if (current.image) embed.setImage(current.image);
        payload.content = undefined;
        payload.embeds = [embed];
      }
      await target.send(payload);
    }
    if (sub === 'status') {
      const c = config.get(guildId);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👋 Welcome System').setColor('#5865F2').addFields(
        { name: 'Status', value: c.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
        { name: 'Channel', value: c.channelId ? `<#${c.channelId}>` : 'Not configured', inline: true },
        { name: 'DM', value: c.dmEnabled ? '🟢 Enabled' : '🔴 Disabled', inline: true }
      )], ephemeral: true });
    }
    if (sub !== 'test' && sub !== 'status') return interaction.reply({ content: `✅ Welcome system **${sub === 'enable' ? 'enabled' : sub === 'disable' ? 'disabled' : 'updated'}**.`, ephemeral: true });
    if (sub === 'test') return interaction.reply({ content: '✅ Welcome test sent.', ephemeral: true });
  }
};
