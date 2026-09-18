import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const d = s.regions.find(r=>r.component==="ProTabsDetail");
console.log("detail id:", d && d.id, "tabs:", (d&&d.tabs||[]).map(t=>t.key+":"+t.label).join(", "));
function tables(nodes,where){ (nodes||[]).forEach(n=>{ if(n.component==="ProTable"||n.component==="EditableTable"){ console.log(where,"TABLE",n.id||"",n.dataSource||"","minWidth",n.minWidth); console.log("   cols:",(n.columns||[]).map(c=>c.code+":"+c.label).join(" | ")); console.log("   actions:",JSON.stringify(n.actions||[])); console.log("   rowActions:",JSON.stringify(n.rowActions||[])); } if(n.children) tables(n.children,where); }); }
(d&&d.tabs||[]).forEach(t=>tables(t.children,"tab:"+t.key));
tables(s.regions,"region");
console.log("mock keys:", Object.keys(s.mockData||{}));
console.log("orderItems sample:", JSON.stringify((s.mockData.orderItems||[])[0]||{},null,1).slice(0,1200));
