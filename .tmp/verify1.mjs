import fs from "node:fs";
for (const f of ["outputs/reports/schema/procurement/purchase-invoice.json","outputs/reports/pages/procurement/purchase-invoice.json"]) {
  const r = JSON.parse(fs.readFileSync(f,"utf8"));
  console.log("###", f, "status:", r.status, "issues:", JSON.stringify(r.issues||r.errors||[]).slice(0,600));
}
const t = fs.readFileSync("pages/procurement/purchase-invoice.html","utf8");
console.log("overlay present:", t.includes('data-overlay="purchase-price-difference-modal"'));
const i = t.indexOf('data-overlay="purchase-price-difference-modal"');
const seg = t.slice(i, i+2600);
console.log("row template:", seg.includes("data-editable-row-template"), "| empty template:", seg.includes("data-empty-row-template"));
console.log("alert:", seg.includes('data-component="Alert"'), "| confirm btn:", t.includes('data-act="confirm-price-difference"'));
console.log("headers:", (seg.match(/<th[^>]*>([^<]*)<\/th>/g)||[]).map(x=>x.replace(/<[^>]+>/g,"")).join(" | "));
console.log("runtime hook:", t.includes("openPriceDifferenceConfirm"), t.includes("priceDifferenceSubmitRule"));
