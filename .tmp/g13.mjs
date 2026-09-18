import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
for(let i=940;i<968;i++) console.log((i+1)+" LEN"+L[i].length+": "+L[i].trim().slice(0,500));
