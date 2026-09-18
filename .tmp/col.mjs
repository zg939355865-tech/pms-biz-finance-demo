import fs from "node:fs";
const p="schemas/pages/procurement/purchase-invoice.json";
const raw=fs.readFileSync(p,"utf8");
const eol=raw.includes("\r\n")?"\r\n":"\n";
const L=raw.split(/\r?\n/);
const idx=L.findIndex(l=>l.trim()==='"code": "verificationQuantity",');
if(idx<0) throw new Error("anchor missing");
const indent=L[idx].match(/^\s*/)[0];
let j=idx+1;
while(!/^\s*\},?$/.test(L[j])) j+=1;
const closeIndent=L[j].match(/^\s*/)[0];
const block=[
closeIndent+"{",
indent+'"code": "estimatedUnitPrice",',
indent+'"label": "暂估单价",',
indent+'"component": "money",',
indent+'"editable": false,',
indent+'"align": "right",',
indent+'"width": 128',
closeIndent+"},"
];
L.splice(j+1,0,...block);
fs.writeFileSync(p,L.join(eol),"utf8");
const s=JSON.parse(fs.readFileSync(p,"utf8"));
const d=s.regions.find(r=>r.component==="ProTabsDetail");
const t=d.tabs[0].children.find(n=>n.id==="purchase-invoice-order-items");
console.log("order columns:", t.columns.map(c=>c.label).join(" | "));
