import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
const re = /interactions|PMS_PAGE_SCHEMA/;
L.forEach((l,i)=>{ if(re.test(l)) console.log((i+1)+" LEN"+l.length+": "+l.trim().slice(0,200)); });
console.log("=== page-runtime.js interactions ===");
const R = fs.readFileSync("prototype-resources/components/page-runtime.js","utf8").split(/\r?\n/);
R.forEach((l,i)=>{ if(/interaction|PMS_PAGE_SCHEMA/.test(l)) console.log((i+1)+": "+l.trim().slice(0,200)); });
