import fs from "node:fs";
import path from "node:path";
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith(".html"))out.push(p);}return out;}
const files=walk("pages");
let withHook=0, without=[];
for(const f of files){const t=fs.readFileSync(f,"utf8");if(t.includes("preparePeriodCloseModal"))withHook++;else without.push(f);}
console.log("pages:",files.length,"with shared runtime hook:",withHook);
console.log("without:",without.slice(0,20).join("\n"));
