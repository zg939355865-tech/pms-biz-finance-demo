const fs = require('fs');
const path = require('path');

const files = [
  'pages/income/project-settlement.html',
  'pages/income/sales-invoice.html',
  'pages/income/receipt-reconciliation.html',
  'pages/material/material-outbound.html',
  'pages/material/other-outbound.html',
  'pages/material/other-inbound.html'
];

const root = path.resolve(__dirname, '..');

function removeAuditReverseModals(content) {
  let result = content;
  let changed = false;
  let found = true;

  while (found) {
    found = false;
    // Find <div ... data-component="Modal" id="audit-...-modal" ...> or id="reverse-...-modal"
    // Attributes can be in any order, so we search for data-component="Modal" then check nearby id
    const modalPattern = /<div\s[^>]*data-component="Modal"[^>]*id="(audit|reverse)-[^"]*"[^>]*>/g;
    const match = modalPattern.exec(result);
    if (match) {
      const startIdx = match.index;
      const fullMatch = match[0];
      const idMatch = fullMatch.match(/id="(audit|reverse)-[^"]*"/);
      if (idMatch) {
        const idPrefix = idMatch[1];
        // Verify it's an audit or reverse modal (not some other Modal)
        if (idPrefix === 'audit' || idPrefix === 'reverse') {
          // Find matching closing </div> by depth counting
          let depth = 1;
          let pos = startIdx + fullMatch.length;
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
    }
  }

  return { content: result, changed };
}

for (const file of files) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  const before = html.length;

  const { content: newHtml, changed } = removeAuditReverseModals(html);

  if (changed) {
    fs.writeFileSync(fp, newHtml, 'utf8');
    console.log('OK:', file, '(removed', before - newHtml.length, 'chars)');
  } else {
    console.log('SKIP:', file);
  }
}
