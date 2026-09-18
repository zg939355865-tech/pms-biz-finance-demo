import fs from 'node:fs';
import path from 'node:path';
import { readJson, writeJson } from '../lib/file-utils.mjs';

const manifest = readJson('prototype-resources/manifest.json');
const htmlPath = process.argv[2] || 'prototype-resources/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const issues = [];
const components = manifest.categories.flatMap((category) => category.components);
const registry = readJson('prototype-resources/components/component-registry.json');
const officialNames = new Set(components.map((item) => item.name));
const pmsComponents = [...new Set(Object.values(registry.categories).flat())].filter((name) => !officialNames.has(name));
const names = components.map((item) => item.name);
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

if (duplicates.length) issues.push(error(`duplicate components: ${[...new Set(duplicates)].join(', ')}`));
for (const component of components) {
  if (!html.includes(`data-resource-component="${component.name}"`)) issues.push(error(`${component.name} is missing from resource center`));
}
for (const component of pmsComponents) {
  if (!html.includes(`data-resource-pms="${component}"`)) issues.push(error(`${component} PMS component is missing from resource center`));
}
for (const sample of manifest.pageSamples) {
  const filePath = sample.path.split(/[?#]/, 1)[0];
  const absolute = path.resolve('prototype-resources', filePath);
  if (!fs.existsSync(absolute)) issues.push(error(`page sample not found: ${sample.path}`));
  if (!sample.template || !fs.existsSync(path.resolve('prototype-resources', sample.template))) issues.push(error(`page template not found: ${sample.template || sample.name}`));
}
if (!html.includes('data-view-panel="samples"')) issues.push(error('page sample view is missing'));
if (!html.includes('data-view-panel="rules"')) issues.push(error('design rules view is missing'));
if (!html.includes('components/tokens.css')) issues.push(error('project tokens are not referenced'));

const reportPath = 'outputs/reports/resource-center.json';
writeJson(reportPath, {
  stage: 'resource-center-check',
  status: issues.length ? 'failed' : 'passed',
  baseline: manifest.antDesignBaseline,
  officialComponentCount: components.length,
  pmsComponentCount: pmsComponents.length,
  pageSampleCount: manifest.pageSamples.length,
  issues
});
console.log(`Resource center check: ${issues.length ? 'failed' : 'passed'} (${components.length}/${components.length} components)`);
if (issues.length) process.exit(1);
function error(message) { return { level: 'error', message }; }
