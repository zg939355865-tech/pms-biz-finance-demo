import fs from "node:fs";
const t = fs.readFileSync("inputs/md/pages/procurement/purchase-invoice.md","utf8").split(/\r?\n/);
console.log("total lines", t.length);
console.log(t.slice(190,300).map((l,i)=>(191+i)+": "+l).join("\n"));
