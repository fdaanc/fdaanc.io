export const stripMalware = (html) => html.replace(/<!--codes_iframe-->[\s\S]*?<!--\/codes_iframe-->/g, "");

const ren = (v) => v.replace(/(^|\s)wp-/g, "$1fd-");
export function renameWp($, root) {
  root.find("[class],[id],[aria-describedby]").each((_, el) => {
    for (const a of ["class", "id", "aria-describedby"]) if (el.attribs[a]) el.attribs[a] = ren(el.attribs[a]);
  });
}

export function markMore($, root) {
  root.find('span[id^="more-"]').attr("id", "more");
}

export const frontMatter = ({ title, date }) => `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n---\n`;

export function sameDayOrder(posts) {
  const byDay = new Map();
  for (const p of posts) byDay.set(p.date, [...(byDay.get(p.date) ?? []), p.path]);
  const out = new Map();
  for (const [day, paths] of byDay) {
    paths.forEach((p, i) => out.set(p, paths.length === 1 ? day : `${day}T${String(12 - i).padStart(2, "0")}:00:00Z`));
  }
  return out;
}
