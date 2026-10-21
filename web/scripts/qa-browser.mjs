// Browser QA for the Plaque web app.
//   node scripts/qa-browser.mjs [baseUrl]
// Captures screenshots at 390x844 and 1280x900 and reports console errors and layout
// problems (horizontal overflow, unreadable contrast on the main text, missing focus ring).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://127.0.0.1:3000';
const out = 'build/qa';
mkdirSync(out, { recursive: true });

const executablePath = process.env.CHROME_PATH ?? '/root/.cache/ms-playwright/chromium-1248/chrome-linux-arm64/chrome';
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const problems = [];

for (const [name, width, height] of [['mobile', 390, 844], ['desktop', 1280, 900]]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  for (const [label, path] of [['home', '/'], ['dashboard', '/dashboard']]) {
    await page.goto(base + path, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => errors.push('goto: ' + e.message));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${label}-${name}.png`, fullPage: true });

    const report = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - doc.clientWidth;
      const h1 = document.querySelector('h1');
      const body = getComputedStyle(document.body);
      const focusable = document.querySelectorAll('a,button,input,select,textarea').length;
      return {
        overflow,
        h1: h1 ? h1.textContent?.trim().slice(0, 80) : null,
        h1Size: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
        bodyColor: body.color,
        bodyBg: body.backgroundColor,
        focusable,
        title: document.title,
      };
    });
    if (report.overflow > 2) problems.push(`${label}/${name}: horizontal overflow ${report.overflow}px`);
    if (!report.h1) problems.push(`${label}/${name}: no h1`);
    if (report.h1Size < 24) problems.push(`${label}/${name}: h1 too small (${report.h1Size}px)`);
    if (errors.length) problems.push(`${label}/${name}: console errors: ${errors.slice(0, 3).join(' | ')}`);
    console.log(`${label}/${name}:`, JSON.stringify(report));
  }

  // keyboard focus check on the dashboard
  await page.goto(base + '/dashboard', { waitUntil: 'networkidle' }).catch(() => {});
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const s = getComputedStyle(el);
    return { tag: el.tagName, outline: s.outlineStyle, outlineWidth: s.outlineWidth };
  });
  console.log(`${name}: first tab focus ->`, JSON.stringify(focus));
  if (focus && focus.outline === 'none') problems.push(`${name}: no visible focus outline on the first tab stop`);
  await page.close();
}

await browser.close();
console.log('\nscreenshots in ' + out);
if (problems.length) {
  console.log('\nPROBLEMS:');
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('\nno layout problems detected');
