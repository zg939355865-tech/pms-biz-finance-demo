import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/cost/purchase-price-variance.json","utf8"));
console.log("pageName:", s.pageName, "| menuPath:", s.menuPath, "| pageType:", s.pageType, "| template:", s.template);
const scan=(n,where)=>{ if(Array.isArray(n))return n.forEach(x=>scan(x,where)); if(n&&typeof n==="object"){ if(n.component==="ProTable"||n.component==="EditableTable"){ console.log("TABLE",where,n.id||"",n.dataSource||""); console.log("  cols:",(n.columns||[]).map(c=>c.code+":"+c.label+"("+c.component+(c.signed?",signed":"")+")").join(" | ")); } if(n.component==="Modal") console.log("MODAL",where,n.id,n.title); Object.entries(n).forEach(([k,v])=>scan(v,where+"."+k)); } };
scan(s.regions,"regions"); scan(s.overlays||[],"overlays");
console.log("mock keys:", Object.keys(s.mockData||{}).join(", "));
const first = Object.values(s.mockData||{})[0];
console.log("sample row:", JSON.stringify(Array.isArray(first)?first[0]:first));
