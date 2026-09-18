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

function buildHandler(p) {
  return "if(action==='" + p.action + "'){var overlay=document.querySelector('[data-overlay=\"" + p.overlayId + "\"]');if(!overlay)return;var pickerTable=overlay.querySelector('[data-component=\"ProTable\"],[data-component=\"EditableTable\"]');if(!pickerTable)return;var checked=pickerTable.querySelectorAll('[data-row-select]:checked:not(:disabled)');if(!checked.length)return;var selectedRows=Array.from(checked).map(function(cb){var tr=cb.closest('tr');var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(e){}return v;});var detail=document.querySelector('[data-page-view=\"detail\"]');var targetTable=detail.querySelector('[data-component=\"EditableTable\"][data-data-source=\"" + p.targetDataSource + "\"]');var existingRows=[];if(targetTable){var body=targetTable.querySelector('tbody');if(body){Array.from(body.querySelectorAll('tr[data-row-value]:not([hidden])')).forEach(function(tr){var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(e){}existingRows.push(v);});}}var combined=existingRows.concat(selectedRows);replaceEditableTableRows(detail,'" + p.targetDataSource + "',combined);overlay.hidden=true;return;}";
}

for (const { file, pickers } of files) {
  const fp = path.join(root, file);
  let html = fs.readFileSync(fp, 'utf8');
  const jsStart = html.indexOf('<script>') + 8;
  const jsEnd = html.indexOf('</script>', jsStart);
  let js = html.substring(jsStart, jsEnd);

  // Step 1: Remove wrongly injected code (confirm-inventory at top of IIFE)
  const wrongStart = js.indexOf("if(action==='confirm-inventory')");
  if (wrongStart > -1 && wrongStart < 5000) {
    // Find the end: next '  var pendingDeleteTarget' or similar original code
    const wrongEnd = js.indexOf('\n  var pendingDeleteTarget', wrongStart);
    if (wrongEnd > -1) {
      js = js.substring(0, wrongStart) + js.substring(wrongEnd);
      console.log(file + ': removed wrongly injected code');
    }
  }

  // Step 2: Also remove confirm-blue-outbound if present at top
  const wrongStart2 = js.indexOf("if(action==='confirm-blue-outbound')");
  if (wrongStart2 > -1 && wrongStart2 < 5000) {
    const wrongEnd2 = js.indexOf('\n  var pendingDeleteTarget', wrongStart2);
    if (wrongEnd2 > -1) {
      js = js.substring(0, wrongStart2) + js.substring(wrongEnd2);
      console.log(file + ': removed wrongly injected code (blue-outbound)');
    }
  }

  // Step 3: Inject handlers inside click handler, before cancel-delete
  const handlerCode = pickers.map(buildHandler).join('');
  const injectAnchor = "if(action==='cancel-delete')";
  const injectIdx = js.indexOf(injectAnchor);
  if (injectIdx > -1) {
    js = js.substring(0, injectIdx) + handlerCode + '\n    ' + js.substring(injectIdx);
    console.log(file + ': injected ' + pickers.length + ' handler(s) before cancel-delete');
  } else {
    console.log(file + ': WARNING - cancel-delete anchor not found');
  }

  html = html.substring(0, jsStart) + js + html.substring(jsEnd);
  fs.writeFileSync(fp, html, 'utf8');
  console.log(file + ': DONE');
}
