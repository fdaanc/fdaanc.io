const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const pad = (n) => String(n).padStart(2, "0");

export const ymdPath = (d) => `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`;
export const longDate = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
export const stripTags = (s) => String(s).replace(/<[^>]*>/g, "");
export const year = () => new Date().getUTCFullYear();

const MORE = /<p>\s*<span id="more"><\/span>\s*<\/p>/;
export const hasMore = (html) => MORE.test(html);
export const beforeMore = (html) => html.split(MORE)[0];
export const url_encode_path = (u) => encodeURI(u);
export const absolutize = (html, base) =>
  html.replace(/\b(src|href|data)=(["'])(?![a-z][a-z0-9+.-]*:|\/|#)([^"']*)\2/gi, (_, a, q, v) => `${a}=${q}${base}${v}${q}`);
