import fs from "node:fs";
const p="scripts/check/purchase-invoice-price-difference-smoke.mjs";
let t=fs.readFileSync(p,"utf8");
const old="expect(JSON.stringify(carriedEstimated.sort()) === JSON.stringify([8800, 15200]), width + ': 订单行未携带暂估单价，实际=' + JSON.stringify(carriedEstimated));";
const neu="expect(JSON.stringify(carriedEstimated.slice().sort((left, right) => left - right)) === JSON.stringify([8800, 15200]), width + ': 订单行未携带暂估单价，实际=' + JSON.stringify(carriedEstimated));";
if(!t.includes(old)) throw new Error("anchor missing");
fs.writeFileSync(p,t.replace(old,neu),"utf8");
console.log("patched");
