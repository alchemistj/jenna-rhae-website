#!/usr/bin/env python3
"""Extract jennarhae.com (WordPress + Thrive) pages into src/data/wp/*.json.

Usage:
  python3 -I scripts/wp-extract/extract.py <raw_html_dir> <repo_root>

<raw_html_dir> holds <slug>.html files (see fetch.sh) plus posts.json (WP REST
posts, used only for the 7th post's excerpt and to cross-check dates).

Inline text format in JSON: simple inline markdown
  **bold**, *italic*, [text](href), and "\n" for an in-paragraph <br>.
Internal links are rewritten (host dropped, two slugs remapped).
"""
import json
import os
import re
import subprocess
import sys
from urllib.parse import urlparse

from bs4 import BeautifulSoup, NavigableString, Tag

RAW = sys.argv[1]
ROOT = sys.argv[2]
DATA_DIR = os.path.join(ROOT, "src", "data", "wp")
IMG_DIR = os.path.join(ROOT, "src", "assets", "wp")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)

HOSTS = {"jennarhae.com", "www.jennarhae.com"}
REMAP = {
    "/trauma-coaching/": "/trauma-recovery-coaching/",
    "/life-coach-columbia-mo/": "/christian-life-coach-kansas-city-mo/",
}
PAGES = ["about", "free-trauma-test", "tenacious-grace", "blog"]
POSTS = [
    "what-does-a-trauma-coach-do",
    "what-causes-complex-trauma",
    "the-gift-hidden-in-the-ask",
    "is-grief-trauma",
    "what-to-do-after-trauma",
    "trauma-nightmares",
    "how-to-trust-after-trauma",
]
FILENAME_FIX = {"jenna-barbossa-author": "jenna-barbosa-author"}

skipped_log = []   # (slug, what)
image_jobs = {}    # local filename -> remote url
link_log = []      # (slug, original, rewritten)


def rewrite_href(href, slug=None):
    if not href:
        return href
    orig = href
    p = urlparse(href)
    if p.scheme in ("http", "https") and p.netloc.lower() in HOSTS:
        path = p.path or "/"
        path = REMAP.get(path, path)
        if path.rstrip("/") + "/" in REMAP and not path.endswith("/"):
            path = REMAP[path + "/"]
        out = path
        if p.query:
            out += "?" + p.query
        if p.fragment:
            out += "#" + p.fragment
        href = out
    if href != orig and slug:
        link_log.append((slug, orig, href))
    return href


def ws(s):
    return re.sub(r"[ \t\r\n ]+", " ", s)


def inline(node, slug):
    """Convert inline children of node to simple markdown."""
    out = []
    for ch in node.children:
        if isinstance(ch, NavigableString):
            if ch.__class__.__name__ in ("Comment",):
                continue
            out.append(ws(str(ch)))
        elif isinstance(ch, Tag):
            n = ch.name
            if n == "br":
                out.append("\n")
            elif n in ("strong", "b"):
                out.append(wrap("**", inline(ch, slug)))
            elif n in ("em", "i"):
                out.append(wrap("*", inline(ch, slug)))
            elif n == "a":
                t = inline(ch, slug)
                href = rewrite_href(ch.get("href", ""), slug)
                if t.strip():
                    lead = t[: len(t) - len(t.lstrip())]
                    trail = t[len(t.rstrip()):]
                    out.append(f"{lead}[{t.strip()}]({href}){trail}")
                else:
                    out.append(t)
            elif n in ("script", "style", "svg", "grammarly-extension"):
                continue
            else:
                out.append(inline(ch, slug))
    return "".join(out)


def wrap(mark, inner):
    if not inner.strip():
        return inner
    lead = inner[: len(inner) - len(inner.lstrip())]
    trail = inner[len(inner.rstrip()):]
    return f"{lead}{mark}{inner.strip()}{mark}{trail}"


def clean_inline(s):
    s = s.replace("****", "").replace("**​**", "")
    s = re.sub(r"[ ]*\n[ ]*", "\n", s)
    s = re.sub(r" {2,}", " ", s)
    s = s.strip(" \n")
    return s


def local_name(src):
    base = os.path.basename(urlparse(src).path)
    stem, ext = os.path.splitext(base)
    stem = stem.lower()
    stem = FILENAME_FIX.get(stem, stem)
    return stem + ext.lower()


def full_size(src):
    """Strip WordPress -WxH thumbnail suffix."""
    return re.sub(r"-\d+x\d+(?=\.[A-Za-z0-9]+$)", "", src)


def image_block(img, slug, **extra):
    src = img.get("src") or img.get("data-src")
    full = full_size(src)
    name = local_name(full)
    image_jobs[name] = full
    w = img.get("data-init-width") or img.get("width")
    h = img.get("data-init-height") or img.get("height")
    blk = {
        "type": "image",
        "src": f"src/assets/wp/{name}",
        "alt": img.get("alt", ""),
    }
    if img.get("title"):
        blk["title"] = img.get("title")
    if w and h and str(w).isdigit() and str(h).isdigit():
        blk["width"], blk["height"] = int(w), int(h)
    blk["originalUrl"] = full
    blk.update(extra)
    if not blk["alt"]:
        skipped_log.append((slug, f"MISSING ALT on image {name}"))
    return blk


def embed_kind(src):
    if "leadconnectorhq.com/widget/quiz" in src:
        return "quiz"
    if "springboardcrm.com/widget/booking" in src or "/widget/booking" in src:
        return "booking"
    return "other"


def is_hidden(el):
    cls = " ".join(el.get("class") or [])
    st = (el.get("style") or "").replace(" ", "")
    return "tcb-permanently-hidden" in cls or "display:none" in st


def walk(el, slug, out):
    for ch in el.children:
        if not isinstance(ch, Tag):
            continue
        n = ch.name
        if is_hidden(ch):
            skipped_log.append((slug, f"hidden element <{n}> {' '.join(ch.get('class') or [])[:60]}"))
            continue
        if n in ("script", "style", "svg", "grammarly-extension", "code"):
            continue
        if n == "h1":
            continue  # captured separately as page h1
        if n in ("h2", "h3", "h4"):
            t = clean_inline(inline(ch, slug))
            if t:
                out.append({"type": n, "text": t})
            continue
        if n == "p":
            t = clean_inline(inline(ch, slug))
            if t:
                out.append({"type": "p", "text": t})
            continue
        if n in ("ul", "ol"):
            items = []
            for li in ch.find_all("li", recursive=False):
                t = clean_inline(inline(li, slug))
                if t:
                    items.append(t)
            if items:
                out.append({"type": n, "items": items})
            continue
        if n == "blockquote":
            t = clean_inline(inline(ch, slug))
            if t:
                out.append({"type": "quote", "text": t})
            continue
        if n == "img":
            if "flower-icon" in (ch.get("src") or ""):
                out.append(image_block(ch, slug, decorative=True))
            else:
                out.append(image_block(ch, slug))
            continue
        if n == "iframe":
            src = ch.get("src", "")
            out.append({"type": "embed", "kind": embed_kind(src), "src": src,
                        "title": ch.get("title", "")})
            continue
        cls = ch.get("class") or []
        if "thrv-button" in cls or "thrv_button_shortcode" in cls:
            a = ch.find("a")
            if a:
                txt = clean_inline(inline(a, slug))
                href = rewrite_href(a.get("href", ""), slug)
                blk = {"type": "cta", "text": txt, "href": href}
                if a.get("target") == "_blank":
                    blk["newTab"] = True
                out.append(blk)
            continue
        if "thrive_prev_next" in cls:
            skipped_log.append((slug, "prev/next post navigation"))
            continue
        walk(ch, slug, out)


def get_meta(soup, **attrs):
    t = soup.find("meta", attrs=attrs)
    return t.get("content") if t else None


def head_info(soup):
    title = soup.title.get_text().strip() if soup.title else None
    d = {
        "title": ws(title) if title else None,
        "metaDescription": get_meta(soup, name="description"),
        "canonical": (soup.find("link", rel="canonical") or {}).get("href") if soup.find("link", rel="canonical") else None,
        "ogTitle": get_meta(soup, property="og:title"),
        "ogDescription": get_meta(soup, property="og:description"),
    }
    d["published"] = get_meta(soup, property="article:published_time")
    d["modified"] = get_meta(soup, property="article:modified_time")
    d["yoastAuthor"] = get_meta(soup, name="twitter:data1")
    d["readingTime"] = get_meta(soup, name="twitter:data2")
    return d


def schema_types(soup):
    types = set()
    for s in soup.find_all("script", class_="yoast-schema-graph"):
        try:
            g = json.loads(s.string)
        except Exception:
            continue
        for node in g.get("@graph", []):
            t = node.get("@type")
            types.update(t if isinstance(t, list) else [t])
    return sorted(x for x in types if x)


def build_page(slug, kind):
    html = open(os.path.join(RAW, slug + ".html"), encoding="utf-8").read()
    soup = BeautifulSoup(html, "lxml")
    info = head_info(soup)
    ed = soup.select_one("#tve_editor")
    h1 = None
    if kind == "post":
        h1tag = soup.find("h1")
    else:
        h1tag = ed.find("h1")
    h1 = clean_inline(inline(h1tag, slug)) if h1tag else None

    d = {
        "slug": slug,
        "url": f"/{slug}/",
        "liveUrl": f"https://jennarhae.com/{slug}/",
        "type": kind,
        "title": info["title"],
        "metaDescription": info["metaDescription"],
        "h1": h1,
    }
    if kind == "post":
        d["publishedDate"] = info["published"]
        d["modifiedDate"] = info["modified"]
    else:
        d["modifiedDate"] = info["modified"]
    d["schemaTypes"] = schema_types(soup)

    if kind == "post":
        feat = soup.select_one("img.wp-post-image")
        d["featuredImage"] = image_block(feat, slug)
        box = soup.select_one(".feat-jenna")
        aimg = box.select_one(".tve_image_caption img")
        ap = box.select_one(".thrv_text_element p")
        d["author"] = {
            "name": info["yoastAuthor"],
            "bio": clean_inline(inline(ap, slug)),
            "image": image_block(aimg, slug),
        }
        d["readingTime"] = info["readingTime"]
    else:
        d["featuredImage"] = None
        d["author"] = None

    sections = []
    walk(ed, slug, sections)
    d["sections"] = sections
    d["faq"] = []
    return d, soup


def build_blog(rest_posts):
    slug = "blog"
    d, soup = build_page(slug, "page")
    cards = []
    arts = soup.select("article.post")
    listed = set()
    meta = {}
    for s in POSTS:
        pd, _ = POST_DATA[s]
        meta[s] = pd
    for a in arts:
        link = a.find("a", href=True)["href"]
        pslug = urlparse(link).path.strip("/")
        listed.add(pslug)
        date_txt = ws(a.select_one("[data-shortcode=tcb_post_published_date]").get_text()).strip()
        title = ws(a.select_one("h2").get_text()).strip()
        sec = a.select_one("section.tcb-post-content")
        exc = clean_inline(inline(sec.find("p"), slug))
        more = a.select_one("a.more-link")
        btn = a.select_one(".tcb-post-read-more-link .tcb-button-text")
        cards.append({"slug": pslug, "listingDate": date_txt, "title": title,
                      "excerptListing": exc, "readMoreLabel": ws(btn.get_text()).strip() if btn else None})
    byslug = {c["slug"]: c for c in cards}
    posts = []
    for s in sorted(POSTS, key=lambda x: meta[x]["publishedDate"], reverse=True):
        pd = meta[s]
        rp = rest_posts[s]
        excerpt_full = BeautifulSoup(rp["excerpt"]["rendered"], "lxml").get_text()
        excerpt_full = ws(excerpt_full).strip()
        c = byslug.get(s)
        posts.append({
            "slug": s,
            "url": f"/{s}/",
            "title": pd["h1"],
            "yoastTitle": pd["title"],
            "publishedDate": pd["publishedDate"],
            "modifiedDate": pd["modifiedDate"],
            "listingDate": c["listingDate"] if c else None,
            "excerptListing": c["excerptListing"] if c else None,
            "excerpt": excerpt_full,
            "readMoreLabel": c["readMoreLabel"] if c else "READ MORE",
            "featuredImage": pd["featuredImage"],
            "onLiveListing": c is not None,
        })
    d["posts"] = posts
    d["listingNote"] = ("Live /blog/ shows 6 of 7 posts: Thrive pagination is permanently hidden, so "
                        "the oldest post (what-does-a-trauma-coach-do) is not reachable from the listing. "
                        "'excerptListing' is the truncated text the live cards show; 'excerpt' is the WP excerpt.")
    # drop the thrive post-list from sections (none emitted) - sections hold only heading ornament
    return d


def write(slug, d):
    with open(os.path.join(DATA_DIR, slug + ".json"), "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write("\n")


POST_DATA = {}

if __name__ == "__main__":
    rest = {p["slug"]: p for p in json.load(open(os.path.join(RAW, "posts.json"), encoding="utf-8"))}
    for s in POSTS:
        POST_DATA[s] = build_page(s, "post")
        write(s, POST_DATA[s][0])
    for s in PAGES:
        if s == "blog":
            write(s, build_blog(rest))
        else:
            d, _ = build_page(s, "page")
            write(s, d)

    # sanity: REST dates vs Yoast
    for s in POSTS:
        pd = POST_DATA[s][0]
        print("date", s, pd["publishedDate"], rest[s]["date"], pd["modifiedDate"], rest[s]["modified"])

    # downloads
    for name, url in sorted(image_jobs.items()):
        dest = os.path.join(IMG_DIR, name)
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            continue
        r = subprocess.run(["curl", "-sS", "-L", "-f", "-o", dest, url])
        if r.returncode != 0:
            # fallback: thumbnail-suffixed original was not the real name; report
            print("DOWNLOAD FAILED", url)
            if os.path.exists(dest):
                os.remove(dest)
        else:
            print("downloaded", name, os.path.getsize(dest))

    print("--- skipped/flags")
    for x in sorted(set(skipped_log)):
        print(x)
    print("--- rewritten links")
    for x in sorted(set(link_log)):
        print(x)
