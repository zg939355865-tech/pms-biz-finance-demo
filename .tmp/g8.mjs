import fs from "node:fs";
const L = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8").split(/\r?\n/);
L.forEach((l,i)=>{ if(/function tableRowsAsValues|function replaceEditableTableRows|function numericCellValue|function syncEditableCalculations|function rowValues|function setCalculatedCellValue/.test(l)) console.log((i+1)+" LEN"+l.length); });
const i = L.findIndex(l=>/function tableRowsAsValues/.test(l));
console.log("---- tableRowsAsValues ----");
console.log(L[i]);
const j = L.findIndex(l=>/function replaceEditableTableRows/.test(l));
console.log("---- replaceEditableTableRows ----");
console.log(L[j].slice(0,3200));
