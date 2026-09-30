import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";
import { normalize, FREEZE_CSS } from "./normalize.js";

const OLD = "http://localhost:8001", NEW = "http://localhost:8002";
const WIDTHS = [1280, 390];
const ops = JSON.parse(fs.readFileSync("scripts/migrate/ops.json", "utf8"));
const exceptions = JSON.parse(fs.readFileSync("scripts/verify/exceptions.json", "utf8"));
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

async function settle(page, extraCss = "") {
  await page.addStyleTag({ content: FREEZE_CSS + extraCss });
  await page.evaluate(async () => {
    document.querySelectorAll("img").forEach((i) => (i.loading = "eager"));
    await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));
    await document.fonts.ready;
  });
}

async function shot(page, url, { old, postOps, selector, extraCss }) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (old) await page.evaluate(normalize, postOps ?? {});
  await settle(page, extraCss);
  const target = selector ? page.locator(selector).first() : page;
  const png = await target.screenshot(selector ? {} : { fullPage: true });
  const text = await page.evaluate((s) => (document.querySelector(s ?? "article.content")?.innerText ?? "").replace(/\s+/g, " ").trim(), selector);
  return { png: PNG.sync.read(png), text };
}

function compare(a, b, out) {
  if (a.width !== b.width || a.height !== b.height) return { diff: -1, size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  const d = new PNG({ width: a.width, height: a.height });
  const diff = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
  if (diff) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, PNG.sync.write(d)); }
  return { diff };
}

// Job list: every post page, every post block on listing pages, chrome, pagination, 404.
function jobs(oldListing, newListing) {
  const list = [];
  for (const p of Object.keys(ops)) {
    list.push({ name: `post${p}`, oldUrl: OLD + p, newUrl: NEW + encodeURI(p), postOps: ops[p] });
    const sel = `section.latest-post:has(.latest-post-title a[href$="${encodeURI(p).toLowerCase()}"]), section.latest-post:has(.latest-post-title a[href$="${p}"])`;
    list.push({ name: `list${p}`, oldUrl: OLD + oldListing[p], newUrl: NEW + newListing[p], selector: sel, postOps: ops[p] });
  }
  list.push({ name: "chrome-home", oldUrl: OLD + "/", newUrl: NEW + "/", selector: "body", chromeOnly: true });
  for (const n of [1, 2, 8, 15]) {
    const u = n === 1 ? "/" : `/page/${n}/`;
    list.push({ name: `pagination-${n}`, oldUrl: OLD + u, newUrl: NEW + u, selector: "footer.pagination" });
  }
  list.push({ name: "404", oldUrl: OLD + "/404.html", newUrl: NEW + "/404.html" });
  return list.filter((j) => !only || j.name.includes(only));
}

async function listingIndex(page, base, pages) {
  const idx = {};
  for (let n = 1; n <= pages; n++) {
    const u = n === 1 ? "/" : `/page/${n}/`;
    await page.goto(base + u);
    for (const href of await page.$$eval(".latest-post-title a", (as) => as.map((a) => new URL(a.href).pathname))) idx[decodeURI(href)] = u;
  }
  return idx;
}

const browser = await chromium.launch();
const results = [];
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const oldListing = await listingIndex(page, OLD, 15), newListing = await listingIndex(page, NEW, 15);
  for (const j of jobs(oldListing, newListing)) {
    // display:none (not visibility:hidden) so the content column's box doesn't drive
    // page height while posts don't exist on the new side yet (Task 1's placeholder).
    const chromeCss = j.chromeOnly ? "article.content { display: none !important; }" : "";
    const run = (url, old) => shot(page, url, { old, postOps: j.postOps, selector: j.selector, extraCss: chromeCss });
    let a = await run(j.oldUrl, true), b = await run(j.newUrl, false);
    let r = compare(a.png, b.png, `verify-out/${width}/${j.name.replace(/\//g, "_")}.png`);
    if (r.diff !== 0) { a = await run(j.oldUrl, true); b = await run(j.newUrl, false); r = compare(a.png, b.png, `verify-out/${width}/${j.name.replace(/\//g, "_")}.png`); } // one retry for network flake
    const textOk = j.chromeOnly || j.name.startsWith("pagination") || a.text === b.text;
    const excepted = Boolean(exceptions[j.name.replace(/^(post|list)/, "")]);
    results.push({ width, name: j.name, ...r, textOk, excepted });
  }
  // Behavior: mobile nav toggles open and closes.
  if (width === 390) {
    await page.goto(NEW + "/");
    await page.click(".primary-nav-button");
    const opened = await page.$eval(".primary-nav", (e) => e.classList.contains("open"));
    await page.click("#footer");
    const closed = await page.$eval(".primary-nav", (e) => !e.classList.contains("open"));
    results.push({ width, name: "nav-toggle", diff: opened && closed ? 0 : 1, textOk: true, excepted: false });
  }
  await page.close();
}
await browser.close();
fs.mkdirSync("verify-out", { recursive: true });
fs.writeFileSync("verify-out/summary.json", JSON.stringify(results, null, 2));
const bad = results.filter((r) => (r.diff !== 0 || !r.textOk) && !r.excepted);
console.table(results.filter((r) => r.diff !== 0 || !r.textOk));
console.log(`${results.length} checks, ${bad.length} failing, ${results.filter((r) => r.excepted && r.diff).length} excepted`);
process.exit(bad.length ? 1 : 0);
