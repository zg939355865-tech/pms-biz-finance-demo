import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
const re = /aggregat/i;
L.forEach((l,i)=>{ if(re.test(l)) console.log((i+1)+" LEN"+l.length+": "+l.trim().slice(0,180)); });
