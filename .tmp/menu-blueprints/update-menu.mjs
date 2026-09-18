import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "inputs/excel/menu/menu-simple.xlsx";
const previewDir = ".tmp/menu-blueprints/preview-after";
await fs.mkdir(previewDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const sheet = workbook.worksheets.getItem("菜单明细");
const usedRange = sheet.getUsedRange(true);
const values = usedRange.values;
const headers = values[0];
const moduleIndex = headers.indexOf("一级菜单");
const pageIndex = headers.indexOf("二级菜单");
const orderIndex = headers.indexOf("排序");
const enabledIndex = headers.indexOf("启用状态");
if ([moduleIndex, pageIndex, orderIndex, enabledIndex].some((index) => index < 0)) {
  throw new Error("菜单明细缺少必需列");
}

let rows = values.slice(1).filter((row) => row.some((cell) => cell !== null && cell !== ""));
const hadNewEntries = rows.some((row) => row[moduleIndex] === "物资管理" && ["其他出库", "其他入库"].includes(row[pageIndex]));
rows = rows.filter((row) => !(row[moduleIndex] === "物资管理" && ["其他出库", "其他入库"].includes(row[pageIndex])));

for (const row of rows) {
  if (row[moduleIndex] === "物资管理" && row[pageIndex] === "物资台账") row[enabledIndex] = "否";
  if (row[moduleIndex] === "物资管理" && row[pageIndex] === "物料领用") row[pageIndex] = "物资出库";
  if (!hadNewEntries && Number(row[orderIndex]) >= 350) row[orderIndex] = Number(row[orderIndex]) + 20;
}

const outboundIndex = rows.findIndex((row) => row[moduleIndex] === "物资管理" && row[pageIndex] === "物资出库");
if (outboundIndex < 0) throw new Error("未找到物资出库菜单行");
const newRows = [
  ["物资管理", "其他出库", 350, "是"],
  ["物资管理", "其他入库", 360, "是"],
];
rows.splice(outboundIndex + 1, 0, ...newRows);

const existingDataRowCount = values.length - 1;
if (rows.length > existingDataRowCount) {
  const styleSource = sheet.getRangeByIndexes(existingDataRowCount, 0, 1, 4);
  for (let rowIndex = existingDataRowCount + 1; rowIndex <= rows.length; rowIndex += 1) {
    styleSource.copyTo(sheet.getRangeByIndexes(rowIndex, 0, 1, 4), "all");
  }
}
sheet.getRangeByIndexes(1, 0, rows.length, 4).values = rows;

const materialRows = rows.filter((row) => row[moduleIndex] === "物资管理");
const expected = [
  ["物资台账", 310, "否"],
  ["即时物资", 320, "是"],
  ["物资流水", 330, "是"],
  ["物资出库", 340, "是"],
  ["其他出库", 350, "是"],
  ["其他入库", 360, "是"],
  ["固资领用", 370, "是"],
];
const actual = materialRows.map((row) => [row[pageIndex], Number(row[orderIndex]), row[enabledIndex]]);
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`物资管理菜单校验失败: ${JSON.stringify(actual)}`);
}

const preview = await workbook.render({
  sheetName: "菜单明细",
  autoCrop: "all",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${previewDir}/菜单明细.png`, new Uint8Array(await preview.arrayBuffer()));

const check = await workbook.inspect({
  kind: "table",
  sheetId: "菜单明细",
  range: "A30:D40",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 4,
  maxChars: 6000,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
  maxChars: 3000,
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(sourcePath);
