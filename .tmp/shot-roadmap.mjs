import { chromium } from '../scripts/lib/playwright-smoke.mjs';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto('file:///D:/项目AI协作/4、PMS业财一体化/outputs/version-roadmap/index.html');
await page.waitForTimeout(600);
await page.screenshot({ path: '.tmp/roadmap-full.png', fullPage: true });
await browser.close();
console.log('ok');
