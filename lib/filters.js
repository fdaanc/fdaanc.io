import fs from "node:fs";
import path from "node:path";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const pad = (n) => String(n).padStart(2, "0");

export const ymdPath = (d) => `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
export const longDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
export const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");
export const year = () => new Date().getUTCFullYear();

const MORE_SPAN = /<span id="more"><\/span>/;
// Find the <p> enclosing the more-marker span: usually it's alone in its own <p>,
// but the marker can also land inside a paragraph with other content
// (e.g. `<p><strong><span id="more"></span>More information:</strong></p>`).
const moreParagraphStart = (html) => {
  const spanIndex = html.search(MORE_SPAN);
  if (spanIndex === -1) return -1;
  const pStart = html.lastIndexOf("<p>", spanIndex);
  return pStart === -1 ? spanIndex : pStart;
};
export const hasMore = (html) => MORE_SPAN.test(html);
export const beforeMore = (html) => {
  const cut = moreParagraphStart(html);
  return cut === -1 ? html : html.slice(0, cut);
};
// The old site replaces the cut content with a "Continue Reading" link, re-wrapped in
// whatever tags were still open at the marker (e.g. a lone `<strong>` before the span).
export const moreLink = (html, url) => {
  const spanIndex = html.search(MORE_SPAN);
  if (spanIndex === -1) return "";
  const pStart = html.lastIndexOf("<p>", spanIndex);
  const prefix = pStart === -1 ? "" : html.slice(pStart + "<p>".length, spanIndex);
  const openTags = [...prefix.matchAll(/<([a-z]+)>/gi)].map((m) => m[1]);
  const closeTags = openTags.reverse().map((t) => `</${t}>`).join("");
  const link = `<a href="${url}#more" class="more-link">Continue Reading</a>`;
  return prefix.trim() ? `<p>${prefix} ${link}${closeTags}</p>` : `<p> ${link}</p>`;
};
export const url_encode_path = (u) => encodeURI(u);
export const absolutize = (html, base) =>
  html.replace(/\b(src|href|data)=(["'])(?![a-z][a-z0-9+.-]*:|\/|#)([^"']*)\2/gi, (_, a, q, v) => `${a}=${q}${base}${v}${q}`);
export const firstPdf = (inputPath) => fs.readdirSync(path.dirname(inputPath)).filter((f) => f.endsWith(".pdf")).sort()[0] ?? null;
