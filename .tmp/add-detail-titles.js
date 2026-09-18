const fs = require('fs');
const path = require('path');

const edits = [
  {
    file: 'pages/material/material-outbound.html',
    title: '出库明细',
    formEndId: 'material-outbound-basic',
    tableStartId: 'material-outbound-items'
  },
  {
    file: 'pages/material/other-outbound.html',
    title: '出库明细',
    formEndId: 'other-outbound-basic',
    tableStartId: 'other-outbound-items'
  },
  {
    file: 'pages/material/other-inbound.html',
    title: '入库明细',
    formEndId: 'other-inbound-basic',
    tableStartId: 'other-inbound-items'
  }
];

const root = path.resolve(__dirname, '..');
let allOk = true;

for (const { file, title, formEndId, tableStartId } of edits) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');

  // Find form section end: </div></section> where section id matches formEndId
  // Pattern: </div></section><section class="card schema-card pro-editable-table" ... id="tableStartId"
  const regex = new RegExp(
    '(</div></section>)<section class="card schema-card pro-editable-table"[^>]*id="' + tableStartId + '"',
    'i'
  );

  const match = html.match(regex);
  if (!match) {
    console.error('NOT FOUND in', file, '- pattern not matched');
    allOk = false;
    continue;
  }

  const titleDiv = '<div class="detail-section-title">' + title + '</div>';
  html = html.replace(regex, '$1' + titleDiv + '<section class="card schema-card pro-editable-table"');

  fs.writeFileSync(fp, html, 'utf8');
  console.log('OK:', file, '-> added "' + title + '"');
}

if (allOk) console.log('\nAll 3 files updated.');
else console.log('\nSome files failed.');
