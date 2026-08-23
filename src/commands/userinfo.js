const {SlashCommandBuilder,EmbedBuilder}=require("discord.js");
const data=new SlashCommandBuilder().setName("userinfo").setDescription("Show user information").addUserOption(o=>o.setName("user").setDescription("User"));
module.exports={data,execute:async i=>{const u=i.options.getUser("user")||i.user;await i.reply({embeds:[new EmbedBuilder().setTitle("👤 User Info").addFields({name:"Username",value:u.tag},{name:"ID",value:u.id},{name:"Created",value:`<t:${Math.floor(u.createdTimestamp/1000)}:F>`})]})}};
