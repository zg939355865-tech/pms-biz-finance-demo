import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
console.log(JSON.stringify(s.rules,null,1));
