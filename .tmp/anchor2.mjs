import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
const s=L[477]; const i=s.indexOf("editable-row-template");
console.log("...template logic...", s.slice(Math.max(0,i-900), i+400));
const raw = fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8").split(/\r?\n/);
const d = raw.findIndex(l=>l.includes('"detailLinkages"'));
console.log("=== detailLinkages at line "+(d+1)+" ; preceding 14 lines ===");
for(let k=d-14;k<=d+1;k++)console.log((k+1)+"|"+raw[k]);
