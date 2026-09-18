import fs from "node:fs";
const m = JSON.parse(fs.readFileSync("schemas/meta/pms-page-schema-v2.schema.json","utf8"));
console.log("additionalProperties:", m.additionalProperties);
console.log("props:", Object.keys(m.properties||{}).join(", "));
console.log("defs:", Object.keys(m["$defs"]||m.definitions||{}).join(", "));
