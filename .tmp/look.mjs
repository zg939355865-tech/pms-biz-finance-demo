import fs from "node:fs";
const L = fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8").split(/\r?\n/);
const i = L.findIndex(l=>l.includes('"availableOrderLines": ['));
console.log("start line", i+1);
for(let k=i;k<i+30;k++) console.log((k+1)+"|"+JSON.stringify(L[k]));
