const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const tracker = require('../utils/inviteTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('View and manage real invite statistics')
    .addSubcommand(s => s.setName('info').setDescription('Show invite stats').addUserOption(o => o.setName('user').setDescription('User').setRequired(false)))
    .addSubcommand(s => s.setName('leaderboard').setDescription('Show invite leaderboard'))
    .addSubcommand(s => s.setName('reset').setDescription('Reset a users invite stats').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('add').setDescription('Manually adjust tracked invites').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
    .addSubcommand(s => s.setName('logchannel').setDescription('Set invite log channel').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user') || interaction.user;

    if (sub === 'info') {
      const s = tracker.getStats(interaction.guild.id, target.id);
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📨 Invite Stats — ${target.tag}`).setColor('#5865F2').addFields(
        { name: 'Joins', value: String(s.joins || 0), inline: true },
        { name: 'Leaves', value: String(s.leaves || 0), inline: true },
        { name: 'Active', value: String(Math.max(0, (s.joins || 0) - (s.leaves || 0)),), inline: true }
      )], ephemeral: true });
    }
    if (sub === 'leaderboard') {
      const rows = tracker.getLeaderboard(interaction.guild.id).slice(0, 10);
      if (!rows.length) return interaction.reply({ content: '📭 No tracked invites yet.', ephemeral: true });
      const text = rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — **${r.joins}** joins | ${r.leaves} leaves | ${r.real} active`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 Invite Leaderboard').setDescription(text).setColor('#FEE75C')], ephemeral: true });
    }
    if (sub === 'reset') {
      tracker.reset(interaction.guild.id, target.id);
      return interaction.reply({ content: `✅ Invite stats reset for ${target}.`, ephemeral: true });
    }
    if (sub === 'add') {
      const amount = interaction.options.getInteger('amount');
      tracker.change(interaction.guild.id, target.id, amount);
      return interaction.reply({ content: `✅ Adjusted tracked invites for ${target} by **${amount}**.`, ephemeral: true });
    }
    if (sub === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      await tracker.setLogChannel(interaction.guild.id, channel.id);
      return interaction.reply({ content: `✅ Invite logs set to ${channel}.`, ephemeral: true });
    }
  }
};
