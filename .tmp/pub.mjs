import fs from "node:fs";
const t = fs.readFileSync("pub/pages/procurement/purchase-invoice.html","utf8");
console.log("pub has 暂估:", t.includes("暂估"));
const i = t.indexOf('id="purchase-invoice-order-items"');
const seg = t.slice(i, t.indexOf("</thead>", i));
const heads = [...seg.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>m[1].replace(/<[^>]+>/g,"").trim());
console.log("pub order headers:", JSON.stringify(heads));
