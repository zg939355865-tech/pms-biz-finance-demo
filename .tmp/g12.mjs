import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
console.log("=== renderModal (754) ===");
console.log(L[753]);
console.log("=== 1032-1040 ===");
for(let i=1031;i<1040;i++) console.log((i+1)+" LEN"+L[i].length+": "+L[i].trim().slice(0,400));
