import fs from "node:fs";
const files = fs.readdirSync("scripts/check").filter(f=>f.endsWith(".mjs"));
const hits=[];
for(const f of files){const t=fs.readFileSync("scripts/check/"+f,"utf8");if(t.includes("purchase-invoice"))hits.push(f);}
console.log("smokes referencing purchase-invoice:", hits.join(", ")||"(none)");
const t=fs.readFileSync("scripts/lib/playwright-smoke.mjs","utf8");
console.log("=== playwright-smoke exports ===");
console.log(t.split(/\r?\n/).filter(l=>/^export |^  [a-zA-Z]+\(|^function /.test(l)).slice(0,60).join("\n"));
console.log("LEN", t.length);
