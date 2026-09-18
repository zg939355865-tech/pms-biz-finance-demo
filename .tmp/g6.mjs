import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
for (let i=963;i<982;i++){ console.log("### LINE "+(i+1)+" (len "+L[i].length+")"); console.log(L[i]); }
