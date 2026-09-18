import fs from "node:fs";
const p="schemas/pages/procurement/purchase-invoice.json";
const raw=fs.readFileSync(p,"utf8");
const eol=raw.includes("\r\n")?"\r\n":"\n";
let L=raw.split(/\r?\n/);
const bad=L.findIndex(l=>l.trim()==='"code": "estimatedUnitPrice",');
if(bad>=0){
  const start=bad-1, end=bad+6;
  const expect=[/^\s*\{$/,/^\s*"code": "estimatedUnitPrice",$/,/^\s*"label": "暂估单价",$/,/^\s*"component": "money",$/,/^\s*"editable": false,$/,/^\s*"align": "right",$/,/^\s*"width": 128$/,/^\s*\},?$/];
  for(let k=start;k<=end;k++){ if(!expect[k-start].test(L[k])) throw new Error("unexpected line "+(k+1)+": "+L[k]); }
  L.splice(start,8);
  console.log("removed bad block");
}
JSON.parse(L.join("\n"));
const idx=L.findIndex(l=>l.trim()==='"code": "verificationQuantity",');
if(idx<0) throw new Error("anchor missing");
const openLine=idx-1;
const closeIndent=L[openLine].match(/^\s*/)[0];
const indent=L[idx].match(/^\s*/)[0];
let j=idx+1;
while(!(L[j].trim()==="},"||L[j].trim()==="}") || L[j].match(/^\s*/)[0]!==closeIndent) j+=1;
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
const text=L.join(eol);
fs.writeFileSync(p,text,"utf8");
const s=JSON.parse(text);
const d=s.regions.find(r=>r.component==="ProTabsDetail");
const t=d.tabs[0].children.find(n=>n.id==="purchase-invoice-order-items");
console.log("order columns:", t.columns.map(c=>c.label).join(" | "));
