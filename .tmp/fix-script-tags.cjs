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

  // Step 1: Find the IIFE and check if it has a <script> tag
  const iifePos = html.indexOf('(function(){');
  if (iifePos === -1) { console.log('SKIP:', file, '- no IIFE'); continue; }

  // Check if there's already a <script> tag before the IIFE
  const precedingContent = html.substring(Math.max(0, iifePos - 50), iifePos);
  const hasScriptTag = precedingContent.includes('<script>');

  if (!hasScriptTag) {
    // Add <script> tag before IIFE
    html = html.substring(0, iifePos) + '<script>\n' + html.substring(iifePos);
    console.log(file + ': added <script> tag before IIFE');
  }

  // Step 2: Build standalone click handler for picker multi-select
  // This attaches directly to the confirm buttons, bypassing the main click handler's validation
  const standaloneCode = pickers.map(p => {
    return [
      "  // Picker multi-select confirm: " + p.action,
      "  (function(){",
      "    var overlay=document.querySelector('[data-overlay=\"" + p.overlayId + "\"]');",
      "    if(!overlay)return;",
      "    var btn=overlay.querySelector('[data-act=\"" + p.action + "\"]');",
      "    if(!btn)return;",
      "    btn.addEventListener('click',function(e){",
      "      e.preventDefault();e.stopPropagation();",
      "      var pickerTable=overlay.querySelector('[data-component=\"ProTable\"],[data-component=\"EditableTable\"]');",
      "      if(!pickerTable)return;",
      "      var checked=pickerTable.querySelectorAll('[data-row-select]:checked:not(:disabled)');",
      "      if(!checked.length){if(window.EAMPage)EAMPage.message('请至少选择一条记录','warning');return;}",
      "      var selectedRows=Array.from(checked).map(function(cb){",
      "        var tr=cb.closest('tr');var v={};",
      "        try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(ex){}",
      "        return v;",
      "      });",
      "      var detail=document.querySelector('[data-page-view=\"detail\"]');",
      "      var targetTable=detail.querySelector('[data-component=\"EditableTable\"][data-data-source=\"" + p.targetDataSource + "\"]');",
      "      var existingRows=[];",
      "      if(targetTable){",
      "        var body=targetTable.querySelector('tbody');",
      "        if(body){",
      "          Array.from(body.querySelectorAll('tr[data-row-value]:not([hidden])')).forEach(function(tr){",
      "            var v={};try{v=JSON.parse(tr.dataset.rowValue||'{}');}catch(ex){}existingRows.push(v);",
      "          });",
      "        }",
      "      }",
      "      var combined=existingRows.concat(selectedRows);",
      "      replaceEditableTableRows(detail,'" + p.targetDataSource + "',combined);",
      "      overlay.hidden=true;",
      "    },true);",
      "  })();"
    ].join('\n');
  }).join('\n\n');

  // Insert after <script>\n (right after the opening script tag we just ensured exists)
  const scriptOpen = html.indexOf('<script>', html.indexOf('<script src='));
  // Find the inline <script> tag (the one we added or that existed)
  const inlineScriptPos = html.indexOf('<script>\n', iifePos > 0 ? Math.max(0, iifePos - 20) : 0);

  // Actually, let's insert right at the IIFE position (after <script>\n)
  const insertAfter = html.indexOf('\n', html.lastIndexOf('<script>', iifePos)) + 1;
  html = html.substring(0, insertAfter) + standaloneCode + '\n\n' + html.substring(insertAfter);
  console.log(file + ': injected ' + pickers.length + ' standalone handler(s)');

  fs.writeFileSync(fp, html, 'utf8');
  console.log(file + ': DONE');
}
