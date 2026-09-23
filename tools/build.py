"""Turn a wget mirror of the WordPress site into a static site for GitHub Pages.

Usage: python3 tools/build.py <mirror_dir> <wp_ids.json> <404.html> <out_dir>

What it does, and nothing more:
  * copies every crawled file, stripping cache-busting queries from asset
    filenames (style.css?ver=2.4.3 -> style.css; the HTML keeps the query,
    which a static host ignores);
  * turns WordPress query pagination (index.html?paged=N) into page/N/index.html;
  * drops the ?p=ID shortlink copies (duplicates of the permalink pages);
  * rewrites every link to this site inside tag attributes into a path relative
    to the page, so the output works both at a custom domain root and under the
    fdaanc.github.io/fdaanc.io/ project path. Text content is never touched;
  * removes head <link>s that point at WordPress machinery a static host cannot
    serve (REST API, XML-RPC, feeds, oEmbed, shortlink);
  * adds a small script that forwards old query-style URLs (?paged=, ?p=, ?cat=,
    ...) to their static equivalents.
"""

import json
import posixpath
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

SITE_RE = re.compile(r"(?:https?:)?//(?:www\.)?fdaanc\.org(?![\w.-])(/[^\s\"'<>]*)?", re.I)
# Absolute URLs that must stay absolute: the canonical domain declaration, the
# Windows tile image (meta content wants a full URL), and the WordPress login
# link, which has no static counterpart.
KEEP_ABSOLUTE_TAG = re.compile(r"<link[^>]+rel=[\"']canonical[\"']|<meta[^>]+msapplication-TileImage", re.I)
KEEP_ABSOLUTE_PATH = re.compile(r"^/wp-(login|admin)")
DROP_HEAD_TAG = re.compile(
    r"[ \t]*<link[^>]*(?:"
    r"rel=[\"']dns-prefetch[\"'][^>]*href=[\"']//www\.fdaanc\.org[\"']"
    r"|type=[\"']application/rss\+xml[\"']"
    r"|rel=[\"']https://api\.w\.org/[\"']"
    r"|type=[\"']application/json[\"'][^>]*wp-json"
    r"|rel=[\"']EditURI[\"']"
    r"|rel=[\"']wlwmanifest[\"']"
    r"|rel=[\"']shortlink[\"']"
    r"|oembed"
    r")[^>]*>\n?",
    re.I,
)
TAG_RE = re.compile(r"<[a-zA-Z][^>]*>")
PAGED_RE = re.compile(r"^(.*)index\.html\?paged=(\d+)$")
SHORTLINK_RE = re.compile(r"^index\.html\?p=\d+$")


def out_rel(src_rel: str) -> str | None:
    """Map a wget-saved path to its path in the static site (None = drop)."""
    if SHORTLINK_RE.match(src_rel) or src_rel == "wp-includes/wlwmanifest.xml":
        return None
    if m := PAGED_RE.match(src_rel):
        return f"{m.group(1)}page/{m.group(2)}/index.html"
    return src_rel.split("?", 1)[0]


def build_id_map(ids: dict) -> dict[str, dict[str, str]]:
    """{query key: {id: site path}} for forwarding old ?p=ID style URLs."""
    return {
        key: {i: urlsplit(link).path for i, link in table.items()}
        for key, table in ids.items()
    }


def target_path(url_path: str, query: str, id_map) -> tuple[str, str]:
    """Resolve a site URL's path + query to a static path + leftover query."""
    params = dict(p.split("=", 1) for p in re.split(r"&(?:#038;|amp;)?", query) if "=" in p)
    if "paged" in params:
        base = url_path if url_path.endswith("/") else url_path + "/"
        return f"{base}page/{params['paged']}/", ""
    for key in ("p", "page_id", "attachment_id", "cat", "tag_id", "author"):
        if key in params and url_path in ("", "/"):
            lookup = id_map.get("p" if key == "page_id" else key, {})
            if params[key] in lookup:
                return lookup[params[key]], ""
    if "m" in params and url_path in ("", "/") and re.fullmatch(r"\d{6}", params["m"]):
        return f"/{params['m'][:4]}/{params['m'][4:]}/", ""
    return url_path or "/", query


def relativize(match: re.Match, depth: int, id_map, escaped: bool = False) -> str:
    raw = match.group(0)
    rest = match.group(1) or "/"
    if escaped:
        rest = rest.replace("\\/", "/")
    path, _, frag = rest.partition("#")
    path, _, query = path.partition("?")
    if KEEP_ABSOLUTE_PATH.match(path):
        return raw
    path, query = target_path(path, query, id_map)
    rel = "../" * depth + path.lstrip("/")
    rel = rel or "./"
    out = rel + (f"?{query}" if query else "") + (f"#{frag}" if frag else "")
    return out.replace("/", "\\/") if escaped else out


def rewrite_html(text: str, depth: int, id_map) -> str:
    text = DROP_HEAD_TAG.sub("", text)

    def fix_tag(m: re.Match) -> str:
        tag = m.group(0)
        if KEEP_ABSOLUTE_TAG.search(tag):
            return tag
        return SITE_RE.sub(lambda u: relativize(u, depth, id_map), tag)

    text = TAG_RE.sub(fix_tag, text)
    # The emoji loader carries its script URL JSON-escaped inside inline JS.
    text = re.sub(
        r"https?:\\/\\/(?:www\.)?fdaanc\.org((?:\\/[^\"\s]*)?)",
        lambda u: relativize(u, depth, id_map, escaped=True),
        text,
    )
    return text


def legacy_redirect_script(id_map, with_ids: bool) -> str:
    """Inline script: forward old query-string URLs to their static pages."""
    ids = {}
    if with_ids:
        ids = {k: v for k, v in id_map.items()}
    js = (
        "(function(l){var q={};l.search.replace(/[?&]([^=&]+)=([^&]*)/g,function(_,k,v){q[k]=v;});"
        "var base=l.pathname.replace(/[^/]*$/,'');"
        "if(q.paged){l.replace(base+'page/'+q.paged+'/'+l.hash);return;}"
        f"var ids={json.dumps(ids, separators=(',', ':'), ensure_ascii=False)};"
        "var keys=['p','page_id','attachment_id','cat','tag_id','author'];"
        "for(var i=0;i<keys.length;i++){var k=keys[i],t=ids[k==='page_id'?'p':k];"
        "if(q[k]&&t&&t[q[k]]){l.replace(base+t[q[k]].replace(/^\\//,'')+l.hash);return;}}"
        "if(q.m&&/^\\d{6}$/.test(q.m)){l.replace(base+q.m.slice(0,4)+'/'+q.m.slice(4)+'/');}"
        "})(location);"
    )
    return f"<script>{js}</script>\n"


def insert_after_head(text: str, snippet: str) -> str:
    """Insert right after <meta charset> (which must stay in the first 1024 bytes)."""
    return re.sub(r"(<meta charset=[^>]*>\n?)", lambda m: m.group(1) + snippet, text, count=1)


def build_404(raw: str, id_map) -> str:
    """404.html is served at any depth, so resolve links from a runtime <base>."""
    text = rewrite_html(raw, 0, id_map)
    base = (
        "<script>document.write('<base href=\"'+"
        "(location.pathname.indexOf('/fdaanc.io/')===0?'/fdaanc.io/':'/')+'\">');</script>\n"
    )
    return insert_after_head(text, base)


def main() -> None:
    mirror, ids_file, raw_404, out = (Path(a) for a in sys.argv[1:5])
    id_map = build_id_map(json.loads(ids_file.read_text()))
    sources = sorted(p for p in mirror.rglob("*") if p.is_file())
    planned = {}
    for src in sources:
        dest = out_rel(src.relative_to(mirror).as_posix())
        if dest is not None:
            planned[dest] = src
    paginated_dirs = {posixpath.dirname(posixpath.dirname(posixpath.dirname(d))) for d in planned if "/page/" in "/" + d}
    for dest, src in planned.items():
        target = out / dest
        target.parent.mkdir(parents=True, exist_ok=True)
        if not dest.endswith(".html"):
            shutil.copyfile(src, target)
            continue
        depth = dest.count("/")
        text = rewrite_html(src.read_text(encoding="utf-8"), depth, id_map)
        page_dir = posixpath.dirname(dest)
        if page_dir in paginated_dirs or page_dir == "":
            text = insert_after_head(text, legacy_redirect_script(id_map, with_ids=page_dir == ""))
        with open(target, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    with open(out / "404.html", "w", encoding="utf-8", newline="") as f:
        f.write(build_404(raw_404.read_text(encoding="utf-8"), id_map))
    (out / ".nojekyll").write_text("")
    print(f"built {len(planned) + 1} files into {out}")


if __name__ == "__main__":
    main()
