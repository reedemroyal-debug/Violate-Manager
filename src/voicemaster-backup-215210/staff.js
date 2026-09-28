const fs=require("fs");
const path=require("path");
const file=path.join(__dirname,"staff.json");

function load(){
  try{
    if(!fs.existsSync(file)) fs.writeFileSync(file,"{}");
    return JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{return {}}
}
function save(x){fs.writeFileSync(file,JSON.stringify(x,null,2))}
function get(g){return load()[g]||{}}
function setup(g,roleId){const x=load();x[g]={roleId,enabled:true};save(x)}
function isStaff(member){
  const x=get(member?.guild?.id);
  return !!(x.enabled&&x.roleId&&member.roles.cache.has(x.roleId));
}
module.exports={load,save,get,setup,isStaff};
