import fs from "node:fs";
const p="schemas/pages/procurement/purchase-invoice.json";
const raw=fs.readFileSync(p,"utf8");
const L=raw.split(/\r?\n/);
const i=L.findIndex(l=>l.includes('"resourceReference"'));
for(let k=i;k<i+16;k++)console.log((k+1)+"|"+L[k]);
