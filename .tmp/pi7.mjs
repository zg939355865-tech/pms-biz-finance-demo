import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const d = s.regions.find(r=>r.component==="ProTabsDetail");
const t = d.tabs[0].children.find(n=>n.id==="purchase-invoice-order-items");
console.log(JSON.stringify(t.columns,null,1));
console.log("=== table keys ===", Object.keys(t).join(", "));
console.log("=== summaries ===", JSON.stringify(t.summaries||t.summary||null));
