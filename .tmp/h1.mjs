import fs from "node:fs";
const t = fs.readFileSync("pages/procurement/purchase-invoice.html","utf8");
const idx = t.indexOf('data-data-source="orderItems"');
console.log("orderItems table snippet:");
console.log(t.slice(Math.max(0,idx-1200), idx+1500));
