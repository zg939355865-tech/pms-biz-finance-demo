const fs = require('fs');
const path = require('path');

const files = [
  { file: 'pages/material/material-outbound.html', pickers: [
    { action: 'confirm-inventory', overlayId: 'inventory-picker', targetDataSource: 'outboundItems' },
    { action: 'confirm-blue-outbound', overlayId: 'blue-outbound-picker', targetDataSource: 'outboundItems' }
  ]},
  { file: 'pages/material/other-outbound.html', pickers: [
    { action: 'confirm-inventory', overlayId: 'other-inventory-picker', targetDataSource: 'otherOutboundItems' }
  ]}
];

const root = path.resolve(__dirname, '..');

for (const { file, pickers } of files) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  const jsStart = html.indexOf('<script>');
  const jsEnd = html.indexOf('</script>', jsStart);
  const jsBefore = html.substring(0, jsStart + 8); // <script>\n
  const jsContent = html.substring(jsStart + 8, jsEnd);
  const jsAfter = html.substring(jsEnd);

  // Build the picker confirm handler
  const handlerCode = pickers.map(p =>
    `    if(action==='${p.action}'){` +
    `var overlay=document.querySelector('[data-overlay="${p.overlayId}"]');` +
    `if(!overlay)return;` +
    `var pickerTable=overlay.querySelector('[data-component="ProTable"],[data-component="EditableTable"]');` +
    `if(!pickerTable)return;` +
    `var checked=pickerTable.querySelectorAll('[data-row-select]:checked:not(:disabled)');` +
    `if(!checked.length)return;` +
    `var selectedRows=Array.from(checked).map(function(cb){var tr=cb.closest('tr');var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(e){}return v;});` +
    `var detail=document.querySelector('[data-page-view="detail"]');` +
    `var targetTable=detail.querySelector('[data-component="EditableTable"][data-data-source="${p.targetDataSource}"]');` +
    `var existingRows=[];if(targetTable){var body=targetTable.querySelector('tbody');if(body){Array.from(body.querySelectorAll('tr[data-row-value]:not([hidden])')).forEach(function(tr){var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(e){}existingRows.push(v);});}}` +
    `var combined=existingRows.concat(selectedRows);` +
    `replaceEditableTableRows(detail,'${p.targetDataSource}',combined);` +
    `overlay.hidden=true;` +
    `return;}`
  ).join('\n');

  // Insert after the opening of the IIFE
  const iifeStart = jsContent.indexOf('(function(){');
  if (iifeStart === -1) { console.log('SKIP:', file, '- no IIFE'); continue; }
  const insertPos = jsContent.indexOf('\n', iifeStart + 12) + 1;
  const newJs = jsContent.substring(0, insertPos) + handlerCode + '\n' + jsContent.substring(insertPos);

  fs.writeFileSync(fp, jsBefore + newJs + jsAfter, 'utf8');
  console.log('OK:', file, '(' + pickers.length + ' handlers added)');
}
