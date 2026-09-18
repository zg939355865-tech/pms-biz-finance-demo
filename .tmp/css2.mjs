import fs from "node:fs";
const t = fs.readFileSync("prototype-resources/components/components.css","utf8");
const keys = ["schema-signed-negative","schema-signed-positive","schema-alert","pro-alert","pro-amount-summary","pro-amount-item","pro-amount-value","pro-amount-label","schema-danger-link"];
const lines = t.split(/\r?\n/);
keys.forEach(k=>{
  lines.forEach((l,i)=>{ if(l.includes("."+k)) console.log((i+1)+": "+l.trim().slice(0,220)); });
});
