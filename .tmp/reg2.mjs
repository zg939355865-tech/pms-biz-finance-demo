import fs from "node:fs";
const r = JSON.parse(fs.readFileSync("prototype-resources/components/component-registry.json","utf8"));
console.log("=== categories ===");
(r.categories||[]).forEach(c=>console.log("-",c.name||c.category||JSON.stringify(c).slice(0,120)));
console.log("=== requiredComponentProperties ===");
console.log(JSON.stringify(r.requiredComponentProperties,null,1).slice(0,2000));
