import fs from "node:fs";
const s=JSON.parse(fs.readFileSync("schemas/pages/procurement/purchase-invoice.json","utf8"));
const ol=s.mockData.availableOrderLines, rl=s.mockData.availableReceiptLines;
console.log("=== availableOrderLines ===");
ol.forEach(r=>console.log(`${r.purchaseOrderNo}/${r.purchaseOrderLineNo} ${r.itemName} 合同=${r.contractName} 供应商=${r.supplierCode} 项目=${r.projectCode} 暂估=${r.estimatedUnitPrice} 订单价=${r.taxIncludedUnitPrice} 业务=${r.businessType}`));
console.log("=== availableReceiptLines (可选：|已验票|<|已入库|) ===");
rl.forEach(r=>{const ok=Math.abs(r.invoicedQuantity)<Math.abs(r.receiptQuantity);console.log(`${ok?"可选":"排除"} ${r.purchaseOrderNo}/${r.purchaseOrderLineNo} ${r.itemName} 合同=${r.contractName} 来源=${r.sourceType} ${r.purchaseReceiptNo||r.serviceSettlementNo}/${r.purchaseReceiptLineNo||r.serviceSettlementLineNo} 性质=${r.receiptNature} 入库/结算数量=${r.receiptQuantity} 已验票=${r.invoicedQuantity} 含税单价=${r.taxIncludedUnitPrice} 供应商=${r.supplierCode} 项目=${r.projectCode}`);});
