import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "D:/项目AI协作/4、PMS业财一体化/inputs/excel/menu/menu-simple.xlsx";
const previewPath = "D:/项目AI协作/4、PMS业财一体化/.tmp/menu-edit/menu-after.png";
const shouldEdit = process.argv.includes("--edit");

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
const sheet = workbook.worksheets.getItem("菜单明细");

const table = await workbook.inspect({
  kind: "table",
  sheetId: "菜单明细",
  range: "A24:D31",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 4,
  maxChars: 4000,
});
console.log(table.ndjson);

const styles = await workbook.inspect({
  kind: "computedStyle",
  sheetId: "菜单明细",
  range: "A28:D30",
  maxChars: 3000,
});
console.log(styles.ndjson);

const formulaErrors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
  maxChars: 3000,
});
console.log(formulaErrors.ndjson);

if (!shouldEdit) {
  const preview = await workbook.render({
    sheetName: "菜单明细",
    range: "A24:D31",
    scale: 2,
    format: "png",
  });
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
  console.log(`preview=${previewPath}`);
  process.exit(0);
}

const usedValues = sheet.getRange("A1:D200").values;
const matches = [];
for (let rowIndex = 0; rowIndex < usedValues.length; rowIndex += 1) {
  const row = usedValues[rowIndex] ?? [];
  if (row[0] === "收入管理" && row[1] === "收入回款台账") {
    matches.push(rowIndex);
  }
}
if (matches.length !== 1) {
  throw new Error(`Expected exactly one 收入管理/收入回款台账 row, found ${matches.length}`);
}

const targetRow = matches[0] + 1;
const statusCell = sheet.getRange(`D${targetRow}`);
if (statusCell.values?.[0]?.[0] !== "是") {
  throw new Error(`Expected D${targetRow} to be 是 before edit`);
}
statusCell.values = [["否"]];

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(workbookPath);
console.log(`updated=${workbookPath}!菜单明细!D${targetRow}`);
