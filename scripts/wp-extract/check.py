#!/usr/bin/env python3
"""Verify src/data/wp/*.json against the LIVE WordPress pages.

Usage: python3 -I scripts/wp-extract/check.py <repo_root> [raw_html_dir]

Without raw_html_dir the live pages are fetched with curl. Checks:
  1. every <p>/<li>/<h2-h4>/<blockquote> of the live main content (#tve_editor,
     minus hidden Thrive elements) appears in the page JSON (markdown stripped);
  2. blog.json lists every post, with its listing excerpt;
  3. every image path in every JSON exists on disk and is a real image;
  4. no JSON holds an http(s) image URL, no jennarhae.com host in hrefs,
     no /trauma-coaching/ or /life-coach-columbia-mo/ hrefs;
  5. embeds (quiz) are present where the live page has an iframe;
  6. metadata fields (title, metaDescription, dates) are present.
Exit code 1 on any failure.
"""
import glob
import json
import os
import re
import subprocess
import sys

from bs4 import BeautifulSoup

ROOT = sys.argv[1]
RAW = sys.argv[2] if len(sys.argv) > 2 else None
DATA = os.path.join(ROOT, "src", "data", "wp")
PAGES = ["about", "free-trauma-test", "tenacious-grace", "blog"]
POSTS = ["what-does-a-trauma-coach-do", "what-causes-complex-trauma", "the-gift-hidden-in-the-ask",
         "is-grief-trauma", "what-to-do-after-trauma", "trauma-nightmares", "how-to-trust-after-trauma"]
errors = []
checked = 0


def err(msg):
    errors.append(msg)
    print("FAIL", msg)


def norm(s):
    s = s.replace("​", "").replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def strip_md(s):
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)  # links -> text
    s = s.replace("**", "")
    s = re.sub(r"(?<!\w)\*(?=\S)|(?<=\S)\*(?!\w)", "", s)
    return norm(s)


def live_html(slug):
    if RAW:
        return open(os.path.join(RAW, slug + ".html"), encoding="utf-8").read()
    r = subprocess.run(["curl", "-sS", "-L", f"https://jennarhae.com/{slug}/"], capture_output=True)
    return r.stdout.decode("utf-8")


def corpus(d):
    """All text in a page JSON, markdown stripped, as one normalised string."""
    parts = [strip_md(d.get("h1") or "")]

    def rec(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("text", "bio", "excerptListing", "excerpt", "title", "yoastTitle") and isinstance(v, str):
                    parts.append(strip_md(v))
                else:
                    rec(v)
        elif isinstance(o, list):
            for x in o:
                if isinstance(x, str):
                    parts.append(strip_md(x))
                else:
                    rec(x)
    rec(d)
    return norm(" ".join(parts))


def hidden(el):
    for a in [el] + list(el.parents):
        if not getattr(a, "get", None):
            continue
        cls = " ".join(a.get("class") or [])
        st = (a.get("style") or "").replace(" ", "")
        if "tcb-permanently-hidden" in cls or "display:none" in st:
            return True
    return False


def walk_images(o, out):
    if isinstance(o, dict):
        if o.get("type") == "image" or ("src" in o and "alt" in o):
            out.append(o)
        for v in o.values():
            walk_images(v, out)
    elif isinstance(o, list):
        for x in o:
            walk_images(x, out)


def all_strings(o):
    if isinstance(o, dict):
        for v in o.values():
            yield from all_strings(v)
    elif isinstance(o, list):
        for x in o:
            yield from all_strings(x)
    elif isinstance(o, str):
        yield o


for slug in PAGES + POSTS:
    path = os.path.join(DATA, slug + ".json")
    if not os.path.exists(path):
        err(f"{slug}: JSON missing")
        continue
    d = json.load(open(path, encoding="utf-8"))
    for k in ("slug", "url", "title", "metaDescription", "sections"):
        if not d.get(k):
            err(f"{slug}: missing field {k}")
    if slug in POSTS:
        for k in ("h1", "publishedDate", "modifiedDate", "author", "featuredImage"):
            if not d.get(k):
                err(f"{slug}: missing field {k}")
    if slug != "free-trauma-test" and not d.get("h1"):
        err(f"{slug}: missing h1")

    soup = BeautifulSoup(live_html(slug), "lxml")
    ed = soup.select_one("#tve_editor")
    if ed is None:
        err(f"{slug}: no #tve_editor in live page")
        continue
    text = corpus(d)
    n = 0
    for el in ed.find_all(["p", "li", "h1", "h2", "h3", "h4", "blockquote"]):
        if hidden(el):
            continue
        # skip containers nested in another checked element (e.g. p inside li)
        if el.name in ("p",) and el.find_parent(["li", "blockquote"]):
            continue
        for br in el.find_all("br"):
            br.replace_with(" ")
        t = norm(el.get_text("", strip=False))
        t = re.sub(r"\s+([,.;:!?)])", r"\1", t)
        if not t:
            continue
        # blog: the live listing is a dynamic post list, checked separately below
        if slug == "blog" and el.find_parent("article"):
            continue
        n += 1
        tt = re.sub(r"\s+([,.;:!?)])", r"\1", text)
        if t not in tt and t not in text:
            err(f"{slug}: live text not in JSON: {t[:100]!r}")
    checked += n

    # embeds
    live_iframes = [i.get("src") for i in ed.find_all("iframe") if not hidden(i)]
    json_embeds = [s.get("src") for s in d["sections"] if s.get("type") == "embed"]
    for src in live_iframes:
        if src not in json_embeds:
            err(f"{slug}: live iframe {src} missing from sections")

    # blog listing
    if slug == "blog":
        have = {p["slug"] for p in d.get("posts", [])}
        for p in POSTS:
            if p not in have:
                err(f"blog: post {p} missing from posts[]")
        for art in soup.select("article.post"):
            sec = art.select_one("section.tcb-post-content")
            ex = norm(sec.get_text("")) if sec else ""
            ex = re.sub(r"\s+([,.;:!?)])", r"\1", ex)
            if ex and ex not in re.sub(r"\s+([,.;:!?)])", r"\1", text):
                err(f"blog: listing excerpt not in JSON: {ex[:80]!r}")
            checked += 1

    # images and URLs
    imgs = []
    walk_images(d, imgs)
    for im in imgs:
        p = os.path.join(ROOT, im["src"])
        if im["src"].startswith("http"):
            err(f"{slug}: http image {im['src']}")
        elif not os.path.isfile(p) or os.path.getsize(p) < 200:
            err(f"{slug}: image missing on disk {im['src']}")
        else:
            head = open(p, "rb").read(16)
            ok = head[:3] == b"\xff\xd8\xff" or head[:4] == b"\x89PNG" or head[4:12] in (b"ftypavif", b"ftypavis") or head[:4] == b"RIFF"
            if not ok:
                err(f"{slug}: not an image file {im['src']}")
        if re.search(r"-\d+x\d+\.\w+$", im["src"]):
            err(f"{slug}: thumbnail-sized image {im['src']}")
        checked += 1
    for s in all_strings(d):
        if re.search(r"https?://[^\s\"')]+\.(jpe?g|png|gif|webp|avif|svg)", s, re.I):
            err(f"{slug}: http image URL in JSON: {s[:80]}")
        for m in re.finditer(r"\]\((https?://(?:www\.)?jennarhae\.com[^)]*)\)", s):
            err(f"{slug}: absolute internal link {m.group(1)}")
        if re.search(r"\]\(/(trauma-coaching|life-coach-columbia-mo)/", s):
            err(f"{slug}: old internal slug link")
        if s.startswith("https://jennarhae.com") and not s.startswith("https://jennarhae.com/" + slug):
            err(f"{slug}: absolute internal URL {s}")
    for blk in d["sections"]:
        h = blk.get("href", "") if blk.get("type") == "cta" else ""
        if re.match(r"https?://(www\.)?jennarhae\.com", h) or h.startswith("/trauma-coaching/") or h.startswith("/life-coach-columbia-mo/"):
            err(f"{slug}: bad cta href {h}")

# testimonials file
tp = os.path.join(DATA, "testimonials.json")
if not os.path.exists(tp):
    err("testimonials.json missing")

print(f"\nchecked {checked} items across {len(PAGES) + len(POSTS)} pages; {len(errors)} failure(s)")
sys.exit(1 if errors else 0)
