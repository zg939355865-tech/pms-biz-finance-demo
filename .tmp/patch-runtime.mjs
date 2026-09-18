import fs from "node:fs";
const p = "scripts/generate/page-from-schema.mjs";
let t = fs.readFileSync(p, "utf8");
const before = t;

function replaceOnce(source, anchor, replacement) {
  const parts = source.split(anchor);
  if (parts.length !== 2) throw new Error("anchor not unique: " + anchor.slice(0, 60) + " count=" + (parts.length - 1));
  return parts[0] + replacement + parts[1];
}

const helpers = [
"  function priceDifferenceSubmitRule(){var rules=(window.PMS_PAGE_SCHEMA&&window.PMS_PAGE_SCHEMA.rules)||[];return rules.find(function(rule){return rule&&rule.action==='submit'&&rule.type==='priceDifferenceConfirm';})||null;}",
"  function priceDifferenceNumber(value){var parsed=Number(String(value===undefined||value===null?'':value).replace(/[%￥¥,\\s]/g,''));return Number.isFinite(parsed)?parsed:NaN;}",
"  function priceDifferenceAmount(value){var parsed=Number(value);return Number.isFinite(parsed)?parsed.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}):'';}",
"  function collectPriceDifferenceRows(scope,rule){var table=scope.querySelector('[data-component=\"EditableTable\"][data-data-source=\"'+CSS.escape(rule.table||'')+'\"]');if(!table)return[];var precision=Number.isFinite(Number(rule.precision))?Number(rule.precision):2;return tableRowsAsValues(table).map(function(row){var estimated=priceDifferenceNumber(row[rule.estimatedField||'estimatedUnitPrice']);var actual=priceDifferenceNumber(row[rule.actualField||'taxIncludedUnitPrice']);if(!Number.isFinite(estimated)||!Number.isFinite(actual))return null;var quantity=priceDifferenceNumber(row[rule.quantityField||'verificationQuantity']);var unitDifference=Number((actual-estimated).toFixed(precision));var costDifference=Number.isFinite(quantity)?Number((unitDifference*quantity).toFixed(precision)):NaN;return {purchaseCategory:row.purchaseCategory||'',itemName:row.itemName||'',specification:row.specification||'',unit:row.unit||'',verificationQuantity:Number.isFinite(quantity)?quantity:'',estimatedUnitPrice:estimated,taxIncludedUnitPrice:actual,unitPriceDifference:unitDifference,costPriceDifference:Number.isFinite(costDifference)?costDifference:'',hasDifference:Math.abs(unitDifference)>0};}).filter(Boolean);}",
"  function openPriceDifferenceConfirm(rule,submitButton){var scope=document.querySelector('[data-page-view=\"detail\"]:not([hidden])')||document;var rows=collectPriceDifferenceRows(scope,rule);var differenceRows=rows.filter(function(row){return row.hasDifference;});if(!differenceRows.length)return false;var overlay=document.querySelector('[data-overlay=\"'+CSS.escape(rule.overlay||'')+'\"]');if(!overlay)return false;var table=overlay.querySelector('[data-component=\"EditableTable\"]');replaceEditableTableRows(overlay,table?table.dataset.dataSource:'priceDifferenceItems',rows);if(table)Array.from(table.querySelectorAll('tbody tr:not([data-empty-row])')).forEach(function(renderedRow,index){var row=rows[index];if(!row||!row.hasDifference)return;['unitPriceDifference','costPriceDifference'].forEach(function(code){var cell=renderedRow.querySelector('[data-column=\"'+CSS.escape(code)+'\"]');if(!cell)return;var value=Number(row[code]);if(!Number.isFinite(value)||value===0)return;cell.classList.add(value>0?'schema-signed-negative':'schema-signed-positive');cell.textContent=(value>0?'+':'-')+priceDifferenceAmount(Math.abs(value));cell.title=cell.textContent;});});var summary=overlay.querySelector('[data-component=\"Alert\"] span');if(summary){var total=differenceRows.reduce(function(sum,row){return sum+(Number(row.costPriceDifference)||0);},0);summary.textContent='共'+differenceRows.length+'行订单行的含税单价与暂估单价不一致，成本价差合计'+(total>0?'+':'')+priceDifferenceAmount(total)+'元。';}pendingPriceDifferenceSubmit=submitButton;overlay.hidden=false;return true;}",
"  function validateMatchingTableConsistency(action){"
].join("\n");

t = replaceOnce(t, "  function validateMatchingTableConsistency(action){", helpers);
t = replaceOnce(t, "var pendingDeleteTarget=null;", "var pendingDeleteTarget=null;var pendingPriceDifferenceSubmit=null;");
t = replaceOnce(t,
  "delete confirmedTarget.dataset.confirmedDelete;}return;}",
  "delete confirmedTarget.dataset.confirmedDelete;}return;}\n    if(action==='confirm-price-difference'){var priceDifferenceOverlay=target.closest('[data-overlay]');if(priceDifferenceOverlay)priceDifferenceOverlay.hidden=true;var pendingSubmitButton=pendingPriceDifferenceSubmit;pendingPriceDifferenceSubmit=null;if(pendingSubmitButton){pendingSubmitButton.dataset.confirmedPriceDifference='true';pendingSubmitButton.click();delete pendingSubmitButton.dataset.confirmedPriceDifference;}return;}");
t = replaceOnce(t,
  "var submitStatus=target.dataset.nextStatus||'';",
  "var priceDifferenceRule=priceDifferenceSubmitRule();if(priceDifferenceRule&&target.dataset.confirmedPriceDifference!=='true'&&openPriceDifferenceConfirm(priceDifferenceRule,target))return;var submitStatus=target.dataset.nextStatus||'';");

if (t === before) throw new Error("no change applied");
fs.writeFileSync(p, t, "utf8");
console.log("generator patched, delta chars:", t.length - before.length);
