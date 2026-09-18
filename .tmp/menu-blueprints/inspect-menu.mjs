import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "inputs/excel/menu/menu-simple.xlsx";
const previewDir = ".tmp/menu-blueprints/preview-before";
await fs.mkdir(previewDir, { recursive: true });

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(sourcePath));
const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 12000,
  tableMaxRows: 50,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 4000 });
console.log(sheets.ndjson);

for (const sheetInfo of workbook.worksheets.items) {
  const preview = await workbook.render({
    sheetName: sheetInfo.name,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  const safeName = sheetInfo.name.replace(/[\\/:*?"<>|]/g, "_");
  await fs.writeFile(`${previewDir}/${safeName}.png`, new Uint8Array(await preview.arrayBuffer()));
}
