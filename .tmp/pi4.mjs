import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
console.log("=== detailLinkages ===");
console.log(JSON.stringify(s.detailLinkages,null,1).slice(0,6000));
