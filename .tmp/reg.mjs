import fs from "node:fs";
const r = JSON.parse(fs.readFileSync("prototype-resources/components/component-registry.json","utf8"));
console.log("keys:", Object.keys(r).join(", "));
console.log("components:", (r.components||[]).map(c=>c.name||c.component||c).join(", "));
if (r.fieldComponents) console.log("fieldComponents:", Object.keys(r.fieldComponents).join(", "));
if (r.columnComponents) console.log("columnComponents:", Object.keys(r.columnComponents).join(", "));
