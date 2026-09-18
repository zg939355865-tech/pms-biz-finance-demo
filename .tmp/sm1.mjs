import fs from "node:fs";
const t=fs.readFileSync("scripts/check/purchase-payment-pages-smoke.mjs","utf8");
console.log("LEN",t.length);
console.log(t.slice(0,5200));
