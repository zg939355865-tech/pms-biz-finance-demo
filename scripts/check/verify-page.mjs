import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../lib/playwright-smoke.mjs';

const schemaPath = process.argv[2];
if (!schemaPath) throw new Error('Usage: node scripts/check/verify-page.mjs <schemas/pages/{domain}/page.json>');

const startTime = Date.now();
const results = [];
let hasFailure = false;

// 读取 Schema 获取输出路径
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const outputPath = schema.outputPath;
const pageName = schema.pageName || path.basename(schemaPath, '.json');

console.log(`[verify:page] ${pageName}`);
console.log(`  Schema: ${schemaPath}`);
console.log(`  Output: ${outputPath}\n`);

// 步骤 1-5：构建流程
const buildSteps = [
  { name: 'policy-defaults', script: 'scripts/check/policy-defaults-check.mjs' },
  { name: 'schema-check', script: 'scripts/check/schema-check.mjs', args: [schemaPath] },
  { name: 'page-from-schema', script: 'scripts/generate/page-from-schema.mjs', args: [schemaPath] },
  { name: 'policy-check', script: 'scripts/check/policy-check.mjs', args: [schemaPath] },
  { name: 'page-check', script: 'scripts/check/page-check.mjs', args: [schemaPath] }
];

for (const step of buildSteps) {
  const result = runStep(step.script, step.args || []);
  if (result.status === 0) {
    results.push({ step: step.name, status: 'passed' });
  } else {
    results.push({ step: step.name, status: 'failed' });
    hasFailure = true;
    break; // 构建失败，跳过后续步骤
  }
}

// 步骤 6-7：视口检查（仅当构建成功时）
if (!hasFailure) {
  const absolutePath = path.resolve(outputPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`  ✗ viewport-check       FAILED: output file not found`);
    hasFailure = true;
  } else {
    // 静态检查（不需要浏览器）
    const html = fs.readFileSync(absolutePath, 'utf8');
    const staticChecks = [];
    if (!/prototype-resources\/components\/tokens\.css/.test(html)) staticChecks.push('public tokens.css missing');
    if (!/prototype-resources\/components\/(?:components|legacy-page-bridge)\.css/.test(html)) staticChecks.push('public components.css missing');
    if (!/<meta\s+name=["']viewport["']/i.test(html)) staticChecks.push('viewport metadata missing');
    if (!/<title>[^<]+<\/title>/i.test(html)) staticChecks.push('document title missing');
    if (/<script[^>]+src=["']https?:\/\//i.test(html)) staticChecks.push('external blocking script detected');

    if (staticChecks.length > 0) {
      console.error(`  ✗ static-check         FAILED`);
      for (const msg of staticChecks) console.error(`    ${msg}`);
      hasFailure = true;
    } else {
      results.push({ step: 'static-check', status: 'passed' });
    }

    // 浏览器视口检查（可选，沙箱环境可能无法启动浏览器）
    try {
      const viewportResults = await checkViewports(absolutePath);
      for (const result of viewportResults) {
        results.push(result);
        if (result.status === 'failed') hasFailure = true;
      }
    } catch (error) {
      if (error.message && (error.message.includes('EPERM') || error.message.includes('spawn'))) {
        console.log(`  ⊘ viewport-browser     skipped (browser not available)`);
        results.push({ step: 'viewport-browser', status: 'skipped' });
      } else {
        console.error(`  ✗ viewport-browser     FAILED: ${error.message}`);
        results.push({ step: 'viewport-browser', status: 'failed' });
        hasFailure = true;
      }
    }
  }
}

// 汇总
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
const passedCount = results.filter(r => r.status === 'passed').length;
const skippedCount = results.filter(r => r.status === 'skipped').length;
const totalCount = results.length;

console.log('');
for (const result of results) {
  if (result.status === 'passed') {
    console.log(`  ✓ ${result.step.padEnd(20)} passed`);
  } else if (result.status === 'skipped') {
    console.log(`  ⊘ ${result.step.padEnd(20)} skipped`);
  } else {
    console.error(`  ✗ ${result.step.padEnd(20)} FAILED`);
  }
}
console.log('');

if (hasFailure) {
  console.log(`FAILED — ${passedCount}/${totalCount} checks passed in ${elapsed}s`);
  process.exit(1);
} else {
  const skipNote = skippedCount > 0 ? ` (${skippedCount} skipped)` : '';
  console.log(`PASSED — ${passedCount}/${totalCount} checks in ${elapsed}s${skipNote}`);
}

function runStep(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    shell: false
  });
  return result;
}

async function checkViewports(htmlPath) {
  const viewports = [
    { width: 1440, height: 1000, label: 'viewport-1440' },
    { width: 2048, height: 1152, label: 'viewport-2048' }
  ];
  const results = [];

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true
  });

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    try {
      await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(300);

      const metrics = await page.evaluate(() => ({
        title: document.title.trim(),
        textLength: (document.body?.innerText || '').replace(/\s+/g, '').length,
        globalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        hasTokens: /prototype-resources\/components\/tokens\.css/.test(document.documentElement.outerHTML),
        hasComponents: /prototype-resources\/components\/(?:components|legacy-page-bridge)\.css/.test(document.documentElement.outerHTML)
      }));

      if (!metrics.title) errors.push('document title missing');
      if (metrics.textLength < 2) errors.push('page body is blank');
      if (metrics.globalOverflow) errors.push('page-level horizontal overflow');
      if (!metrics.hasTokens || !metrics.hasComponents) errors.push('public tokens or component stylesheet missing');
      for (const message of errors.slice(0, 3)) {
        // 只收集前 3 个错误
      }
    } catch (error) {
      errors.push(error.message);
    } finally {
      await page.close();
    }

    results.push({
      step: viewport.label,
      status: errors.length === 0 ? 'passed' : 'failed',
      errors
    });
  }

  await browser.close();
  return results;
}
