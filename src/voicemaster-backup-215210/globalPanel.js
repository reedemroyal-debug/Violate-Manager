const{
 ActionRowBuilder,StringSelectMenuBuilder,ButtonBuilder,ButtonStyle,
 EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,ChannelType,
 PermissionFlagsBits
}=require("discord.js");

const vm=require("./manager");
const staff=require("./staff");

const CATEGORY="༺🔊 VIOLATE VC MASTER ༻";
const MASTER="ᴊᴏɪɴ・ᴛᴏ・ᴄʀᴇᴀᴛᴇ";
const CONTROL="🎛️・vc-control";

function rooms(g){
 const c=g.channels.cache.find(x=>x.type===ChannelType.GuildCategory&&x.name===CATEGORY);
 if(!c)return[];
 return [...c.children.cache.values()].filter(x=>x.type===ChannelType.GuildVoice&&x.name!==MASTER);
}

function owner(g,id){
 try{return vm.findOwnerRoom(g.id,id)}catch{return null}
}

async function panel(g){
 const cfg=vm.get?vm.get(g.id):null;
 const cid=cfg?.controlId||cfg?.controlChannelId;
 if(!cid)return;

 const ch=g.channels.cache.get(cid);
 if(!ch)return;

 const list=rooms(g).slice(0,25);

 const menu=new StringSelectMenuBuilder()
  .setCustomId("vmsg_select")
  .setPlaceholder(list.length?"Select your VC":"No active VCs")
  .setDisabled(!list.length)
  .addOptions(list.map(x=>({
   label:x.name.slice(0,100),
   value:x.id,
   description:`Owner: ${x.members.find(m=>owner(g,m.id)===x.id)?.user.username||"Unknown"}`
  })));

 const embed=new EmbedBuilder()
  .setColor(0x5865f2)
  .setTitle("🎛️ VIOLATE VC CONTROL")
  .setDescription("Select **your own** temporary VC to control it.\n\n🔒 Lock • 🔓 Unlock • ✏️ Rename • 👥 Limit");

 const row1=new ActionRowBuilder().addComponents(menu);
 const row2=new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId("vmsg_lock").setLabel("Lock").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  new ButtonBuilder().setCustomId("vmsg_unlock").setLabel("Unlock").setEmoji("🔓").setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId("vmsg_rename").setLabel("Rename").setEmoji("✏️").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId("vmsg_refresh").setLabel("Refresh").setEmoji("🔄").setStyle(ButtonStyle.Secondary)
 );

 const msgs=await ch.messages.fetch({limit:10}).catch(()=>null);
 const old=msgs?.find(m=>m.author.id===g.client.user.id);

 if(old) return old.edit({embeds:[embed],components:[row1,row2]}).catch(()=>{});
 return ch.send({embeds:[embed],components:[row1,row2]}).catch(()=>{});
}

const selected=new Map();

async function handle(i){
 if(!i.guild)return false;

 if(i.isStringSelectMenu()&&i.customId==="vmsg_select"){
  const id=i.values[0];
  const own=owner(i.guild,i.user.id);

  if(own!==id){
   return i.reply({content:"❌ You can control only your own VC.",ephemeral:true}).then(()=>true);
  }

  selected.set(i.user.id,id);
  await i.reply({content:"✅ Your VC selected.",ephemeral:true});
  return true;
 }

 if(!i.isButton()||!i.customId.startsWith("vmsg_"))return false;

 if(i.customId==="vmsg_refresh"){
  await panel(i.guild);
  await i.reply({content:"🔄 Panel refreshed.",ephemeral:true});
  return true;
 }

 const id=selected.get(i.user.id);
 const own=owner(i.guild,i.user.id);

 if(!id||own!==id){
  await i.reply({content:"❌ Select your own VC first.",ephemeral:true});
  return true;
 }

 const ch=i.guild.channels.cache.get(id);
 if(!ch){
  selected.delete(i.user.id);
  await i.reply({content:"❌ Your VC no longer exists.",ephemeral:true});
  return true;
 }

 if(i.customId==="vmsg_lock"){
  await ch.permissionOverwrites.edit(i.guild.roles.everyone.id,{ViewChannel:false,Connect:false}).catch(()=>{});
  const cfg=staff.get(i.guild.id);
  if(cfg?.roleId)await ch.permissionOverwrites.edit(cfg.roleId,{ViewChannel:true,Connect:true}).catch(()=>{});
  await i.reply({content:"🔒 Your VC is now locked and hidden.",ephemeral:true});
  return true;
 }

 if(i.customId==="vmsg_unlock"){
  await ch.permissionOverwrites.edit(i.guild.roles.everyone.id,{ViewChannel:true,Connect:true}).catch(()=>{});
  await i.reply({content:"🔓 Your VC is unlocked.",ephemeral:true});
  return true;
 }

 if(i.customId==="vmsg_rename"){
  const m=new ModalBuilder().setCustomId(`vmsg_rename:${id}`).setTitle("Rename VC");
  const t=new TextInputBuilder().setCustomId("name").setLabel("New VC Name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(ch.name);
  m.addComponents(new ActionRowBuilder().addComponents(t));
  await i.showModal(m);
  return true;
 }

 return true;
}

async function modal(i){
 if(!i.isModalSubmit()||!i.customId.startsWith("vmsg_rename:"))return false;

 const id=i.customId.split(":")[1];
 const own=owner(i.guild,i.user.id);

 if(own!==id){
  await i.reply({content:"❌ You can rename only your own VC.",ephemeral:true});
  return true;
 }

 const ch=i.guild.channels.cache.get(id);
 if(!ch)return true;

 const name=i.fields.getTextInputValue("name").trim();
 if(name)await ch.setName(name).catch(()=>{});

 await i.reply({content:"✏️ VC renamed.",ephemeral:true});
 return true;
}

module.exports={panel,handle,modal};
