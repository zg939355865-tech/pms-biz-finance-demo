const files = process.argv.slice(2);
for (const f of files) {
  const j = require(require('path').resolve(process.cwd(), f));
  console.log('\n########', f);
  console.log('page:', j.pageCode, '|', j.pageName, '| pageType:', j.pageType, '| tpl:', j.template, '| profile:', j.policyProfile || '(none)');
  console.log('businessScenario:', j.businessScenario);
  for (const r of j.regions || []) {
    console.log(' [region]', r.id, r.component, r.title || '');
    if (r.fields) console.log('   fields:', r.fields.map(x => x.code + ':' + x.component + (x.required ? '*' : '')).join(', '));
    if (r.columns) console.log('   columns:', r.columns.map(x => x.code + ':' + (x.component || 'text')).join(', '));
    if (r.footerSummary) console.log('   footerSummary:', JSON.stringify(r.footerSummary));
    if (r.actions) console.log('   actions:', JSON.stringify(r.actions));
    if (r.rowActions && r.rowActions.length) console.log('   rowActions:', r.rowActions.map(a => a.code).join(', '));
    for (const tb of r.tabs || []) {
      console.log('   [tab]', tb.key, tb.label);
      for (const c of tb.children || []) {
        console.log('     [child]', c.id || '', c.component, c.title || '', c.dataSource || '');
        if (c.fields) console.log('       fields:', c.fields.map(x => x.code + ':' + x.component + (x.required ? '*' : '') + (x.readonly ? '(ro)' : '')).join(', '));
        if (c.columns) console.log('       columns:', c.columns.map(x => x.code + ':' + (x.component || 'text')).join(', '));
        if (c.footerSummary) console.log('       footerSummary:', JSON.stringify(c.footerSummary));
        if (c.actions && c.actions.length) console.log('       actions:', c.actions.map(a => a.code).join(', '));
        if (c.children) c.children.forEach(cc => { console.log('       [sub]', cc.component, cc.dataSource||''); if (cc.columns) console.log('         columns:', cc.columns.map(x=>x.code).join(', ')); });
      }
    }
  }
  if (j.pageActions && j.pageActions.length) console.log(' pageActions:', j.pageActions.map(a => a.code + '(' + a.label + ')').join(', '));
  if (j.overlays && j.overlays.length) console.log(' overlays:', j.overlays.map(o => o.id + ':' + o.component).join(', '));
  if (j.interactions && j.interactions.length) console.log(' interactions:', j.interactions.map(i => i.id || i.code || i.trigger || JSON.stringify(i).slice(0, 60)).join(' | '));
  if (j.rules && j.rules.length) console.log(' rules:', j.rules.map(r => (r.id || '') + ' ' + (r.description || JSON.stringify(r)).slice(0, 90)).join('\n        '));
  if (j.relations && j.relations.length) console.log(' relations:', JSON.stringify(j.relations));
}
