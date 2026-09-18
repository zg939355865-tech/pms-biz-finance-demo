import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load("inputs/excel/menu/menu-simple.xlsx"));
console.log(workbook.help("worksheet.tables", { include: "index,examples,notes", maxChars: 5000 }).ndjson);
