import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = new URL("../../inputs/excel/menu/menu-simple.xlsx", import.meta.url);
const previewPath = new URL("./menu-before.png", import.meta.url);
const input = await FileBlob.load(fileURLToPath(sourcePath));
const workbook = await SpreadsheetFile.importXlsx(input);

const summary = await workbook.inspect({
  kind: "sheet,table,match",
  searchTerm: "物资流水|即时汇总库存|物资管理",
  options: { useRegex: true, maxResults: 50 },
  maxChars: 8000,
  tableMaxRows: 30,
  tableMaxCols: 10,
});
console.log(summary.ndjson);

for (let index = 0; index < 2; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange();
  const outputPath = new URL(`./menu-before-${index + 1}.png`, import.meta.url);
  const preview = await workbook.render({
    sheetName: sheet.name,
    range: used.address,
    autoCrop: "all",
    scale: 1.5,
    format: "png",
  });
  await fs.writeFile(outputPath, new Uint8Array(await preview.arrayBuffer()));
  console.log(JSON.stringify({ sheet: sheet.name, usedRange: used.address, preview: fileURLToPath(outputPath) }));
}
