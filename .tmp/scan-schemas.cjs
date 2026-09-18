const fs = require('fs');
const path = require('path');
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}
function comps(node) {
  let s = node.component || '?';
  if (node.tabs) {
    s += '[tabs: ' + node.tabs.map(t => {
      const kids = (t.children || []).map(comps).join(' + ');
      return t.key + '{' + kids + '}';
    }).join(', ') + ']';
  }
  if (node.children && !node.tabs) {
    s += '{' + node.children.map(comps).join(' + ') + '}';
  }
  return s;
}
for (const f of walk('schemas/pages').sort()) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('---', f.split(path.sep).join('/'));
  console.log('  page:', j.pageCode, '|', j.pageName, '| type:', j.pageType, '| tpl:', j.template, '| profile:', j.policyProfile || '(none)', '| readOnly:', !!j.primaryListReadOnly);
  console.log('  regions:', (j.regions || []).map(comps).join(' , ') || '(none)');
  console.log('  pageActions:', (j.pageActions || []).map(a => a.code).join(', ') || '(none)');
  console.log('  overlays:', (j.overlays || []).map(o => o.id + ':' + o.component).join(', ') || '(none)');
}
