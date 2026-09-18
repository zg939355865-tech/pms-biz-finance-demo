import fs from "node:fs";
const s = JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const o = s.overlays.find(x=>x.id==="purchase-receipt-line-picker");
const clone = JSON.parse(JSON.stringify(o));
(clone.children||[]).forEach(c=>{ if(c.component==="ProTable") c.columns = (c.columns||[]).map(x=>x.code); if(c.component==="ProSearchForm") c.fields=(c.fields||[]).map(f=>f.code); });
console.log(JSON.stringify(clone,null,1));
