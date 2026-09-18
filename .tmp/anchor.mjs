import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
L.forEach((l,i)=>{ if(/editable-row-template|empty-row-template/.test(l)) console.log((i+1)+" LEN"+l.length+": "+l.trim().slice(0,260)); });
const raw = fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8").split(/\r?\n/);
console.log("=== overlays end (1640-1660) ===");
for(let k=1639;k<1660;k++)console.log((k+1)+"|"+raw[k]);
console.log("=== rules end (1700-1740) ===");
for(let k=1699;k<1740;k++)console.log((k+1)+"|"+raw[k]);
