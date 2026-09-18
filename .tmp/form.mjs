import fs from "node:fs";
const s=JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const d=s.regions.find(r=>r.component==="ProTabsDetail");
const basic=d.tabs[0].children.find(n=>n.component==="DetailForm"||n.component==="Form");
console.log("form fields:");
(basic.fields||[]).forEach(f=>console.log(" -",f.code,"|",f.label,"|",f.component,"| required:",!!f.required,"| readonly:",!!f.readonly||!!f.inputReadonly,"| target:",f.target||"","| value:",JSON.stringify(f.value??""),"| options:",JSON.stringify((f.options||[]).slice(0,6))));
console.log("suppliers:",JSON.stringify(s.mockData.suppliers));
console.log("pageActions:",JSON.stringify(s.pageActions));
