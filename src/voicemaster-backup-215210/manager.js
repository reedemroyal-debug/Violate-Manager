const fs=require("fs");
const path=require("path");

const file=path.join(__dirname,"data.json");

let data={guilds:{}};
let loaded=false;
let saveTimer=null;

function load(){
 if(loaded)return data;
 try{
  data=JSON.parse(fs.readFileSync(file,"utf8"));
 }catch{
  data={guilds:{}};
 }
 if(!data.guilds)data.guilds={};
 loaded=true;
 return data;
}

function scheduleSave(){
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{
  try{
   fs.writeFileSync(file,JSON.stringify(data,null,2));
  }catch(e){
   console.error("VoiceMaster save:",e.message);
  }
 },250);
}

function get(guildId){
 load();
 return data.guilds[guildId]||null;
}

function setup(guildId,categoryId,masterId,controlId){
 load();
 const old=data.guilds[guildId];
 data.guilds[guildId]={
  categoryId,
  masterId,
  controlId,
  controlMessageId:old?.controlMessageId||null,
  rooms:old?.rooms||{}
 };
 scheduleSave();
}

function setControlMessage(guildId,messageId){
 load();
 if(!data.guilds[guildId])return;
 data.guilds[guildId].controlMessageId=messageId;
 scheduleSave();
}

function addRoom(guildId,channelId,ownerId){
 load();
 const g=data.guilds[guildId];
 if(!g)return;
 g.rooms[channelId]={
  ownerId,
  createdAt:Date.now()
 };
 scheduleSave();
}

function removeRoom(guildId,channelId){
 load();
 const g=data.guilds[guildId];
 if(!g)return;
 delete g.rooms[channelId];
 scheduleSave();
}

function getRoom(guildId,channelId){
 return get(guildId)?.rooms?.[channelId]||null;
}

function findOwnerRoom(guildId,ownerId){
 const rooms=get(guildId)?.rooms;
 if(!rooms)return null;

 for(const id in rooms){
  if(rooms[id].ownerId===ownerId)return id;
 }

 return null;
}

function getRooms(guildId){
 return get(guildId)?.rooms||{};
}

module.exports={
 load,
 get,
 setup,
 setControlMessage,
 addRoom,
 removeRoom,
 getRoom,
 findOwnerRoom,
 getRooms
};
