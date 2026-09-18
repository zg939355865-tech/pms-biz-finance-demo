const fs = require('fs');
const path = require('path');

const edits = [
  { file: 'pages/material/material-outbound.html', title: '出库明细', tableId: 'material-outbound-items' },
  { file: 'pages/material/other-outbound.html', title: '出库明细', tableId: 'other-outbound-items' },
  { file: 'pages/material/other-inbound.html', title: '入库明细', tableId: 'other-inbound-items' }
];

const root = path.resolve(__dirname, '..');

for (const { file, title, tableId } of edits) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');

  // Insert <div class="detail-section-title">TITLE</div> before the editable table section
  const regex = new RegExp('<section class="card schema-card pro-editable-table"[^>]*id="' + tableId + '"');
  const titleDiv = '<div class="detail-section-title">' + title + '</div>';
  html = html.replace(regex, titleDiv + '<section class="card schema-card pro-editable-table"');

  fs.writeFileSync(fp, html, 'utf8');
  console.log('OK:', file);
}
