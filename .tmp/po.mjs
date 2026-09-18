import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-order.json","utf8"));
function walk(n,cb,p=""){ if(Array.isArray(n)) return n.forEach((x,i)=>walk(x,cb,p+"["+i+"]")); if(n&&typeof n==="object"){ cb(n,p); Object.entries(n).forEach(([k,v])=>walk(v,cb,p+"."+k)); } }
walk(s.regions,(n,p)=>{ if(n.component==="ProTable"||n.component==="EditableTable"){ console.log("TABLE",p,n.id||"",n.dataSource||""); console.log("  cols:",(n.columns||[]).map(c=>c.code+":"+c.label).join(" | ")); } });
console.log("mock keys:", Object.keys(s.mockData||{}));
