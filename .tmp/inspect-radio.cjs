const fs = require('fs');
const html = fs.readFileSync('pages/income/income-contract-schema.html', 'utf8');
const re = /<input[^>]*data-field="contractLevel"[^>]*>/g;
let m;
while ((m = re.exec(html)) !== null) {
  const idx = m.index;
  const before = html.slice(Math.max(0, idx - 200), idx);
  const labelMatch = before.match(/<label[^>]*>([^<]*)<\/label>\s*$/);
  console.log('--- occurrence at', idx, '---');
  console.log(m[0]);
  console.log('label before:', labelMatch ? labelMatch[1].trim() : '(n/a)');
}
const count = (html.match(/data-act="create"/g) || []).length;
console.log('\ndata-act="create" occurrences:', count);
const listIdx = html.indexOf('data-page-view="list"');
const detailIdx = html.indexOf('data-page-view="detail"');
console.log('list view index:', listIdx, '| detail view index:', detailIdx, '| detail first:', detailIdx < listIdx);