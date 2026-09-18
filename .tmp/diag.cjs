const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const out = [];

function occ(s, n) { const r = []; let i = s.indexOf(n); while (i > -1) { r.push(i); i = s.indexOf(n, i + 1); } return r; }
function ctx(s, i, a, b) { return s.substring(Math.max(0, i - a), Math.min(s.length, i + b)).replace(/\n/g, '⏎'); }

// 0. environment
try { out.push('pages/material: ' + fs.readdirSync(path.join(root, 'pages/material')).join(', ')); } catch (e) { out.push('pages/material ERR'); }
try { out.push('schemas/pages/material: ' + fs.readdirSync(path.join(root, 'schemas/pages/material')).join(', ')); } catch (e) { out.push('schemas/pages/material: MISSING'); }
try { out.push('.tmp files: ' + fs.readdirSync(__dirname).join(', ')); } catch (e) {}

const targets = [
  'pages/material/material-outbound.html',
  'pages/material/other-outbound.html',
  'pages/material/other-inbound.html'
];

for (const f of targets) {
  const fp = path.join(root, f);
  const html = fs.readFileSync(fp, 'utf8');
  fs.writeFileSync(fp + '.bak2', html);
  out.push('\n############ ' + f + ' len=' + html.length);

  const openRe = /<script\b[^>]*>/g; let m; const opens = [];
  while ((m = openRe.exec(html)) !== null) opens.push({ pos: m.index, tag: m[0].slice(0, 80) });
  const closes = occ(html, '</script>');
  out.push('OPENS:'); opens.forEach(o => out.push('  @' + o.pos + ' ' + o.tag));
  out.push('CLOSES: ' + closes.join(','));

  for (const o of opens) {
    if (o.tag !== '<script>') continue;
    const end = html.indexOf('</script>', o.pos);
    if (end < 0) { out.push('!! UNCLOSED script @' + o.pos); continue; }
    const code = html.substring(o.pos + 8, end);
    if (!code.trim()) continue;
    try { new vm.Script(code); out.push('script@' + o.pos + ' len=' + code.length + ' SYNTAX OK' + (code.indexOf('(function(){') > -1 ? ' [IIFE]' : '')); }
    catch (e) { out.push('script@' + o.pos + ' len=' + code.length + ' ** SYNTAX ERROR: ' + e.message); }
  }

  out.push('standalone injections: ' + occ(html, 'Picker multi-select confirm').length);

  for (const needle of ['confirm-inventory', 'confirm-blue-outbound']) {
    const ps = occ(html, needle);
    out.push('\n--- occurrences of ' + needle + ': ' + ps.length);
    ps.forEach((p, i) => out.push('[' + i + '] @' + p + '\n    ' + ctx(html, p, 150, 380)));
  }

  const rps = occ(html, 'replaceEditableTableRows');
  out.push('\n--- replaceEditableTableRows x' + rps.length);
  if (rps.length) out.push('    def ctx: ' + ctx(html, rps[0], 80, 420));

  for (const needle of ['data-selection-mode', 'data-append-selection-to', 'appendSelectionTo', 'row-select']) {
    const ps = occ(html, needle);
    out.push('\n--- ' + needle + ' x' + ps.length);
    ps.slice(0, 4).forEach((p) => out.push('    @' + p + ': ' + ctx(html, p, 100, 220)));
  }
}

fs.writeFileSync(path.join(__dirname, 'diag-out.txt'), out.join('\n'), 'utf8');
console.log('written');
