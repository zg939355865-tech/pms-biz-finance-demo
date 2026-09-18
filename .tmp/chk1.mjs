import fs from "node:fs";
for (const f of ["scripts/check/schema-page-smoke.mjs","scripts/check/all-pages-desktop-check.mjs","scripts/check/harness-check.mjs","scripts/check/component-coverage-check.mjs"]) {
  const t = fs.readFileSync(f,"utf8");
  const L=t.split(/\r?\n/);
  console.log("### "+f+" LEN "+t.length+" lines "+L.length);
  console.log(L.slice(0,28).join("\n").slice(0,1800));
  console.log("");
}
