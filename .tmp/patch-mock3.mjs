import fs from "node:fs";
const p = "schemas/pages/procurement/purchase-invoice.json";
const raw = fs.readFileSync(p, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let lines = raw.split(/\r?\n/);
const overrides = { "PO20260818003|2": 66000, "PO20260821002|2": 8800 };
const report = [];

function processArray(arrayKey, useOverrides) {
  let start = -1;
  while ((start = lines.findIndex((l, i) => i > start && new RegExp('^\\s*"' + arrayKey + '": \\[$').test(l))) >= 0) {
    const indent = lines[start].match(/^\s*/)[0];
    let end = start + 1;
    while (end < lines.length && lines[end] !== indent + "]," && lines[end] !== indent + "]") end += 1;
    if (end >= lines.length) break;
    const objectIndent = indent + "  ";
    let i = start + 1;
    const inserts = [];
    while (i < end) {
      if (lines[i] === objectIndent + "{") {
        let j = i + 1;
        while (j < end && lines[j] !== objectIndent + "}" && lines[j] !== objectIndent + "},") j += 1;
        const text = lines.slice(i, j + 1).join("\n").replace(/,(\s*[}\]])/g, "$1");
        let row = null;
        try { row = JSON.parse(text); } catch (error) { report.push("PARSE FAIL @" + (i + 1) + " " + error.message); }
        if (row && Object.prototype.hasOwnProperty.call(row, "taxIncludedUnitPrice") && !Object.prototype.hasOwnProperty.call(row, "estimatedUnitPrice")) {
          const key = row.purchaseOrderNo + "|" + row.purchaseOrderLineNo;
          const value = useOverrides && overrides[key] !== undefined ? overrides[key] : row.taxIncludedUnitPrice;
          const priceIndex = lines.slice(i, j + 1).findIndex((l) => l.includes('"taxIncludedUnitPrice"'));
          const absolute = i + priceIndex;
          const hasComma = lines[absolute].trimEnd().endsWith(",");
          if (!hasComma) lines[absolute] = lines[absolute].replace(/\s*$/, ",");
          inserts.push({ at: absolute + 1, text: objectIndent + '  "estimatedUnitPrice": ' + value + (hasComma ? "," : "") });
          report.push(key + " " + row.itemName + " 暂估=" + value + " 含税=" + row.taxIncludedUnitPrice);
        }
        i = j + 1;
      } else i += 1;
    }
    for (let k = inserts.length - 1; k >= 0; k -= 1) lines.splice(inserts[k].at, 0, inserts[k].text);
    if (inserts.length) return processArray(arrayKey, useOverrides);
  }
}

processArray("availableOrderLines", true);
fs.writeFileSync(p, lines.join(eol), "utf8");
const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
console.log(report.join("\n"));
console.log("--- verify availableOrderLines ---");
console.log(parsed.mockData.availableOrderLines.map((r) => r.purchaseOrderNo + "/" + r.purchaseOrderLineNo + " " + r.itemName + " 暂估" + r.estimatedUnitPrice + " 含税" + r.taxIncludedUnitPrice + " 差" + (r.taxIncludedUnitPrice - r.estimatedUnitPrice)).join("\n"));
