import fs from "node:fs";
const t = fs.readFileSync("scripts/check/schema-check.mjs","utf8");
const L = t.split(/\r?\n/);
console.log("LEN", t.length, "lines", L.length);
const re = /action|overlay/i;
L.forEach((l,i)=>{ if(re.test(l) && l.trim().length<260) console.log((i+1)+": "+l.trim().slice(0,240)); });
