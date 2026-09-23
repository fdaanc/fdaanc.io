"""Check the static site against the WordPress original.

Usage: python3 tools/verify.py <site_dir> <mirror_dir> [--check-live]

  1. links     every same-site href/src/data/srcset/option value resolves to a
               file; any that does not must also be broken on the live site
               (--check-live asks the live site to prove that)
  2. sitemap   every URL listed in the WordPress sitemaps exists
  3. leftovers no link still points at WordPress-only URLs (?paged=, ?p=,
               absolute fdaanc.org) outside the documented exceptions
  4. text      each page's title and visible text equal the crawled original
Exit status is non-zero when any check fails.
"""

import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

sys.path.insert(0, str(Path(__file__).parent))
from build import out_rel  # noqa: E402

HOST = "http://site.test/"
URL_ATTRS = {"href", "src", "data", "action", "poster"}
ALLOWED_ABSOLUTE = re.compile(r"rel=[\"']canonical|msapplication-TileImage|/wp-login\.php")


class Collect(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls, self.text, self.title = [], [], []
        self._skip = 0
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k, v in attrs:
            if v and (k in URL_ATTRS or (k == "value" and tag == "option")):
                self.urls.append(v)
            if v and k == "srcset":
                self.urls += [c.strip().split()[0] for c in v.split(",") if c.strip()]
        if tag in ("script", "style"):
            self._skip += 1
        if tag == "title":
            self._in_title = True
        if tag == "link" and a.get("rel") in ("canonical",):
            self.urls.pop()  # canonical is a declaration, not a navigable link

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip -= 1
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title.append(data)
        elif not self._skip:
            self.text.append(data)


def parse(path: Path) -> Collect:
    c = Collect()
    c.feed(path.read_text(encoding="utf-8"))
    return c


def page_url(site: Path, f: Path) -> str:
    rel = f.relative_to(site).as_posix()
    return HOST + (rel[: -len("index.html")] if rel.endswith("index.html") else rel)


def resolves(site: Path, url: str) -> bool:
    path = unquote(urlsplit(url).path).lstrip("/")
    target = site / path
    if path == "" or path.endswith("/"):
        target = target / "index.html"
    elif target.is_dir():
        target = target / "index.html"
    return target.is_file()


def live_status(path_and_query: str) -> int:
    req = urllib.request.Request("https://www.fdaanc.org" + quote(path_and_query, safe="/?=&%#:;"), method="GET",
                                 headers={"User-Agent": "Mozilla/5.0"})
    try:
        return urllib.request.urlopen(req, timeout=30).status
    except urllib.error.HTTPError as e:
        return e.code


def main() -> int:
    site, mirror = Path(sys.argv[1]), Path(sys.argv[2])
    check_live = "--check-live" in sys.argv
    failures = 0
    pages = sorted(p for p in site.rglob("*.html") if "tools" not in p.parts and p.name != "404.html")

    # 1. links
    broken: dict[str, set[str]] = {}
    for f in pages:
        base = page_url(site, f)
        for u in parse(f).urls:
            absu = urljoin(base, u)
            if not absu.startswith(HOST) or urlsplit(absu).path.startswith("/wp-login"):
                continue
            if not resolves(site, absu):
                broken.setdefault(absu[len(HOST) - 1:], set()).add(f.relative_to(site).as_posix())
    print(f"[links] {len(pages)} pages scanned, {len(broken)} unresolved targets")
    for target, where in sorted(broken.items()):
        status = live_status(target) if check_live else None
        ok = status == 404 if check_live else None
        tag = {True: "also 404 on live site", False: f"LIVE SITE RETURNS {status}", None: "unchecked"}[ok]
        print(f"   {target}  <- {len(where)} page(s)  [{tag}]")
        if ok is False:
            failures += 1

    # 2. sitemap coverage
    locs = []
    for sm in site.glob("wp-sitemap-*.xml"):
        locs += re.findall(r"<loc>https://www\.fdaanc\.org(/[^<]*)</loc>", sm.read_text(encoding="utf-8"))
    missing = [loc for loc in locs if not resolves(site, HOST + loc.lstrip("/"))]
    print(f"[sitemap] {len(locs)} URLs, {len(missing)} missing")
    failures += len(missing)
    for loc in missing:
        print("   MISSING", loc)

    # 3. leftovers
    left = 0
    for f in pages + [site / "404.html"]:
        for tag in re.findall(r"<[a-zA-Z][^>]*>", f.read_text(encoding="utf-8")):
            bad = re.search(r"(?:https?:)?//(?:www\.)?fdaanc\.org", tag) and not ALLOWED_ABSOLUTE.search(tag)
            bad = bad or re.search(r"(?:href|src|value)=[\"'][^\"']*\?(?:paged|p)=", tag)
            if bad:
                left += 1
                print("   LEFTOVER", f.relative_to(site), tag[:140])
    print(f"[leftovers] {left} tags still pointing at WordPress-only URLs")
    failures += left

    # 4. text parity against the crawl
    sources = {}
    for src in mirror.rglob("*"):
        if src.is_file():
            dest = out_rel(src.relative_to(mirror).as_posix())
            if dest and dest.endswith(".html"):
                sources[dest] = src
    norm = lambda parts: re.sub(r"\s+", " ", "".join(parts)).strip()  # noqa: E731
    diff = 0
    for f in pages:
        rel = f.relative_to(site).as_posix()
        if rel not in sources:
            print("   NO SOURCE", rel)
            diff += 1
            continue
        a, b = parse(sources[rel]), parse(f)
        if norm(a.title) != norm(b.title) or norm(a.text) != norm(b.text):
            diff += 1
            print("   TEXT DIFFERS", rel)
    print(f"[text] {len(pages)} pages compared, {diff} differ")
    failures += diff

    print("FAIL" if failures else "PASS", f"({failures} failures)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
