const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, '..', 'pages', 'income', 'sales-invoice.html');
let html = fs.readFileSync(fp, 'utf8');

function removeModals(content, idPrefixes) {
  let result = content;
  let changed = false;
  let found = true;

  while (found) {
    found = false;
    const pattern = new RegExp(
      '<div\\s[^>]*data-component="ProModalForm"[^>]*id="(' + idPrefixes.join('|') + ')[^"]*"[^>]*>',
      'g'
    );
    const match = pattern.exec(result);
    if (match) {
      const startIdx = match.index;
      let depth = 1;
      let pos = startIdx + match[0].length;
      while (depth > 0 && pos < result.length) {
        const nextOpen = result.indexOf('<div', pos);
        const nextClose = result.indexOf('</div>', pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = nextOpen + 4;
        } else {
          depth--;
          if (depth === 0) {
            const endIdx = nextClose + 6;
            result = result.substring(0, startIdx) + result.substring(endIdx);
            found = true;
            changed = true;
            break;
          }
          pos = nextClose + 6;
        }
      }
    }
  }
  return { content: result, changed };
}

const { content: newHtml, changed } = removeModals(html, ['audit-invoice', 'reverse-audit-invoice']);
if (changed) {
  fs.writeFileSync(fp, newHtml, 'utf8');
  console.log('OK: sales-invoice.html');
} else {
  console.log('SKIP');
}
