import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as cheerio from "cheerio";
import { processMedia, report } from "./media.mjs";

const setup = (body) => {
  const oldRoot = fs.mkdtempSync(path.join(os.tmpdir(), "old-"));
  fs.mkdirSync(path.join(oldRoot, "wp-content/uploads/2026/08"), { recursive: true });
  fs.writeFileSync(path.join(oldRoot, "wp-content/uploads/2026/08/a.pdf"), "pdf");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "post-"));
  const $ = cheerio.load(`<section>${body}</section>`, { xml: { xmlMode: false, decodeEntities: false } });
  return { $, root: $("section"), postPath: "/2026/08/17/x/", dir, oldRoot, offline: true };
};

// A dead photo must vanish with its wrapper, or readers see an empty gap.
test("missing image inside link inside paragraph removes all three", () => {
  const ctx = setup('<p>Before</p><p><a href="../../wp-content/uploads/2012/02/IMG_1.jpg"><img src="../../wp-content/uploads/2012/02/IMG_1.jpg"></a></p><p>After</p>');
  const ops = processMedia(ctx);
  assert.equal(ctx.root.html(), "<p>Before</p><p>After</p>");
  assert.deepEqual(ops.remove, ['p:has(> a > img[src="../../wp-content/uploads/2012/02/IMG_1.jpg"])']);
});

test("existing upload is copied next to the post and linked by filename", () => {
  const ctx = setup('<a href="../../../../wp-content/uploads/2026/08/a.pdf">Bylaw</a>');
  processMedia(ctx);
  assert.equal(ctx.root.html(), '<a href="a.pdf">Bylaw</a>');
  assert.ok(fs.existsSync(path.join(ctx.dir, "a.pdf")));
});

test("link to a missing upload keeps its text", () => {
  const ctx = setup('<p>See <a href="../wp-content/uploads/2013/03/lyrics.pdf">lyrics</a>.</p>');
  const ops = processMedia(ctx);
  assert.equal(ctx.root.html(), "<p>See lyrics.</p>");
  assert.deepEqual(ops.unwrap, ['a[href="../wp-content/uploads/2013/03/lyrics.pdf"]']);
});

test("flash embed removed, youtube upgraded to https, smiley becomes text", () => {
  const ctx = setup('<p><embed type="application/x-shockwave-flash" src="http://player.youku.com/x.swf"></p><iframe src="http://www.youtube.com/embed/abc"></iframe><img class="wp-smiley" alt="🙂" src="https://s.w.org/x.png">');
  processMedia(ctx);
  assert.equal(ctx.root.html(), '<iframe src="https://www.youtube.com/embed/abc"></iframe>🙂');
});

// Browsers decode entities when parsing the old page's live DOM; a recorded selector built
// from the raw, undecoded src would never match there and the normalize step would no-op.
test("recorded selector decodes HTML entities so it matches the live old DOM", () => {
  const ctx = setup('<p><img src="../../wp-content/uploads/2012/02/IMG_1.jpg?a=1&#038;b=2"></p>');
  const ops = processMedia(ctx);
  assert.deepEqual(ops.remove, ['p:has(> img[src="../../wp-content/uploads/2012/02/IMG_1.jpg?a=1&b=2"])']);
});

// A Picasa-style embed often links both its thumbnail and its caption text to the same
// dead album URL. The removed (image) link's selector must not also match the caption link,
// or the old-DOM replay (which matches by selector, not by node identity) removes both.
test("a missing link wrapping an image is removed without matching a same-href text link", () => {
  const ctx = setup(
    '<table><tr><td><a href="../wp-content/uploads/2026/08/missing.jpg"><img src="../../wp-content/uploads/2026/08/a.pdf"></a></td></tr>' +
    '<tr><td><a href="../wp-content/uploads/2026/08/missing.jpg">caption text</a></td></tr></table>'
  );
  const ops = processMedia(ctx);
  assert.deepEqual(ops.remove, ['tr:has(> td > a[href="../wp-content/uploads/2026/08/missing.jpg"] > img)']);
  assert.deepEqual(ops.unwrap, ['a[href="../wp-content/uploads/2026/08/missing.jpg"]']);
  assert.ok(ctx.root.html().includes("caption text") && !ctx.root.html().includes("<a "));
});

test("a missing link wrapping an image, with no further ancestor to collapse, still targets the link itself", () => {
  const ctx = setup(
    '<p>keep me</p><a href="../wp-content/uploads/2026/08/missing.jpg"><img src="../../wp-content/uploads/2026/08/a.pdf"></a><p>and me</p>'
  );
  const ops = processMedia(ctx);
  assert.deepEqual(ops.remove, ['a:has(img)[href="../wp-content/uploads/2026/08/missing.jpg"]']);
  assert.equal(ctx.root.html(), "<p>keep me</p><p>and me</p>");
});

// A stray empty <a> pointing at the same missing file as a real, textful download link
// (seen in the source as leftover markup) must not have its removal selector also catch
// the real link when replayed against the old DOM.
test("an empty link is removed without matching a same-href link that has text", () => {
  const ctx = setup(
    '<p><a href="2011中国海外人才招聘大会.doc">name</a><a href="../wp-content/uploads/2011/09/missing.pdf"></a></p>' +
    '<p><a href="../wp-content/uploads/2011/09/missing.pdf">missing_Brochure</a></p>'
  );
  const ops = processMedia(ctx);
  assert.deepEqual(ops.remove, ['a:empty[href="../wp-content/uploads/2011/09/missing.pdf"]']);
  assert.deepEqual(ops.unwrap, ['a[href="../wp-content/uploads/2011/09/missing.pdf"]']);
  assert.equal(ctx.root.html(), '<p><a href="2011中国海外人才招聘大会.doc">name</a></p><p>missing_Brochure</p>');
});

test("the same upload referenced twice (embed + download link) is copied only once", () => {
  const ctx = setup(
    '<object data="../../../../wp-content/uploads/2026/08/a.pdf"></object>' +
    '<a href="../../../../wp-content/uploads/2026/08/a.pdf">Download</a>'
  );
  processMedia(ctx);
  assert.equal(ctx.root.html(), '<object data="a.pdf"></object><a href="a.pdf">Download</a>');
  assert.deepEqual(fs.readdirSync(ctx.dir).filter((f) => f.endsWith(".pdf")), ["a.pdf"]);
});

// An inline dead link whose text is its own URL/filename sits mid-sentence with sibling text
// on both sides in the SAME block — the neighbor-prev/next cue check never sees that (it only
// looks at sibling elements), so this must always be flagged regardless of cue-word matching.
test("an inline URL-text link removed from a sentence is always flagged for manual edit", () => {
  const before = report.length;
  const ctx = setup('<p>报名请访问 <a href="../wp-content/uploads/2020/01/missing.pdf">missing.pdf</a> 谢谢。</p>');
  processMedia(ctx);
  assert.equal(ctx.root.html(), "<p>报名请访问  谢谢。</p>");
  const added = report.slice(before);
  assert.ok(added.some((line) => line.includes("needs manual edit") && line.includes("报名请访问") && line.includes("谢谢")));
});

test("srcset variants are dropped, not left pointing at wp-content", () => {
  const ctx = setup('<img src="../../wp-content/uploads/2026/08/a.png" srcset="../../wp-content/uploads/2026/08/a-300x300.png 300w, ../../wp-content/uploads/2026/08/a.png 512w">');
  fs.writeFileSync(path.join(ctx.oldRoot, "wp-content/uploads/2026/08/a.png"), "img");
  processMedia(ctx);
  assert.equal(ctx.root.html(), '<img src="a.png">');
});

test("own page links become root-absolute", () => {
  const ctx = setup('<a href="../../../../2012/02/11/choir-championship-again/">x</a>');
  processMedia(ctx);
  assert.equal(ctx.root.html(), '<a href="/2012/02/11/choir-championship-again/">x</a>');
});
