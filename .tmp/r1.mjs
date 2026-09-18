import fs from "node:fs";
const t = fs.readFileSync("prototype-resources/components/page-runtime.js","utf8");
console.log("LEN", t.length, "lines", t.split(/\r?\n/).length);
const L = t.split(/\r?\n/);
const re = /aggregationDetailField|aggregation|estimated|暂估/;
L.forEach((l,i)=>{ if(re.test(l)) console.log((i+1)+" LEN"+l.length+": "+l.trim().slice(0,180)); });
