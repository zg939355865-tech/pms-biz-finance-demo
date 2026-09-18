import fs from "node:fs";
const L=fs.readFileSync("inputs/md/pages/procurement/purchase-invoice.md","utf8").split(/\r?\n/);
[64,65,66,67,68,69,70,71,72,73].forEach(i=>console.log((i+1)+"|"+L[i]));
console.log("...");
[244,245,246,247,248,249,250,251,252].forEach(i=>console.log((i+1)+"|"+L[i]));
console.log("...");
[286,287,288,289].forEach(i=>console.log((i+1)+"|"+L[i]));
