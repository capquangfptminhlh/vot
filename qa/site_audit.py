#!/usr/bin/env python3
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_REQUIRED = [
    "index.html","mua-vot.html","thuong-hieu.html","san-pham.html","ban-vot.html","xac-thuc.html",
    "nguoi-ban.html","dinh-gia.html","an-toan-giao-dich.html","quy-che-hoat-dong.html",
    "dieu-khoan.html","chinh-sach-rieng-tu.html","faq.html","404.html",
    "hang/joola.html","model/joola-ben-johns-perseus-3s-16mm.html",
    "robots.txt","sitemap.xml","manifest.webmanifest","data/paddle-catalog.json",
    "supabase/migrations/0001_core.sql","supabase/migrations/0002_lifecycle.sql",
    "docs/API_CONTRACT.md","docs/SEO_URL_ARCHITECTURE.md","docs/STORAGE_SECURITY.md","admin/moderation.html"
]
NOINDEX_PATHS = {"tin-nhan.html","404.html","admin/moderation.html"}
STALE_CRITICAL = ["don-hang.html","giữ tiền trung gian","protected transaction flow","xác thực hai phía","verified buyer + verified seller"]
FAKE_CONTACT = ["0900000000","090 000 0000"]

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.title=""; self._t=False; self.h1=0; self.desc=""; self.robots=""; self.canonical=""; self.hrefs=[]; self.srcs=[]; self.img_alt=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="title": self._t=True
        elif tag=="h1": self.h1+=1
        elif tag=="meta":
            n=a.get("name","").lower()
            if n=="description": self.desc=a.get("content","").strip()
            if n=="robots": self.robots=a.get("content","").lower()
        elif tag=="link" and a.get("rel","").lower()=="canonical": self.canonical=a.get("href","").strip()
        elif tag=="a": self.hrefs.append(a.get("href",""))
        elif tag=="script" and a.get("src"): self.srcs.append(a["src"])
        elif tag=="img":
            if "alt" not in a: self.img_alt+=1
            if a.get("src"): self.srcs.append(a["src"])
    def handle_endtag(self, tag):
        if tag=="title": self._t=False
    def handle_data(self,data):
        if self._t:self.title+=data

def local_target(ref:str, html:Path):
    if not ref or ref.startswith(("#","mailto:","tel:","javascript:")): return None
    u=urlparse(ref)
    if u.scheme in ("http","https") or u.netloc or not u.path: return None
    return (html.parent/u.path).resolve()

def url_for(rel:str): return "https://chovot.vn/" if rel=="index.html" else "https://chovot.vn/"+rel

def main():
    errors=[]; warnings=[]
    for rel in PUBLIC_REQUIRED:
        if not (ROOT/rel).exists(): errors.append(f"MISSING required file: {rel}")

    html_files=sorted(ROOT.rglob("*.html"))
    for path in html_files:
        if any(p in {".git","node_modules"} for p in path.parts): continue
        rel=path.relative_to(ROOT).as_posix(); text=path.read_text(encoding="utf-8"); p=P(); p.feed(text); low=text.lower()
        should_noindex=rel in NOINDEX_PATHS or rel.startswith("admin/"); has_noindex="noindex" in p.robots
        if not p.title.strip(): errors.append(f"{rel}: missing title")
        if not p.desc: errors.append(f"{rel}: missing meta description")
        if p.h1!=1: errors.append(f"{rel}: expected 1 H1, found {p.h1}")
        if should_noindex and not has_noindex and rel!="404.html": errors.append(f"{rel}: private/internal page missing noindex")
        if not should_noindex and not p.canonical: errors.append(f"{rel}: indexable page missing canonical")
        if p.img_alt: errors.append(f"{rel}: {p.img_alt} image(s) missing alt")
        if 'href="#"' in text or "href='#'" in text: errors.append(f"{rel}: placeholder href=#")
        for term in STALE_CRITICAL:
            if term.lower() in low: errors.append(f"{rel}: stale flow term: {term}")
        for phone in FAKE_CONTACT:
            if phone in text: errors.append(f"{rel}: fake contact: {phone}")
        if any(x in low for x in ("dữ liệu mẫu","bản demo","prototype")): warnings.append(f"{rel}: pre-production wording remains")
        for ref in p.hrefs+p.srcs:
            t=local_target(ref,path)
            if t is not None and not t.exists(): errors.append(f"{rel}: broken local ref {ref}")

    cat=ROOT/"data/paddle-catalog.json"
    if cat.exists():
        try:
            data=json.loads(cat.read_text(encoding="utf-8")); slugs=set()
            if len(data.get("brands",[]))<30: errors.append("catalog: expected at least 30 brand seeds")
            for m in data.get("models",[]):
                slug=m.get("slug"); status=m.get("verification_status")
                if not slug or slug in slugs: errors.append(f"catalog: missing/duplicate model slug {slug}")
                slugs.add(slug)
                if status not in {"unverified","partial","verified"}: errors.append(f"catalog: invalid verification status {slug}")
                if status=="verified" and not m.get("sources"): errors.append(f"catalog: verified model lacks source {slug}")
                if status=="unverified":
                    fact_fields=["surface","core","average_weight_oz","length_in","width_in","approval","nfc"]
                    if any(m.get(k) not in (None,"") for k in fact_fields): errors.append(f"catalog: unverified model has asserted specs {slug}")
        except Exception as exc: errors.append(f"catalog JSON error: {exc}")

    robots=(ROOT/"robots.txt").read_text(encoding="utf-8") if (ROOT/"robots.txt").exists() else ""
    if "Sitemap: https://chovot.vn/sitemap.xml" not in robots: errors.append("robots: missing production sitemap")
    if "Disallow: /tin-nhan.html" not in robots: errors.append("robots: messages must be disallowed")
    if "Disallow: /admin/" not in robots: errors.append("robots: admin must be disallowed")

    sitemap=ROOT/"sitemap.xml"
    if sitemap.exists():
        try:
            root=ET.parse(sitemap).getroot(); locs={e.text.strip() for e in root.iter() if e.tag.endswith("loc") and e.text}
            expected=[x for x in PUBLIC_REQUIRED if x.endswith(".html") and x not in NOINDEX_PATHS and x!="404.html" and not x.startswith("admin/")]
            for rel in expected:
                if url_for(rel) not in locs: errors.append(f"sitemap: missing {url_for(rel)}")
            if any("tin-nhan.html" in u or "/admin/" in u for u in locs): errors.append("sitemap: private/internal URL present")
        except Exception as exc: errors.append(f"sitemap parse error: {exc}")

    core=(ROOT/"supabase/migrations/0001_core.sql").read_text(encoding="utf-8") if (ROOT/"supabase/migrations/0001_core.sql").exists() else ""
    lifecycle=(ROOT/"supabase/migrations/0002_lifecycle.sql").read_text(encoding="utf-8") if (ROOT/"supabase/migrations/0002_lifecycle.sql").exists() else ""
    for token in ["enable row level security","verified seller creates listing","moderation_actions"]:
        if token not in core: errors.append(f"schema core: missing security primitive {token}")
    for token in ["handle_new_user","enforce_listing_publish_state","public_seller_trust","set_updated_at"]:
        if token not in lifecycle: errors.append(f"schema lifecycle: missing primitive {token}")

    print("ChoVot launch audit v2.1")
    print(f"HTML files checked: {len(html_files)}")
    for w in warnings: print("WARN ",w)
    for e in errors: print("ERROR",e)
    print(f"Result: {'FAIL' if errors else 'PASS'} | errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0
if __name__=="__main__": sys.exit(main())
