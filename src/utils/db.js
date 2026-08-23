const fs=require("fs"), path=require("path");
const file=path.join(__dirname,"../../data.json");
function load(){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return {warnings:{},tickets:{}};}}
function save(data){fs.writeFileSync(file,JSON.stringify(data,null,2));}
module.exports={load,save};
