// Read a website: copy, meta, fonts, colours, design tokens, every real image, section screenshots.
// Usage: node capture.mjs <url> <run_dir>
// Writes <run_dir>/site.json and <run_dir>/public/site/* (images + screenshots).
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(new URL('../template/package.json', import.meta.url)); // playwright is installed in template/ by setup.sh
const {chromium} = require('playwright');

const [url, runDir] = process.argv.slice(2);
if (!url || !runDir) { console.error('usage: node capture.mjs <url> <run_dir>'); process.exit(1); }
const outDir = path.join(runDir, 'public', 'site');
fs.mkdirSync(outDir, {recursive: true});

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'});
const page = await ctx.newPage();
await page.goto(url, {waitUntil: 'networkidle', timeout: 60000}).catch(() => page.waitForLoadState('load'));
await page.waitForTimeout(1500);
await page.screenshot({path: path.join(outDir, 'screenshot-hero.png')});
// scroll section by section: lazy images load, scroll animations fire, and each viewport is saved so the
// design language (layout, cards, highlights, colour use) can be looked at, not just guessed from CSS
const sections = [];
const pageH = await page.evaluate(() => document.body.scrollHeight);
for (let i = 0, y = 0; y < pageH && i < 8; i++, y += 850) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(700);
  await page.screenshot({path: path.join(outDir, `section-${i}.png`)});
  sections.push(`site/section-${i}.png`);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.screenshot({path: path.join(outDir, 'screenshot-full.png'), fullPage: true}).catch(() => {});

const data = await page.evaluate(() => {
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const font = (sel) => cs(document.querySelector(sel))?.fontFamily ?? null;
  const ctxText = (el) => {
    // nearest heading / link / caption text, so we know what an image is
    const box = el.closest('a, figure, article, li, section, div');
    return (box?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, 160);
  };
  const imgs = [...document.images]
    .filter((i) => i.naturalWidth >= 120 && i.naturalHeight >= 80)
    .map((i) => ({src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight, context: ctxText(i)}));
  const rootVars = {};
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r.selectorText === ':root') for (const p of r.style) if (p.startsWith('--')) rootVars[p] = r.style.getPropertyValue(p).trim();
  }
  const colorOf = (sel, prop) => cs(document.querySelector(sel))?.[prop] ?? null;
  // any CSS colour (rgb/oklab/oklch...) -> #hex (+ alpha)
  const cv = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const hex = (c) => {
    if (!c || c === 'none') return c;
    cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data;
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('') + (a < 255 ? ` @${(a / 255).toFixed(2)}` : '');
  };
  const top = (arr) => { const m = {}; arr.filter(Boolean).forEach((k) => (m[k] = (m[k] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${k} (x${n})`); };
  const design = (() => {
    const all = [...document.querySelectorAll('body *')];
    const cards = all.filter((e) => { const s = cs(e), r = e.getBoundingClientRect(); return r.width > 220 && r.height > 120 && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && (s.boxShadow !== 'none' || s.borderTopWidth !== '0px') && parseFloat(s.borderTopLeftRadius) > 4; });
    const btns = all.filter((e) => /^(A|BUTTON)$/.test(e.tagName) && cs(e).backgroundColor !== 'rgba(0, 0, 0, 0)' && e.innerText.trim().length > 3 && e.getBoundingClientRect().height < 90);
    const h1 = document.querySelector('h1');
    const heads = [...document.querySelectorAll('h1, h2')];
    const emph = heads.flatMap((h) => [...h.querySelectorAll('*')].filter((e) => cs(e).color !== cs(h).color).map((e) => hex(cs(e).color)));
    const marks = all.filter((e) => /^(SPAN|MARK|EM|STRONG)$/.test(e.tagName) && cs(e).backgroundColor !== 'rgba(0, 0, 0, 0)' && e.innerText.trim().length > 2);
    const shadowColor = (s) => (s === 'none' ? 'none' : s.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px,? ?/g, '').slice(0, 100) || 'none');
    return {
      pageBackground: hex(cs(document.body).backgroundColor),
      cardRadius: top(cards.map((e) => cs(e).borderTopLeftRadius)),
      cardBackground: top(cards.map((e) => hex(cs(e).backgroundColor))),
      cardBorder: top(cards.map((e) => (cs(e).borderTopWidth !== '0px' ? `${cs(e).borderTopWidth} ${hex(cs(e).borderTopColor)}` : 'no border'))),
      cardShadow: top(cards.map((e) => shadowColor(cs(e).boxShadow))),
      buttons: top(btns.map((e) => `bg ${hex(cs(e).backgroundColor)} / text ${hex(cs(e).color)} / radius ${cs(e).borderTopLeftRadius} / weight ${cs(e).fontWeight}`)),
      h1: h1 ? {font: cs(h1).fontFamily.split(',')[0], size: cs(h1).fontSize, weight: cs(h1).fontWeight, tracking: cs(h1).letterSpacing, color: hex(cs(h1).color)} : null,
      headlineEmphasisColors: top(emph),
      markers: top(marks.map((e) => `bg ${hex(cs(e).backgroundColor)} / text ${hex(cs(e).color)} / radius ${cs(e).borderTopLeftRadius}`)),
    };
  })();
  return {
    design,
    url: location.href,
    title: document.title,
    description: meta('meta[name="description"]'),
    og: {title: meta('meta[property="og:title"]'), description: meta('meta[property="og:description"]'), image: meta('meta[property="og:image"]')},
    lang: document.documentElement.lang,
    headings: [...document.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName}: ${h.innerText.replace(/\s+/g, ' ').trim()}`).filter((s) => s.length > 4).slice(0, 60),
    nav: [...document.querySelectorAll('nav a, header a')].map((a) => a.innerText.trim()).filter(Boolean).slice(0, 20),
    ctas: [...document.querySelectorAll('a, button')].map((a) => a.innerText.trim()).filter((t) => t && t.length < 40).slice(0, 80),
    text: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 15000),
    fonts: {heading: font('h1') ?? font('h2'), body: font('body'), button: font('button, .btn, a')},
    googleFonts: [...document.querySelectorAll('link[href*="fonts.googleapis"]')].map((l) => l.href),
    colors: {body: colorOf('body', 'backgroundColor'), text: colorOf('body', 'color'), link: colorOf('a', 'color'), button: colorOf('button, .btn, a[class*="btn"]', 'backgroundColor'), h1: colorOf('h1', 'color')},
    cssVars: Object.fromEntries(Object.entries(rootVars).filter(([, v]) => /#|rgb|hsl|oklch/.test(v)).slice(0, 60)),
    icons: [...document.querySelectorAll('link[rel*="icon"]')].map((l) => l.href),
    images: imgs,
  };
});

// download every image (dedup by URL) under a readable name
const seen = new Map();
for (const img of [...data.images, ...(data.og.image ? [{src: data.og.image, alt: 'og:image', context: 'social share image'}] : []), ...data.icons.map((src) => ({src, alt: 'icon', context: 'site icon'}))]) {
  if (!img.src || img.src.startsWith('data:') || seen.has(img.src)) { img.file = seen.get(img.src) ?? null; continue; }
  try {
    const u = new URL(img.src);
    let name = u.pathname.split('/').filter(Boolean).slice(-3).join('-').replace(/[^\w.-]+/g, '_') || 'image';
    if (!/\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(name)) name += '.png';
    const res = await ctx.request.get(img.src);
    if (!res.ok()) continue;
    fs.writeFileSync(path.join(outDir, name), await res.body());
    img.file = `site/${name}`;
    seen.set(img.src, img.file);
  } catch { /* skip images that fail */ }
}
// Apple touch icon = the site's own square app icon, used as the avatar (Meet badge + end card).
// <link rel="apple-touch-icon"> first, then the conventional /apple-touch-icon.png.
data.appleTouchIcon = null;
const touchHref = await page.evaluate(() => document.querySelector('link[rel~="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]')?.href ?? null);
for (const href of [touchHref, new URL('/apple-touch-icon.png', data.url).href].filter(Boolean)) {
  const res = await ctx.request.get(href).catch(() => null);
  if (res?.ok() && (res.headers()['content-type'] ?? '').startsWith('image/')) {
    fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), await res.body());
    data.appleTouchIcon = 'site/apple-touch-icon.png';
    break;
  }
}
data.screenshots = {hero: 'site/screenshot-hero.png', full: 'site/screenshot-full.png', sections};
fs.writeFileSync(path.join(runDir, 'site.json'), JSON.stringify(data, null, 2));
await browser.close();
console.log(`captured ${data.title}\n  ${data.images.filter((i) => i.file).length} images -> ${outDir}\n  site.json -> ${path.join(runDir, 'site.json')}`);
