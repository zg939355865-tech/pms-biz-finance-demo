import { chromium } from '../lib/playwright-smoke.mjs';
const b = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft Edge/Application/msedge.exe', headless: true });
console.log('launched ok');
await b.close();
