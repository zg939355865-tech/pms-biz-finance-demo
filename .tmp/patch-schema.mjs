import fs from "node:fs";
const p = "schemas/pages/procurement/purchase-invoice.json";
const raw = fs.readFileSync(p, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let lines = raw.split(/\r?\n/);

const overlayBlock = `    {
      "id": "purchase-price-difference-modal",
      "component": "Modal",
      "title": "采购价差明细",
      "size": "wide",
      "children": [
        {
          "component": "Alert",
          "type": "warning",
          "message": "以下订单行的含税单价与暂估单价不一致，请确认采购价差后再提交。",
          "description": "单位价差 = 含税单价 - 暂估单价；成本价差 = 单位价差 × 验票数量。超暂估标红、低于暂估标绿；取消返回修改，确认提交后继续原提交流程。"
        },
        {
          "component": "EditableTable",
          "id": "price-difference-table",
          "title": "价差明细",
          "showTitle": false,
          "dataSource": "priceDifferenceItems",
          "pagination": false,
          "selectable": false,
          "keepOperationColumn": false,
          "minWidth": 1240,
          "rowActions": [],
          "columns": [
            { "code": "purchaseCategory", "label": "采购类别", "component": "text", "editable": false, "width": 128 },
            { "code": "itemName", "label": "采购名称", "component": "text", "editable": false, "width": 188 },
            { "code": "specification", "label": "规格", "component": "text", "editable": false, "width": 180 },
            { "code": "unit", "label": "单位", "component": "text", "editable": false, "width": 80 },
            { "code": "verificationQuantity", "label": "验票数量", "component": "number", "editable": false, "align": "right", "width": 112 },
            { "code": "estimatedUnitPrice", "label": "暂估单价", "component": "money", "editable": false, "align": "right", "width": 128 },
            { "code": "taxIncludedUnitPrice", "label": "含税单价", "component": "money", "editable": false, "align": "right", "width": 128 },
            { "code": "unitPriceDifference", "label": "单位价差", "component": "money", "editable": false, "align": "right", "width": 128 },
            { "code": "costPriceDifference", "label": "成本价差", "component": "money", "editable": false, "align": "right", "width": 136 }
          ]
        }
      ],
      "actions": [
        { "code": "close", "label": "取消" },
        { "code": "confirm-price-difference", "label": "确认提交", "type": "primary" }
      ]
    }`.split("\n");

const ruleBlock = `    {
      "id": "R11",
      "action": "submit",
      "type": "priceDifferenceConfirm",
      "table": "orderItems",
      "overlay": "purchase-price-difference-modal",
      "estimatedField": "estimatedUnitPrice",
      "actualField": "taxIncludedUnitPrice",
      "quantityField": "verificationQuantity",
      "precision": 2,
      "message": "存在含税单价与暂估单价不一致的订单行，请确认采购价差明细后再提交。"
    }`.split("\n");

function insertBeforeArrayEnd(nextKey, block) {
  const nextIndex = lines.findIndex((l) => l === `  "${nextKey}": [`);
  if (nextIndex < 0) throw new Error("missing key " + nextKey);
  const closeIndex = nextIndex - 1;
  if (lines[closeIndex] !== "  ],") throw new Error("unexpected close before " + nextKey + ": " + lines[closeIndex]);
  const itemEnd = closeIndex - 1;
  if (lines[itemEnd] !== "    }") throw new Error("unexpected item end before " + nextKey + ": " + lines[itemEnd]);
  lines[itemEnd] = "    },";
  lines.splice(itemEnd + 1, 0, ...block);
}

insertBeforeArrayEnd("detailLinkages", overlayBlock);
insertBeforeArrayEnd("relations", ruleBlock);

const mockIndex = lines.findIndex((l) => l === '  "mockData": {');
if (mockIndex < 0 || lines[mockIndex + 1] !== '    "invoices": [') throw new Error("unexpected mockData head");
lines.splice(mockIndex + 1, 0, '    "priceDifferenceItems": [],');

fs.writeFileSync(p, lines.join(eol), "utf8");
const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
console.log("overlays:", parsed.overlays.map((o) => o.id).join(", "));
console.log("rules:", parsed.rules.map((r) => r.id).join(", "));
console.log("mockData keys:", Object.keys(parsed.mockData).join(", "));
console.log("modal columns:", parsed.overlays.find((o) => o.id === "purchase-price-difference-modal").children[1].columns.map((c) => c.label).join(" | "));
