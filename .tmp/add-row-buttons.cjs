const fs = require('fs');
const path = require('path');

// For material-outbound and other-outbound: add "新增明细" button to the toolbar
// The pattern: after pro-table-actions"><span></span><div class="pro-table-actions">
// insert the add-row button before existing buttons

const newBtn = '<button class="btn btn-primary" type="button" data-act="add-row" aria-label="新增明细" title="新增明细" data-requires-detail-fields=\'[&quot;warehouse&quot;]\'><i class="fa-solid fa-plus"></i>新增明细</button>';

const edits = [
  {
    file: 'pages/material/material-outbound.html',
    searchStr: '<div class="pro-table-actions"><button class="btn btn-primary" type="button" data-act="open" aria-label="选择即时库存"',
    tableId: 'material-outbound-items'
  },
  {
    file: 'pages/material/other-outbound.html',
    searchStr: '<div class="pro-table-actions"><button class="btn btn-primary" type="button" data-act="open" aria-label="选择即时库存"',
    tableId: 'other-outbound-items'
  }
];

const root = path.resolve(__dirname, '..');

for (const { file, searchStr, tableId } of edits) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');

  // Scope: only replace within the correct table section
  const tableStart = html.indexOf('id="' + tableId + '"');
  if (tableStart === -1) { console.log('NOT FOUND table:', file); continue; }

  // Find the toolbar actions div after this table's start
  const actionsIdx = html.indexOf(searchStr, tableStart);
  if (actionsIdx === -1) { console.log('NOT FOUND actions:', file); continue; }

  // Insert the new button right after <div class="pro-table-actions">
  const insertPos = actionsIdx + '<div class="pro-table-actions">'.length;
  html = html.substring(0, insertPos) + newBtn + html.substring(insertPos);

  fs.writeFileSync(fp, html, 'utf8');
  console.log('OK:', file);
}
