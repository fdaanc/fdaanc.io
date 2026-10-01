import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize, FREEZE_CSS } from "./normalize.js";

export const OLD = "http://localhost:8001", NEW = "http://localhost:8002";
export const WIDTHS = [1280, 390];

const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", woff2: "font/woff2", woff: "font/woff" };
function mimeFor(file) {
  return MIME[path.extname(file).slice(1).toLowerCase()] ?? "application/octet-stream";
}

// Applied to both sides' pages, so a `list/`-or-`pagination` screenshot's target block sits
// at the same (deterministic) position regardless of how many posts precede it in the flow.
function isolateBlocks({ keep, dropFooter }) {
  document.querySelectorAll("article.content section.latest-post").forEach((el) => {
    if (keep && el.matches(keep)) return;
    el.remove();
  });
  if (dropFooter) document.querySelectorAll("footer.pagination").forEach((el) => el.remove());
}

async function elementClip(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }, selector);
}

// Old-side requests are localized/font-served/same-origin-passed or aborted; new-side requests
// are same-origin by construction (everything self-hosted), so the same handler is correct for
// both and keeps every third-party host (YouTube, PayPal, Google Fonts, gravatar) off the wire.
export function setupRouting(page, { localized = {}, googleFontsCss = "" } = {}) {
  return page.route("**/*", (route) => {
    const url = route.request().url();
    if (/wp-emoji-release\.min\.js/.test(url)) return route.abort();
    let host, pathname;
    try { ({ host, pathname } = new URL(url)); } catch { host = pathname = ""; }
    // The old-side page (localhost:8001) requests these fonts cross-origin, from the rewritten
    // Google Fonts CSS pointing at localhost:8002 -- the new server's plain static response has
    // no Access-Control-Allow-Origin header, so the browser silently drops the font (falls back
    // to a system font, with different metrics) unless we add that header ourselves here.
    const fontFile = /^\/assets\/fonts\/[^/]+$/.test(pathname) ? pathname.slice(1) : null;
    if (fontFile) return route.fulfill({ path: path.resolve(fontFile), contentType: mimeFor(fontFile), headers: { "Access-Control-Allow-Origin": "*" } });
    if (host === "localhost:8001" || host === "localhost:8002") return route.continue();
    if (localized[url]) return route.fulfill({ path: path.resolve(localized[url]), contentType: mimeFor(localized[url]) });
    if (host === "fonts.googleapis.com") return route.fulfill({ contentType: "text/css; charset=utf-8", body: googleFontsCss });
    return route.abort();
  });
}

export async function settle(page, extraCss = "") {
  await page.addStyleTag({ content: FREEZE_CSS + extraCss });
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
    await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
    await document.fonts.ready;
  });
}

// opts: { old, postOps, selector, extraCss, isolate: { keep, dropFooter, clipSelector }, mutate, mutateArg }
// `mutate` (selftest only) runs a page.evaluate after navigation, to deliberately break a shot.
// It gets `mutateArg` as its sole argument -- it must not close over any outer Node variable,
// since Playwright serializes only the function's own source text into the browser context.
export async function shot(page, url, opts = {}) {
  const { old, postOps, selector, extraCss, isolate, mutate, mutateArg } = opts;
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  if (old) await page.evaluate(normalize, postOps ?? {});
  if (mutate) await page.evaluate(mutate, mutateArg);
  if (isolate) await page.evaluate(isolateBlocks, isolate);
  await settle(page, extraCss);
  let png;
  if (isolate) png = await page.screenshot({ fullPage: true, clip: await elementClip(page, isolate.clipSelector) });
  else if (selector) png = await page.locator(selector).first().screenshot();
  else png = await page.screenshot({ fullPage: true });
  const text = await page.evaluate((s) => (document.querySelector(s ?? "article.content")?.innerText ?? "").replace(/\s+/g, " ").trim(), selector);
  return { png: PNG.sync.read(png), text };
}

export function compare(a, b, out) {
  if (a.width !== b.width || a.height !== b.height) return { diff: -1, size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  const d = new PNG({ width: a.width, height: a.height });
  const diff = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
  if (diff) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, PNG.sync.write(d)); }
  return { diff };
}

// Run `items` through `worker(page, item)` using a fixed-size pool of pages, each lane pulling
// the next queued item as it finishes (not statically pre-sliced), so a slow job on one lane
// doesn't idle the others.
export async function withPool(browser, { count, viewport, setup }, items, worker) {
  const pages = await Promise.all(Array.from({ length: Math.min(count, items.length) || 1 }, async () => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    if (setup) await setup(page);
    return page;
  }));
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(pages.map(async (page) => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(page, items[i]);
    }
  }));
  await Promise.all(pages.map((p) => p.close()));
  return results;
}

async function main() {
  const ops = JSON.parse(fs.readFileSync("scripts/migrate/ops.json", "utf8"));
  const exceptions = JSON.parse(fs.readFileSync("scripts/verify/exceptions.json", "utf8"));
  const localized = JSON.parse(fs.readFileSync("scripts/migrate/localized.json", "utf8"));
  const googleFontsCss = fs.readFileSync("assets/css/fonts.css", "utf8").replace(/url\(\.\.\/fonts\//g, "url(http://localhost:8002/assets/fonts/");
  const argv = process.argv;
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : null;
  const concurrency = argv.includes("--concurrency") ? Number(argv[argv.indexOf("--concurrency") + 1]) : 6;

  // Job list: every post page, every post block on listing pages, chrome, pagination, 404.
  function jobs(oldListing, newListing) {
    const list = [];
    for (const p of Object.keys(ops)) {
      list.push({ name: `post${p}`, oldUrl: OLD + p, newUrl: NEW + encodeURI(p), postOps: ops[p] });
      // A post listed on the old site's bare "/" (home, depth 0) gets a root-relative href with
      // no leading "/" or "../" at all (e.g. "2026/08/17/x/"), so it never matches a suffix
      // pattern built from p's own leading "/" -- match both the absolute and relative forms.
      const rel = p.slice(1);
      const sel = [p, rel].flatMap((v) => [encodeURI(v).toLowerCase(), v])
        .map((v) => `section.latest-post:has(.latest-post-title a[href$="${v}"])`).join(", ");
      list.push({ name: `list${p}`, oldUrl: OLD + oldListing[p], newUrl: NEW + newListing[p], selector: sel, postOps: ops[p], isolate: { keep: sel, dropFooter: true, clipSelector: sel } });
    }
    list.push({ name: "chrome-home", oldUrl: OLD + "/", newUrl: NEW + "/", selector: "body", chromeOnly: true });
    for (const n of [1, 2, 8, 15]) {
      const u = n === 1 ? "/" : `/page/${n}/`;
      list.push({ name: `pagination-${n}`, oldUrl: OLD + u, newUrl: NEW + u, isolate: { keep: null, dropFooter: false, clipSelector: "footer.pagination" } });
    }
    list.push({ name: "404", oldUrl: OLD + "/404.html", newUrl: NEW + "/404.html" });
    return list.filter((j) => !only || j.name.includes(only));
  }

  async function listingIndex(page, base, pages) {
    const idx = {};
    for (let n = 1; n <= pages; n++) {
      const u = n === 1 ? "/" : `/page/${n}/`;
      await page.goto(base + u, { waitUntil: "load", timeout: 30000 });
      for (const href of await page.$$eval(".latest-post-title a", (as) => as.map((a) => new URL(a.href).pathname))) idx[decodeURI(href)] = u;
    }
    return idx;
  }

  const browser = await chromium.launch();
  const results = [];
  for (const width of WIDTHS) {
    const idxPage = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await setupRouting(idxPage, { localized, googleFontsCss });
    const oldListing = await listingIndex(idxPage, OLD, 15), newListing = await listingIndex(idxPage, NEW, 15);
    await idxPage.close();

    const jobList = jobs(oldListing, newListing);
    const setup = (page) => setupRouting(page, { localized, googleFontsCss });
    const jobResults = await withPool(browser, { count: concurrency, viewport: { width, height: 900 }, setup }, jobList, async (page, j) => {
      // display:none (not visibility:hidden) so the content column's box doesn't drive
      // page height while posts don't exist on the new side yet (Task 1's placeholder).
      const chromeCss = j.chromeOnly ? "article.content { display: none !important; }" : "";
      const run = (url, old) => shot(page, url, { old, postOps: j.postOps, selector: j.selector, extraCss: chromeCss, isolate: j.isolate });
      const excepted = Boolean(exceptions[j.name.replace(/^(post|list)/, "")]);
      try {
        let a = await run(j.oldUrl, true), b = await run(j.newUrl, false);
        let r = compare(a.png, b.png, `verify-out/${width}/${j.name.replace(/\//g, "_")}.png`);
        if (r.diff !== 0) { a = await run(j.oldUrl, true); b = await run(j.newUrl, false); r = compare(a.png, b.png, `verify-out/${width}/${j.name.replace(/\//g, "_")}.png`); } // one retry for network flake
        const textOk = j.chromeOnly || j.name.startsWith("pagination") || a.text === b.text;
        return { width, name: j.name, ...r, textOk, excepted };
      } catch (e) {
        // Any per-job failure (navigation timeout, a selector that matches nothing) is recorded
        // as a failure, never silently skipped -- the run continues to the next job.
        return { width, name: j.name, diff: -1, error: e.message.split("\n")[0], textOk: false, excepted };
      }
    });
    results.push(...jobResults);

    // Behavior: mobile nav toggles open and closes.
    if (width === 390) {
      const navPage = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await setupRouting(navPage, { localized, googleFontsCss });
      await navPage.goto(NEW + "/", { waitUntil: "load" });
      await navPage.click(".primary-nav-button");
      const opened = await navPage.$eval(".primary-nav", (e) => e.classList.contains("open"));
      await navPage.click("#footer");
      const closed = await navPage.$eval(".primary-nav", (e) => !e.classList.contains("open"));
      results.push({ width, name: "nav-toggle", diff: opened && closed ? 0 : 1, textOk: true, excepted: false });
      await navPage.close();
    }
  }
  await browser.close();
  fs.mkdirSync("verify-out", { recursive: true });
  fs.writeFileSync("verify-out/summary.json", JSON.stringify(results, null, 2));
  const bad = results.filter((r) => (r.diff !== 0 || !r.textOk) && !r.excepted);
  console.table(results.filter((r) => r.diff !== 0 || !r.textOk));
  console.log(`${results.length} checks, ${bad.length} failing, ${results.filter((r) => r.excepted && r.diff).length} excepted`);
  process.exit(bad.length ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
