#!/usr/bin/env python3
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_REQUIRED = [
    "index.html", "mua-vot.html", "san-pham.html", "ban-vot.html",
    "xac-thuc.html", "nguoi-ban.html", "dinh-gia.html",
    "an-toan-giao-dich.html", "quy-che-hoat-dong.html",
    "dieu-khoan.html", "chinh-sach-rieng-tu.html", "404.html",
    "robots.txt", "sitemap.xml", "manifest.webmanifest",
]
NOINDEX_OK = {"tin-nhan.html", "404.html"}
STALE_CRITICAL = [
    "don-hang.html", "giữ tiền trung gian", "protected transaction flow",
    "xác thực hai phía", "verified buyer + verified seller",
]
FAKE_CONTACT = ["0900000000", "090 000 0000"]

class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.h1 = 0
        self.meta_description = ""
        self.robots = ""
        self.canonical = ""
        self.hrefs: list[str] = []
        self.srcs: list[str] = []
        self.img_missing_alt = 0
        self.mobile_toggle_missing_label = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1 += 1
        elif tag == "meta":
            name = a.get("name", "").lower()
            if name == "description": self.meta_description = a.get("content", "").strip()
            if name == "robots": self.robots = a.get("content", "").lower()
        elif tag == "link" and a.get("rel", "").lower() == "canonical":
            self.canonical = a.get("href", "").strip()
        elif tag == "a":
            self.hrefs.append(a.get("href", ""))
        elif tag == "script":
            if a.get("src"): self.srcs.append(a["src"])
        elif tag == "img":
            if "alt" not in a: self.img_missing_alt += 1
            if a.get("src"): self.srcs.append(a["src"])
        elif tag == "button" and "mobile-toggle" in a.get("class", ""):
            if not a.get("aria-label"): self.mobile_toggle_missing_label += 1

    def handle_endtag(self, tag):
        if tag == "title": self._in_title = False

    def handle_data(self, data):
        if self._in_title: self.title += data


def local_target(ref: str, html_path: Path) -> Path | None:
    if not ref or ref.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    u = urlparse(ref)
    if u.scheme in ("http", "https") or u.netloc:
        return None
    path = u.path
    if not path:
        return None
    return (html_path.parent / path).resolve()


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    for rel in PUBLIC_REQUIRED:
        if not (ROOT / rel).exists(): errors.append(f"MISSING required file: {rel}")

    html_files = sorted(ROOT.glob("*.html"))
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        p = AuditParser(); p.feed(text)
        name = path.name
        noindex = "noindex" in p.robots or name in NOINDEX_OK
        if not p.title.strip(): errors.append(f"{name}: missing <title>")
        if not p.meta_description: errors.append(f"{name}: missing meta description")
        if p.h1 != 1: errors.append(f"{name}: expected 1 H1, found {p.h1}")
        if not noindex and not p.canonical: errors.append(f"{name}: indexable page missing canonical")
        if p.img_missing_alt: errors.append(f"{name}: {p.img_missing_alt} img tag(s) missing alt")
        if p.mobile_toggle_missing_label: warnings.append(f"{name}: mobile menu button missing aria-label")
        if 'href="#"' in text or "href='#'" in text: errors.append(f"{name}: placeholder href=#")
        low = text.lower()
        for term in STALE_CRITICAL:
            if term.lower() in low: errors.append(f"{name}: stale product-model term: {term}")
        for phone in FAKE_CONTACT:
            if phone in text: errors.append(f"{name}: fake contact number present: {phone}")
        if "prototype" in low or "dữ liệu mẫu" in low or "bản demo" in low:
            warnings.append(f"{name}: development/demo wording remains")
        for ref in p.hrefs + p.srcs:
            target = local_target(ref, path)
            if target is not None and not target.exists():
                errors.append(f"{name}: broken local ref {ref}")

    # Repo-wide stale flow and fake contact checks in user-facing code/config.
    scan_files = [ROOT / "README.md", ROOT / "AGENTS.md"] + list((ROOT / "assets").glob("*.js"))
    for path in scan_files:
        if not path.exists(): continue
        text = path.read_text(encoding="utf-8")
        low = text.lower()
        for term in STALE_CRITICAL:
            if term.lower() in low: errors.append(f"{path.relative_to(ROOT)}: stale product-model term: {term}")
        for phone in FAKE_CONTACT:
            if phone in text: errors.append(f"{path.relative_to(ROOT)}: fake contact number present: {phone}")

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8") if (ROOT / "robots.txt").exists() else ""
    if "Sitemap: https://chovot.vn/sitemap.xml" not in robots: errors.append("robots.txt: missing production sitemap URL")
    if "don-hang.html" in robots: errors.append("robots.txt: stale deleted order page")
    if "Disallow: /tin-nhan.html" not in robots: warnings.append("robots.txt: consider disallowing private messages page")

    sitemap = ROOT / "sitemap.xml"
    if sitemap.exists():
        try:
            root = ET.parse(sitemap).getroot()
            locs = {el.text.strip() for el in root.iter() if el.tag.endswith("loc") and el.text}
            for rel in [x for x in PUBLIC_REQUIRED if x.endswith(".html") and x not in NOINDEX_OK]:
                url = "https://chovot.vn/" if rel == "index.html" else f"https://chovot.vn/{rel}"
                if url not in locs: errors.append(f"sitemap.xml: missing {url}")
            if any("tin-nhan.html" in u for u in locs): errors.append("sitemap.xml: private messages page must not be indexed")
        except Exception as exc:
            errors.append(f"sitemap.xml: parse error: {exc}")

    print("ChoVot static launch audit")
    print(f"HTML files checked: {len(html_files)}")
    for w in warnings: print(f"WARN  {w}")
    for e in errors: print(f"ERROR {e}")
    print(f"Result: {'FAIL' if errors else 'PASS'} | errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
