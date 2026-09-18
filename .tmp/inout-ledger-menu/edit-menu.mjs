import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourceUrl = new URL("../../inputs/excel/menu/menu-simple.xlsx", import.meta.url);
const outputDir = new URL("../../outputs/01a06114-5fc1-7603-b7e0-a2ff45bcc1c0/", import.meta.url);
const sourcePath = fileURLToPath(sourceUrl);
const outputPath = fileURLToPath(new URL("menu-simple.xlsx", outputDir));

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const menuSheet = workbook.worksheets.getItem("菜单明细");
const target = menuSheet.getRange("B34");
if (target.values?.[0]?.[0] !== "物资流水") {
  throw new Error(`菜单明细!B34 预期为“物资流水”，实际为“${target.values?.[0]?.[0] ?? ""}”`);
}
target.values = [["出入库流水"]];

const check = await workbook.inspect({
  kind: "table,computedStyle",
  sheetId: "菜单明细",
  range: "A32:D38",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 6,
  maxChars: 5000,
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

await fs.mkdir(fileURLToPath(outputDir), { recursive: true });
for (let index = 0; index < 2; index += 1) {
  const sheet = workbook.worksheets.getItemAt(index);
  const used = sheet.getUsedRange();
  const preview = await workbook.render({
    sheetName: sheet.name,
    range: used.address,
    autoCrop: "all",
    scale: 1.5,
    format: "png",
  });
  const previewPath = fileURLToPath(new URL(`menu-after-${index + 1}.png`, outputDir));
  await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
  console.log(JSON.stringify({ sheet: sheet.name, usedRange: used.address, preview: previewPath }));
}

const sourceExport = await SpreadsheetFile.exportXlsx(workbook);
await sourceExport.save(sourcePath);
const outputExport = await SpreadsheetFile.exportXlsx(workbook);
await outputExport.save(outputPath);
console.log(JSON.stringify({ sourcePath, outputPath, value: target.values?.[0]?.[0] }));
