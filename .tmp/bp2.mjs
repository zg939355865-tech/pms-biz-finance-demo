import fs from "node:fs";
const t = fs.readFileSync("inputs/md/pages/procurement/purchase-invoice.md","utf8").split(/\r?\n/);
t.forEach((l,i)=>{ if(/^#{1,3} /.test(l)) console.log((i+1)+": "+l); });
console.log("=== 台账 tail ===");
const g = fs.readFileSync("inputs/issue/需求变更台账.md","utf8").split(/\r?\n/);
console.log("lines", g.length);
console.log(g.slice(0,12).join("\n"));
console.log("...");
console.log(g.slice(-14).join("\n"));
