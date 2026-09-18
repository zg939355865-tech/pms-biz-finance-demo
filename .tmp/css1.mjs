import fs from "node:fs";
for (const f of ["tokens.css","base.css","components.css","layout.css"]) {
  const t = fs.readFileSync("prototype-resources/components/"+f,"utf8");
  const re = /\.([a-z0-9-]*(danger|warn|error|negative|positive|success|amount|money|diff|highlight|alert|emphasis|strong)[a-z0-9-]*)/gi;
  const set = new Set(); let m;
  while((m=re.exec(t))) set.add(m[1]);
  console.log("### "+f+" -> "+[...set].sort().join(", "));
}
