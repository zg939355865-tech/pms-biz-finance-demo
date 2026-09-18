import fs from "node:fs";
const t = fs.readFileSync("scripts/generate/page-from-schema.mjs","utf8");
console.log("validateActionRules tail:", t.split(/\r?\n/)[1015].slice(-700));
const anchors = [
  "function validateMatchingTableConsistency(action){",
  "var pendingDeleteTarget=null;",
  "delete confirmedTarget.dataset.confirmedDelete;}return;}",
  "var submitStatus=target.dataset.nextStatus||'';",
];
anchors.forEach(a=>{
  const n = t.split(a).length-1;
  console.log("count="+n+"  anchor: "+a.slice(0,70));
});
console.log("EOL crlf:", t.includes("\r\n"));
