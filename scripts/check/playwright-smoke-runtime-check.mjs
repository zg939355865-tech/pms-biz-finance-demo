import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installSafeClose } from '../lib/playwright-smoke.mjs';

if (process.argv[2] === 'timeout-child') {
  const browser = { close: () => new Promise(() => {}) };
  installSafeClose(browser, { closeTimeoutMs: 50, forceExitDelayMs: 50 });
  await browser.close();
  console.log('timeout fallback returned control');
} else if (process.argv[2] === 'failure-child') {
  const browser = { close: () => new Promise(() => {}) };
  installSafeClose(browser, { closeTimeoutMs: 50, forceExitDelayMs: 50 });
  await browser.close();
  console.error('simulated smoke assertion failure');
  process.exitCode = 7;
} else {
  const quickBrowser = { close: async () => undefined };
  installSafeClose(quickBrowser, { closeTimeoutMs: 50, forceExitDelayMs: 50 });
  await quickBrowser.close();

  const startedAt = Date.now();
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'timeout-child'], {
    encoding: 'utf8',
    timeout: 3000
  });
  const elapsed = Date.now() - startedAt;
  const output = `${child.stdout || ''}\n${child.stderr || ''}`;

  if (child.status !== 0) {
    console.error(`Timeout fallback child failed with status ${child.status}: ${output.trim()}`);
    process.exit(1);
  }
  if (!output.includes('timeout fallback returned control')) {
    console.error('Timeout fallback did not return control to the smoke script.');
    process.exit(1);
  }
  if (!output.includes('Browser close timed out after 50ms')) {
    console.error('Timeout fallback did not emit the expected cleanup warning.');
    process.exit(1);
  }
  if (elapsed >= 2000) {
    console.error(`Timeout fallback took too long: ${elapsed}ms`);
    process.exit(1);
  }

  const failureChild = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'failure-child'], {
    encoding: 'utf8',
    timeout: 3000
  });
  if (failureChild.status !== 7 || !failureChild.stderr.includes('simulated smoke assertion failure')) {
    console.error('Timeout fallback masked the smoke failure exit code.');
    process.exit(1);
  }

  console.log(`Playwright smoke runtime check passed in ${elapsed}ms`);
}
