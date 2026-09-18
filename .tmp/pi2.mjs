import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const o = s.overlays.find(x=>x.id==="purchase-order-line-picker");
console.log(JSON.stringify(o,null,1).slice(0,4000));
console.log("=== availableOrderLines[0] ===");
console.log(JSON.stringify((s.mockData.availableOrderLines||[])[0]||{},null,1));
console.log("count", (s.mockData.availableOrderLines||[]).length);
