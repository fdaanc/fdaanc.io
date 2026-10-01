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
}

// Applied to BOTH sides: third-party frames and PDF viewers render non-deterministically.
export const FREEZE_CSS = `iframe, object, embed { visibility: hidden !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;
