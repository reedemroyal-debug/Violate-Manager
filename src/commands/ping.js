const {SlashCommandBuilder}=require("discord.js");
module.exports={data:new SlashCommandBuilder().setName("ping").setDescription("Check bot latency"),execute:async i=>i.reply(`🏓 Pong! ${i.client.ws.ping}ms`)};
