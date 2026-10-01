// Sanity checks that the verify harness still catches real differences (npm run verify:selftest).
// Compares the new build against itself, deliberately mutated, so it needs neither the old
// server nor migration data -- only the new site running on NEW.
import { chromium } from "playwright";
import fs from "node:fs";
import { shot, compare, isExceptionUnverifiable, NEW } from "./visual.mjs";
import { edits as contentEdits } from "../migrate/edits.mjs";

const ops = JSON.parse(fs.readFileSync("scripts/migrate/ops.json", "utf8"));
const newestPost = Object.keys(ops)[0]; // newest-first; guaranteed present on page 1 of the home listing

const assertions = [];
function check(name, ok) { assertions.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}`); }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });

// (a) the same page compared with itself is 0 diff.
{
  const a = await shot(page, NEW + "/", {});
  const b = await shot(page, NEW + "/", {});
  const r = compare(a.png, b.png, "verify-out/selftest-a.png");
  check("(a) identical page -> 0 diff", r.diff === 0);
}

// (b) one word of text changed on the new side -> non-zero diff AND textOk false.
// (default text selector is "article.content", so the mutation must land inside it.)
{
  const a = await shot(page, NEW + "/", {});
  const b = await shot(page, NEW + "/", {
    mutate: () => { const el = document.querySelector("article.content .latest-post-title a"); el.textContent = el.textContent.replace(/./, "X"); },
  });
  const r = compare(a.png, b.png, "verify-out/selftest-b.png");
  check("(b) word change -> non-zero diff", r.diff !== 0);
  check("(b) word change -> textOk false", a.text !== b.text);
}

// (c) an image hidden on the new side -> non-zero diff. (Uses a post page with a real inline
// photo; the home page's only <img> is the mobile nav icon, display:none at this viewport.)
{
  const url = NEW + "/2024/01/29/复旦大学北加州校友会2024届理事会成立/";
  const a = await shot(page, url, {});
  const b = await shot(page, url, {
    mutate: () => { document.querySelector("article.content img").style.visibility = "hidden"; },
  });
  const r = compare(a.png, b.png, "verify-out/selftest-c.png");
  check("(c) image hidden -> non-zero diff", r.diff !== 0);
}

// (d) a list/ block with one character changed -> non-zero diff.
{
  const sel = `section.latest-post:has(.latest-post-title a[href$="${newestPost}"])`;
  const isolate = { keep: sel, dropFooter: true, clipSelector: sel };
  const a = await shot(page, NEW + "/", { selector: sel, isolate });
  const b = await shot(page, NEW + "/", {
    selector: sel, isolate,
    mutate: (titleSel) => { const el = document.querySelector(titleSel); el.textContent = el.textContent.replace(/./, "X"); },
    mutateArg: `${sel} .latest-post-title a`,
  });
  const r = compare(a.png, b.png, "verify-out/selftest-d.png");
  check("(d) list block char change -> non-zero diff", r.diff !== 0);
}

// (e) an exceptioned post (one with edits.mjs fixes applied cleanly, so exceptionUnverifiable
// stays false) still fails on a deliberate, unrelated new-side change -- exceptions.json no
// longer blankets the whole row by post identity (the bug that hid Task 8's excerpt-cut bug).
// (This post's media was stripped during migration, so there's no real inline <img> left to hide
// -- a text change inside the post content is an equally unrelated mutation to detect.)
{
  const file = "content/posts/2016-08-01-2015浦江之夏-上海七大高校联合夏季烧烤转载/index.html";
  const postEdits = contentEdits.filter((e) => e.file === file).map(({ find, replace }) => ({ find, replace }));
  const url = NEW + "/2016/08/01/2015浦江之夏-上海七大高校联合夏季烧烤转载/";
  const postOps = { edits: postEdits, editSelector: "article.content" };
  const a = await shot(page, url, { old: true, postOps });
  const b = await shot(page, url, {
    old: true, postOps,
    mutate: () => { const el = document.querySelector("article.content p"); el.textContent = `X${el.textContent}`; },
  });
  const r = compare(a.png, b.png, "verify-out/selftest-e.png");
  check("(e) edited post's edits apply cleanly -> not exceptionUnverifiable", !isExceptionUnverifiable(a.editResults));
  check("(e) unrelated text change on an excepted post -> still reported as failure", r.diff !== 0);
}

await browser.close();
fs.mkdirSync("verify-out", { recursive: true });
fs.writeFileSync("verify-out/selftest.json", JSON.stringify(assertions, null, 2));
const failed = assertions.filter((a) => !a.ok);
console.log(`${assertions.length} assertions, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
