import { chromium } from '../scripts/lib/playwright-smoke.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try {
 fs.mkdirSync('outputs/reports/visual/login-direct',{recursive:true});
 for(const width of [1440,2048]){
  const context=await browser.newContext({viewport:{width,height:1100}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('menu/login.html')).href);
  if(await page.locator('#companySelect').inputValue() || await page.locator('#username').inputValue() || await page.locator('#password').inputValue())throw Error('初始字段非空');
  await page.screenshot({path:`outputs/reports/visual/login-direct/login-${width}.png`,fullPage:true});
  await page.locator('.login-button').click();
  await page.waitForURL('**/menu/index.html');
  const state=await page.evaluate(()=>({login:localStorage.getItem('pms-login-state'),company:localStorage.getItem('pms-current-company')}));
  if(state.login!=='authenticated'||state.company!=='昕彤赋能（长沙）人工智能行业应用系统有限公司')throw Error('默认登录状态错误');
  await page.locator('#contentFrame').contentFrame().locator('h1').filter({hasText:'项目驾驶舱'}).waitFor();
  await page.goto(pathToFileURL(path.resolve('menu/login.html')).href);
  await page.locator('#companySelect').selectOption({index:2});
  await page.locator('#username').fill('演示账号');await page.locator('#rememberAccount').check();
  await page.locator('.login-button').click();await page.waitForURL('**/menu/index.html');
  if(await page.evaluate(()=>localStorage.getItem('pms-current-company'))!=='昕彤赋能（武汉）设计研究有限公司')throw Error('选定企业未保留');
  if(errors.length)throw Error(errors.join('\n'));
  await context.close();
 }
 console.log('登录检查通过：空企业/账号/密码直接进入驾驶舱；手选企业及记住账号路径有效；1440px/2048px。');
}finally{await browser.close();}
