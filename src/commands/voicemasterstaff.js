const{SlashCommandBuilder,PermissionFlagsBits}=require("discord.js");
const staff=require("../voicemaster/staff");

module.exports={
 data:new SlashCommandBuilder()
  .setName("voicemasterstaff")
  .setDescription("Configure Voice Master staff access.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(s=>s.setName("setup").setDescription("Set Voice Master staff role.")
   .addRoleOption(o=>o.setName("role").setDescription("Staff role").setRequired(true))),
 async execute(i){
  if(!i.guild)return;
  if(!i.member.permissions.has(PermissionFlagsBits.ManageGuild))
   return i.reply({content:"❌ Manage Server permission required.",ephemeral:true});
  const role=i.options.getRole("role");
  staff.setup(i.guild.id,role.id);
  return i.reply({content:`✅ Staff role set to <@&${role.id}>.\n\n🛡️ Staff can bypass locked/hidden VCs but can control only their own VC.`,ephemeral:true});
 }
};
