import { chromium as playwrightChromium } from 'file:///D:/Program%20Files/.codex/skills/mes-ur-generator/node_modules/playwright-core/index.mjs';

const DEFAULT_LAUNCH_TIMEOUT_MS = 30000;
const DEFAULT_CLOSE_TIMEOUT_MS = 3000;
const DEFAULT_FORCE_EXIT_DELAY_MS = 1000;

export const chromium = {
  async launch(options = {}) {
    const launchTimeout = positiveInteger(
      process.env.PMS_PLAYWRIGHT_LAUNCH_TIMEOUT_MS,
      DEFAULT_LAUNCH_TIMEOUT_MS
    );
    const browser = await playwrightChromium.launch({
      ...options,
      timeout: options.timeout ?? launchTimeout
    });
    return installSafeClose(browser);
  }
};

export function installSafeClose(browser, options = {}) {
  if (!browser || browser.__pmsSafeCloseInstalled) return browser;

  const closeTimeout = positiveInteger(
    options.closeTimeoutMs ?? process.env.PMS_PLAYWRIGHT_CLOSE_TIMEOUT_MS,
    DEFAULT_CLOSE_TIMEOUT_MS
  );
  const forceExitDelay = positiveInteger(
    options.forceExitDelayMs ?? process.env.PMS_PLAYWRIGHT_FORCE_EXIT_DELAY_MS,
    DEFAULT_FORCE_EXIT_DELAY_MS
  );
  const originalClose = browser.close.bind(browser);
  let closePromise;
  let forceExitTimer;

  Object.defineProperty(browser, '__pmsSafeCloseInstalled', {
    value: true,
    enumerable: false
  });

  browser.close = async (...args) => {
    closePromise ??= originalClose(...args);
    const result = await Promise.race([
      closePromise.then(
        () => ({ status: 'closed' }),
        (error) => ({ status: 'failed', error })
      ),
      delay(closeTimeout).then(() => ({ status: 'timeout' }))
    ]);

    if (result.status === 'failed') throw result.error;
    if (result.status === 'closed') return;

    if (!forceExitTimer) {
      console.warn(`Browser close timed out after ${closeTimeout}ms; forcing smoke process cleanup.`);
      forceExitTimer = setTimeout(() => {
        process.exit(process.exitCode ?? 0);
      }, forceExitDelay);
      closePromise.finally(() => clearTimeout(forceExitTimer)).catch(() => undefined);
    }
  };

  return browser;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
