import fs from "node:fs";
const t = fs.readFileSync("pages/procurement/purchase-invoice.html","utf8");
const re = /aggregation/gi; let m,c=0; const idxs=[];
while((m=re.exec(t))){ c++; if(idxs.length<12) idxs.push(m.index); }
console.log("count", c);
idxs.forEach(i=>console.log("---", t.slice(Math.max(0,i-200), i+300).replace(/\s+/g," ")));
