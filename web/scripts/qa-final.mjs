import { chromium } from 'playwright';

const CHROME = '/root/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome';
const BASE = process.env.QA_BASE ?? process.argv[2] ?? 'http://127.0.0.1:3000';
const OUT = '/root/hack/evidence/qa';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const results = [];
const log = (v, o) => { results.push({ viewport: v, ...o }); console.log(v, JSON.stringify(o)); };

async function pageFor(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  if (opts.wallet) {
    await page.addInitScript(() => {
      const address = '0x1111111111111111111111111111111111111111';
      window.ethereum = {
        request: async ({ method }) => {
          if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [address];
          if (method === 'eth_chainId') return '0x190f1ca9';
          if (method === 'personal_sign') {
            await new Promise((r) => setTimeout(r, 700));
            return '0x' + '11'.repeat(65);
          }
          throw new Error('unexpected wallet method ' + method);
        },
      };
    });
  }
  return { ctx, page, errors };
}

for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 900 }]]) {
  const { ctx, page, errors } = await pageFor(viewport);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/home-${label}.png`, fullPage: true });
  const home = await page.evaluate(() => ({
    h1: document.querySelector('h1')?.textContent?.trim(),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    contract: [...document.querySelectorAll('dd')].map((e) => e.textContent).find((t) => t?.startsWith('0x')),
  }));
  log(label, { page: 'home', ...home, errors });

  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.fill('input[aria-label="handle to claim"]', 'unify');
  await page.waitForFunction(() => document.querySelector('.state-pill')?.textContent?.trim() === 'taken', null, { timeout: 60000 });
  const taken = await page.evaluate(() => ({
    pill: document.querySelector('.state-pill')?.textContent?.trim(),
    owner: [...document.querySelectorAll('.faint')].map((e) => e.textContent).find((t) => t?.includes('owner')),
    button: [...document.querySelectorAll('button')].map((b) => ({ t: b.textContent?.trim(), dis: b.disabled })),
  }));
  await page.screenshot({ path: `${OUT}/live-dashboard-taken.png`, fullPage: true });

  await page.fill('input[aria-label="handle to claim"]', 'audit-free-1');
  await page.waitForFunction(() => {
    const t = document.querySelector('.state-pill')?.textContent?.trim();
    return t === 'needs-wallet';
  }, null, { timeout: 60000 });
  const free = await page.evaluate(() => ({
    pill: document.querySelector('.state-pill')?.textContent?.trim(),
    owner: [...document.querySelectorAll('.faint')].map((e) => e.textContent).find((t) => t?.includes('owner')) ?? null,
    button: [...document.querySelectorAll('button')].map((b) => ({ t: b.textContent?.trim(), dis: b.disabled })),
  }));
  await page.screenshot({ path: `${OUT}/dashboard-${label}.png`, fullPage: true });
  const dash = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    h1: document.querySelector('h1')?.textContent?.trim(),
    text: document.body.innerText.slice(0, 160),
  }));
  log(label, { page: 'dashboard', taken, free, ...dash, errors });
  await ctx.close();
}

// Loading state: delay the API, assert a skeleton is visible before data.
{
  const { ctx, page, errors } = await pageFor({ width: 390, height: 844 });
  await page.route('**/api/registry*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto(BASE + '/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  const loading = await page.evaluate(() => document.querySelectorAll('.skeleton').length);
  log('mobile', { page: 'loading', skeletons: loading, errors });
  await ctx.close();
}

// Error state: a 502 from the API must be shown, not an empty registry.
{
  const { ctx, page, errors } = await pageFor({ width: 390, height: 844 });
  await page.route('**/api/registry*', (route) => route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'simulated node outage' }),
  }));
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  const err = await page.evaluate(() => ({
    text: document.body.innerText,
    skeletons: document.querySelectorAll('.skeleton').length,
  }));
  log('mobile', { page: 'error', hasError: err.text.includes('simulated node outage'), hasEmptyClaim: err.text.includes('registry is empty'), skeletons: err.skeletons, errors });
  await ctx.close();
}

// Pending state and the sign-only payload: a mock wallet that delays personal_sign.
{
  const { ctx, page, errors } = await pageFor({ width: 390, height: 844 }, { wallet: true });
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.click('button:has-text("Connect wallet")');
  await page.waitForTimeout(200);
  await page.fill('input[aria-label="handle to claim"]', 'audit-free-1');
  await page.waitForFunction(() => document.querySelector('.state-pill')?.textContent?.trim() === 'available', null, { timeout: 60000 });
  const before = await page.evaluate(() => ({ pill: document.querySelector('.state-pill')?.textContent?.trim(), button: [...document.querySelectorAll('button')].map((b) => ({ t: b.textContent?.trim(), dis: b.disabled })) }));
  await page.click('button:has-text("Sign claim")');
  await page.waitForTimeout(150);
  const pending = await page.evaluate(() => ({ text: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()), spinner: document.querySelectorAll('.spinner').length }));
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    notice: document.querySelector('.notice-ok')?.textContent?.trim(),
    payload: document.querySelector('pre[aria-label="signed claim payload"]')?.textContent?.trim().slice(0, 80),
  }));
  await page.screenshot({ path: `${OUT}/dashboard-signed.png`, fullPage: true });
  log('mobile', { page: 'pending', before, pending, after, errors });
  await ctx.close();
}

await browser.close();
console.log('\nRESULT_JSON ' + JSON.stringify(results));
