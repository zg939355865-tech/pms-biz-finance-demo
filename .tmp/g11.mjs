import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
L.forEach((l,i)=>{ if(/validateActionRules\(|validateMatchingTableConsistency\(|validateListContextRules\(/.test(l)) console.log((i+1)+" LEN"+l.length+": "+l.trim().slice(0,300)); });
console.log("=== line 806 full ===");
console.log(L[805]);
