const fs = require('fs');
const path = require('path');

const files = [
  {
    file: 'pages/material/material-outbound.html',
    pickers: [
      { action: 'confirm-inventory', overlayId: 'inventory-picker', targetDataSource: 'outboundItems' },
      { action: 'confirm-blue-outbound', overlayId: 'blue-outbound-picker', targetDataSource: 'outboundItems' }
    ]
  },
  {
    file: 'pages/material/other-outbound.html',
    pickers: [
      { action: 'confirm-inventory', overlayId: 'other-inventory-picker', targetDataSource: 'otherOutboundItems' }
    ]
  }
];

const root = path.resolve(__dirname, '..');

for (const { file, pickers } of files) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  const jsStart = html.indexOf('<script>') + 8;
  const jsEnd = html.indexOf('</script>', jsStart);
  let js = h = html.substring(jsStart, jsEnd);

  // Step 1: Remove any previously injected handlers at top of IIFE
  js = js.replace(/\n\s*if\(action==='confirm-inventory'\)\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}/, '');
  js = js.replace(/\n\s*if\(action==='confirm-blue-outbound'\)\{[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}[^}]+\}/, '');

  // Step 2: Remove handlers injected before cancel-delete
  js = js.replace(/\n\s*if\(action==='confirm-inventory'\)\{var overlay=document\.querySelector\('\[data-overlay="inventory-picker"\]'\);.*?overlay\.hidden=true;return;\}/s, '');
  js = js.replace(/\n\s*if\(action==='confirm-blue-outbound'\)\{var overlay=document\.querySelector\('\[data-overlay="blue-outbound-picker"\]'\);.*?overlay\.hidden=true;return;\}/s, '');
  js = js.replace(/\n\s*if\(action==='confirm-inventory'\)\{var overlay=document\.querySelector\('\[data-overlay="other-inventory-picker"\]'\);.*?overlay\.hidden=true;return;\}/s, '');

  // Step 3: Build standalone handler that attaches its own click listener
  // This avoids the main click handler's validation chain entirely
  const standaloneCode = pickers.map(p => {
    return "\n  // Picker multi-select confirm handler for " + p.action +
    "\n  (function(){" +
    "\n    var btn=document.querySelector('[data-overlay=\"" + p.overlayId + "\"] [data-act=\"" + p.action + "\']');" +
    "\n    if(btn)btn.addEventListener('click',function(e){" +
    "\n      e.preventDefault();e.stopPropagation();" +
    "\n      var overlay=document.querySelector('[data-overlay=\"" + p.overlayId + "\"]');" +
    "\n      if(!overlay)return;" +
    "\n      var pickerTable=overlay.querySelector('[data-component=\"ProTable\"],[data-component=\"EditableTable\"]');" +
    "\n      if(!pickerTable)return;" +
    "\n      var checked=pickerTable.querySelectorAll('[data-row-select]:checked:not(:disabled)');" +
    "\n      if(!checked.length){if(window.EAMPage)EAMPage.message('请至少选择一条记录','warning');return;}" +
    "\n      var selectedRows=Array.from(checked).map(function(cb){" +
    "\n        var tr=cb.closest('tr');var v={};" +
    "\n        try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(ex){}" +
    "\n        return v;" +
    "\n      });" +
    "\n      var detail=document.querySelector('[data-page-view=\"detail\"]');" +
    "\n      var targetTable=detail.querySelector('[data-component=\"EditableTable\"][data-data-source=\"" + p.targetDataSource + "\"]');" +
    "\n      var existingRows=[];" +
    "\n      if(targetTable){" +
    "\n        var body=targetTable.querySelector('tbody');" +
    "\n        if(body){" +
    "\n          Array.from(body.querySelectorAll('tr[data-row-value]:not([hidden])')).forEach(function(tr){" +
    "\n            var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(ex){}existingRows.push(v);" +
    "\n          });" +
    "\n        }" +
    "\n      }" +
    "\n      var combined=existingRows.concat(selectedRows);" +
    "\n      replaceEditableTableRows(detail,'" + p.targetDataSource + "',combined);" +
    "\n      overlay.hidden=true;" +
    "\n    },true);" +
    "\n  })();";
  }).join('');

  // Insert right after IIFE opening
  const iifeOpen = js.indexOf('(function(){');
  if (iifeOpen === -1) { console.log('SKIP:', file); continue; }
  const insertPos = js.indexOf('\n', iifeOpen + 12) + 1;
  js = js.substring(0, insertPos) + standaloneCode + '\n' + js.substring(insertPos);

  html = html.substring(0, jsStart - 8) + js + html.substring(jsEnd);
  fs.writeFileSync(fp, html, 'utf8');
  console.log('OK:', file, '(' + pickers.length + ' standalone handler(s))');
}
