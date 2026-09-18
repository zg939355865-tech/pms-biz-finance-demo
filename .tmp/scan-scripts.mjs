import fs from "node:fs";
import path from "node:path";
function walk(dir, out=[]) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p,out); else if(e.name.endsWith(".html")) out.push(p); } return out; }
const files = walk("pages");
const stats=[];
for (const f of files) {
  const t=fs.readFileSync(f,"utf8");
  const inline=(t.match(/<script(?![^>]*src=)[^>]*>/g)||[]).length;
  if(inline>1) stats.push([f,inline]);
}
console.log("pages total:", files.length);
console.log("pages with >1 inline script:", stats.length);
stats.slice(0,40).forEach(s=>console.log(s[0], s[1]));
