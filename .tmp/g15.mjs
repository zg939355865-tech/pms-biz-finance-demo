import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
for(let i=524;i<545;i++) console.log((i+1)+" LEN"+L[i].length+": "+L[i].trim().slice(0,700));
console.log("=== registry columnComponents ===");
const r = JSON.parse(fs.readFileSync("prototype-resources/components/component-registry.json","utf8"));
console.log(JSON.stringify(r.columnComponents.map(c=>c.name||c.code||c),null,0));
console.log(JSON.stringify(r.columnComponents,null,1).slice(0,2500));
