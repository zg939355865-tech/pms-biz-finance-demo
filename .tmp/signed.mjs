import fs from "node:fs";
import path from "node:path";
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,out);else if(e.name.endsWith(".json"))out.push(p);}return out;}
for(const f of walk("schemas/pages")){
  const t=fs.readFileSync(f,"utf8");
  if(!/"signed"\s*:\s*true/.test(t)) continue;
  const s=JSON.parse(t);
  const found=[];
  const scan=(n)=>{ if(Array.isArray(n))return n.forEach(scan); if(n&&typeof n==="object"){ if(n.signed===true) found.push((n.code||"")+":"+(n.label||"")); Object.values(n).forEach(scan); } };
  scan(s.regions); scan(s.overlays);
  console.log(path.basename(f), "->", found.join(" | "));
}
