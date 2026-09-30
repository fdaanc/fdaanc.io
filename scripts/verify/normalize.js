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
  for (const s of ops.remove ?? []) document.querySelectorAll(s).forEach((el) => el.remove());
  for (const s of ops.unwrap ?? []) document.querySelectorAll(s).forEach((el) => el.replaceWith(...el.childNodes));
  document.querySelectorAll("img.wp-smiley, img.emoji").forEach((img) => img.replaceWith(img.alt));
  document.querySelectorAll("embed[type='application/x-shockwave-flash']").forEach((el) => el.remove());
}

// Applied to BOTH sides: third-party frames and PDF viewers render non-deterministically.
export const FREEZE_CSS = `iframe, object, embed { visibility: hidden !important; }
*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`;
