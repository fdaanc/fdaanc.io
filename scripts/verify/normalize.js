// Injected with page.evaluate(normalize, ops). Mirrors the sanctioned removals.
export function normalize(ops) {
  const hide = [
    "#primary-sidebar-categories-5", "#primary-sidebar-archives-3",   // R7 widgets
    ".post-footer .post-meta", "#post-author", ".slocum-credit",       // R7 meta, author, credit
    "#comments-container",                                              // R7 comments markup
    "#search-again", ".sitemap-pages", ".sitemap-monthly-archives", ".sitemap-categories", // 404 page
  ];
  hide.forEach((s) => document.querySelectorAll(s).forEach((el) => el.remove()));
  // Malware block renders nothing; it's already inert in a headless run.
  document.querySelectorAll("#slogan, .slogan").forEach((el) => {
    el.textContent = "Fudan Alumni Association of Northern California (FDAANC)";
  });
  // Removing/unwrapping a node leaves its parent with adjacent split text nodes (the text
  // either side of where the node was). Chromium shapes and kerns a text run differently
  // across a text-node boundary than within one merged node, while the migrated side is a
  // single serialized text node — so parent.normalize() after each DOM change keeps the two
  // sides' text runs comparable.
  for (const s of ops.remove ?? []) document.querySelectorAll(s).forEach((el) => { const p = el.parentNode; el.remove(); p?.normalize(); });
  for (const s of ops.unwrap ?? []) document.querySelectorAll(s).forEach((el) => { const p = el.parentNode; el.replaceWith(...el.childNodes); p?.normalize(); });
  document.querySelectorAll("img.wp-smiley, img.emoji").forEach((img) => { const p = img.parentNode; img.replaceWith(img.alt); p?.normalize(); });
  document.querySelectorAll("embed[type='application/x-shockwave-flash']").forEach((el) => { const p = el.parentNode; el.remove(); p?.normalize(); });

  // Content edits (scripts/migrate/edits.mjs) are hand-fixes baked into the migrated site's
  // build; apply the same find/replace to the equivalent old-side container (post page:
  // "article.content"; list block: the isolated section) so the comparison expects the
  // edited text instead of flagging it as a diff. Runs after the remove/unwrap above, which
  // already strips the dead links the edits' orphaned text used to sit next to.
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const editResults = [];
  for (const { find, replace } of ops.edits ?? []) {
    // Match whitespace-tolerantly: removing the old side's dead-link elements merges the text
    // nodes either side of them (normalize() above), which can leave an extra/missing space at
    // the join that migrate.mjs's own (cheerio-based) removal didn't produce -- a run of
    // whitespace in `find` should still match a differently-sized run of whitespace here.
    const pattern = new RegExp(escapeRegExp(find).replace(/\s+/g, "\\s+"), "g");
    const roots = ops.editSelector ? document.querySelectorAll(ops.editSelector) : [document.body];
    let status = "absent"; // find text isn't in this container at all -- not relevant to this job
    for (const root of roots) {
      const html = root.innerHTML;
      const count = (html.match(pattern) ?? []).length;
      if (count === 1) { root.innerHTML = html.replace(pattern, replace); status = "applied"; break; }
      if (count > 1) { status = "ambiguous"; break; } // can't tell which occurrence is meant
      // Exact markup didn't match once -- if the plain text is present anyway, old-side
      // serialization differs enough that we can't safely apply this edit automatically.
      if (root.textContent.includes(find.replace(/<[^>]+>/g, ""))) status = "unverifiable";
    }
    editResults.push({ find, status });
  }
  return editResults;
}

// Applied to BOTH sides: third-party frames and PDF viewers render non-deterministically.
export const FREEZE_CSS = `iframe, object, embed { visibility: hidden !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;
