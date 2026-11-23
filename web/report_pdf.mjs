// Prints the Report page (docs/report.md) to public/report.pdf, the PDF the page links to and the one for Canvas.
// Build the site first, then, from the repo root:
//   cd web && npm run build && npm run report:pdf && npm run build
// It serves the build on port 5191, opens #/report in Chromium (Playwright) and prints it with the page's print styles
// (src/index.css, @media print). Links that point at the local server are changed to the live site first.
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

const HERE = import.meta.dirname;
/** The published site (GitHub Pages). */
const LIVE = 'https://yezhanggg.github.io/YZMUSA5500/';
const OUT = resolve(HERE, 'public', 'report.pdf');

const server = await preview({ configFile: resolve(HERE, 'vite.config.ts') });
const local = server.resolvedUrls?.local[0] ?? 'http://localhost:5191/';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1300 } });
  await page.goto(`${local}#/report`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.doc');
  await page.evaluate(async (live) => {
    await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => (i.onload = i.onerror = r)))));
    const here = location.origin + '/';
    for (const a of document.querySelectorAll('a[href]')) if (a.href.startsWith(here)) a.href = live + a.href.slice(here.length);
  }, LIVE);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: OUT, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  console.log(`wrote ${OUT}`);
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
