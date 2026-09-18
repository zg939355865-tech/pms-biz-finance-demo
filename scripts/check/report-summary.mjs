import fs from 'node:fs';
import path from 'node:path';
import { listFilesRecursive, readJson, writeJson, writeText } from '../lib/file-utils.mjs';

const forcedStatus = process.argv.includes('--failed') ? 'failed' : process.argv.includes('--passed') ? 'passed' : '';
const schemas = listFilesRecursive('schemas/pages', (filePath) => filePath.endsWith('.json'))
  .sort()
  .map((filePath) => readJson(filePath));

const rows = schemas.map((schema) => {
  const domain = schema.domain || 'unknown';
  const pageCode = schema.pageCode || 'unknown';
  return {
    pageCode,
    pageName: schema.pageName || pageCode,
    domain,
    schema: reportStatus(`outputs/reports/schema/${domain}/${pageCode}.json`),
    policy: reportStatus(`outputs/reports/policy/${domain}/${pageCode}.json`),
    page: reportStatus(`outputs/reports/pages/${domain}/${pageCode}.json`)
  };
});

const calculatedStatus = rows.some((row) => ['schema', 'policy', 'page'].some((stage) => row[stage] === 'failed'))
  ? 'failed'
  : rows.some((row) => ['schema', 'policy', 'page'].some((stage) => row[stage] === 'missing'))
    ? 'incomplete'
    : 'passed';
const status = forcedStatus || calculatedStatus;
const summary = {
  generatedAt: new Date().toISOString(),
  status,
  pageCount: rows.length,
  passedPageCount: rows.filter((row) => ['schema', 'policy', 'page'].every((stage) => row[stage] === 'passed')).length,
  stages: {
    schema: countStage(rows, 'schema'),
    policy: countStage(rows, 'policy'),
    page: countStage(rows, 'page'),
    visual: {
      status: 'evidence-only',
      fileCount: listFilesRecursive('outputs/reports/visual', (filePath) => /\.(png|jpe?g)$/i.test(filePath)).length
    }
  },
  pages: rows
};

writeJson('outputs/reports/harness-summary.json', summary);
writeText('outputs/reports/harness-summary.html', renderHtml(summary));
console.log('Harness summary generated: outputs/reports/harness-summary.html');

function reportStatus(filePath) {
  if (!fs.existsSync(filePath)) return 'missing';
  return readJson(filePath).status || 'unknown';
}

function countStage(items, stage) {
  return {
    passed: items.filter((item) => item[stage] === 'passed').length,
    failed: items.filter((item) => item[stage] === 'failed').length,
    missing: items.filter((item) => item[stage] === 'missing').length
  };
}

function renderHtml(data) {
  const statusText = { passed: '全部通过', failed: '存在失败', incomplete: '检查不完整' }[data.status] || data.status;
  const statusClass = data.status === 'passed' ? 'ok' : data.status === 'failed' ? 'bad' : 'warn';
  const cards = [
    ['正式页面', `${data.passedPageCount}/${data.pageCount}`],
    ['Schema检查', `${data.stages.schema.passed}/${data.pageCount}`],
    ['策略检查', `${data.stages.policy.passed}/${data.pageCount}`],
    ['HTML检查', `${data.stages.page.passed}/${data.pageCount}`],
    ['视觉证据', `${data.stages.visual.fileCount} 张`]
  ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
  const tableRows = data.pages.map((row) => `<tr>
    <td>${escapeHtml(row.pageName)}</td>
    <td>${escapeHtml(row.pageCode)}</td>
    <td>${badge(row.schema)}</td>
    <td>${badge(row.policy)}</td>
    <td>${badge(row.page)}</td>
  </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PMS Harness 汇总报告</title>
  <style>
    :root { color-scheme: light; font-family: "Microsoft YaHei", Arial, sans-serif; color: #1f2329; background: #f5f7fa; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; }
    main { width: min(1180px, 100%); margin: 0 auto; }
    header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 28px; }
    .status, .badge { display: inline-flex; align-items: center; border: 1px solid; border-radius: 6px; }
    .status { padding: 8px 14px; font-weight: 600; }
    .badge { min-width: 72px; justify-content: center; padding: 4px 8px; font-size: 13px; }
    .ok { color: #389e0d; border-color: #b7eb8f; background: #f6ffed; }
    .bad { color: #cf1322; border-color: #ffa39e; background: #fff1f0; }
    .warn { color: #d46b08; border-color: #ffd591; background: #fff7e6; }
    .metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric, .table-card { border: 1px solid #e5e6eb; border-radius: 8px; background: #fff; }
    .metric { padding: 18px; }
    .metric span { display: block; color: #646a73; font-size: 14px; }
    .metric strong { display: block; margin-top: 8px; font-size: 24px; }
    .table-card { overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { height: 52px; padding: 0 20px; border-bottom: 1px solid #f0f0f0; text-align: left; }
    th { color: #646a73; background: #fafafa; font-weight: 500; }
    tr:last-child td { border-bottom: 0; }
    footer { margin-top: 16px; color: #8f959e; font-size: 13px; }
    @media (max-width: 800px) { body { padding: 16px; } .metrics { grid-template-columns: repeat(2, 1fr); } .table-card { overflow-x: auto; } table { min-width: 720px; } }
  </style>
</head>
<body>
  <main>
    <header><div><h1>PMS Harness 汇总报告</h1></div><span class="status ${statusClass}">${escapeHtml(statusText)}</span></header>
    <section class="metrics">${cards}</section>
    <section class="table-card">
      <table>
        <thead><tr><th>页面</th><th>页面编码</th><th>Schema</th><th>策略</th><th>HTML</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </section>
    <footer>生成时间：${escapeHtml(new Date(data.generatedAt).toLocaleString('zh-CN', { hour12: false }))}。视觉目录为截图证据，不参与结构检查判定。</footer>
  </main>
</body>
</html>`;
}

function badge(value) {
  const label = { passed: '通过', failed: '失败', missing: '未生成', unknown: '未知' }[value] || value;
  const className = value === 'passed' ? 'ok' : value === 'failed' ? 'bad' : 'warn';
  return `<span class="badge ${className}">${escapeHtml(label)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
