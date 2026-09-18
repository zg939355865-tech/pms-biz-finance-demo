import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
console.log("=== 1028 ==="); console.log(L[1027]);
console.log("=== 1031 ==="); console.log(L[1030].slice(0,1400));
console.log("=== 1016 validateActionRules (first 2500) ==="); console.log(L[1015].slice(0,2500));
