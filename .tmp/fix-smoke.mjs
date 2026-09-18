import fs from "node:fs";
const p="scripts/check/purchase-invoice-price-difference-smoke.mjs";
let t=fs.readFileSync(p,"utf8");
const old="  await orderTable.locator('[data-act=\"open\"][data-target=\"purchase-receipt-line-picker\"]').click();";
const neu="  const settlementTable = detail.locator('#purchase-invoice-settlement-items');\n  await settlementTable.locator('[data-act=\"open\"][data-target=\"purchase-receipt-line-picker\"]').click();";
if(!t.includes(old)) throw new Error("anchor missing");
t=t.replace(old,neu);
fs.writeFileSync(p,t,"utf8");
console.log("patched");
