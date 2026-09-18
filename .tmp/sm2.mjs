import fs from "node:fs";
const t=fs.readFileSync("scripts/check/inout-ledger-smoke.mjs","utf8");
console.log("LEN",t.length);
console.log(t);
