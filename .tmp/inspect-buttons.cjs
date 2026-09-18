const fs = require('fs');
const html = fs.readFileSync('pages/income/income-contract-schema.html', 'utf8');
const bar = html.match(/<div class="pro-page-actions">[\s\S]*?<\/div>/)[0];
const names = ['audit', 'reverse-audit', 'close-contract'];
for (const name of names) {
  const re = new RegExp('<button[^>]*data-act="' + name + '"[^>]*>');
  const m = bar.match(re);
  if (!m) { console.log(name + ': NOT FOUND'); continue; }
  const tag = m[0];
  const attr = (n) => {
    const r = tag.match(new RegExp(n + "=(?:'([^']*)'|\"([^\"]*)\")"));
    const v = r ? (r[1] !== undefined ? r[1] : r[2]) : null;
    return v === null ? null : v.replace(/&quot;/g, '"');
  };
  console.log(name);
  console.log('  enabledSelectionStatuses:', attr('data-enabled-selection-statuses'));
  console.log('  enabledSelectionWhen    :', attr('data-enabled-selection-when'));
  console.log('  nextStatus              :', attr('data-next-status'));
  console.log('  rowFieldUpdate          :', attr('data-row-field-update'));
  console.log('  fieldUpdates            :', attr('data-field-updates'));
}

console.log('\n--- selection wiring ---');
for (const needle of ['data-row-select', 'data-act="select-all"']) {
  console.log(needle + ' occurrences in html:', (html.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length);
}
const wiring = html.match(/[^\n]{0,160}updateSelection\([^\n]{0,160}/g) || [];
console.log('updateSelection call sites:', wiring.length);
wiring.forEach((line) => console.log('  ' + line.slice(0, 200)));