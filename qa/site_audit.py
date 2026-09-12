#!/usr/bin/env python3
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json, re, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_REQUIRED = [
    "index.html","mua-vot.html","thuong-hieu.html","san-pham.html","ban-vot.html","xac-thuc.html",
    "nguoi-ban.html","dinh-gia.html","an-toan-giao-dich.html","chinh-sach-dang-tin.html","quy-che-hoat-dong.html",
    "dieu-khoan.html","chinh-sach-rieng-tu.html","faq.html","dang-nhap.html","tai-khoan.html","tin-nhan.html","404.html",
    "hang/joola.html","model/joola-ben-johns-perseus-3s-16mm.html",
    "robots.txt","sitemap.xml","manifest.webmanifest","data/paddle-catalog.json",
    "supabase/migrations/0001_core.sql","supabase/migrations/0002_lifecycle.sql","supabase/migrations/0003_trust_hardening.sql",
    "supabase/migrations/0004_production_guardrails.sql","supabase/migrations/0005_messaging_media_integrity.sql",
    "supabase/migrations/0006_staff_moderation_api.sql","supabase/migrations/0007_abuse_and_auth_integrity.sql",
    "supabase/migrations/0008_privacy_and_realtime.sql",
    "assets/runtime-config.js","assets/core/backend.js",
    "assets/services/auth-service.js","assets/services/listing-service.js","assets/services/conversation-service.js","assets/services/admin-service.js","assets/services/engagement-service.js",
    "assets/pages/auth-page.js","assets/pages/sell-page.js","assets/pages/account-page.js","assets/pages/market-page.js",
    "assets/pages/product-page.js","assets/pages/chat-page.js","assets/pages/moderation-page.js","assets/pages/verification-page.js",
    "docs/API_CONTRACT.md","docs/SEO_URL_ARCHITECTURE.md","docs/STORAGE_SECURITY.md","docs/PRODUCTION_READINESS.md","admin/moderation.html"
]
NOINDEX_PATHS={"san-pham.html","tin-nhan.html","dang-nhap.html","tai-khoan.html","404.html","admin/moderation.html"}
STALE_CRITICAL=["don-hang.html","giữ tiền trung gian","protected transaction flow","xác thực hai phía","verified buyer + verified seller"]
FAKE_CONTACT=["0900000000","090 000 0000"]

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.title=""; self._t=False; self.h1=0; self.desc=""; self.robots=""; self.canonical=""; self.hrefs=[]; self.srcs=[]; self.img_alt=0
    def handle_starttag(self,tag,attrs):
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
    def handle_endtag(self,tag):
        if tag=="title": self._t=False
    def handle_data(self,data):
        if self._t:self.title+=data

def local_target(ref,path):
    if not ref or ref.startswith(("#","mailto:","tel:","javascript:")): return None
    u=urlparse(ref)
    if u.scheme in ("http","https") or u.netloc or not u.path:return None
    return (path.parent/u.path).resolve()

def url_for(rel): return "https://chovot.vn/" if rel=="index.html" else "https://chovot.vn/"+rel

def main():
    errors=[]; warnings=[]
    for rel in PUBLIC_REQUIRED:
        if not (ROOT/rel).exists(): errors.append(f"MISSING required file: {rel}")
    html_files=sorted(ROOT.rglob("*.html"))
    for path in html_files:
        if any(x in {".git","node_modules"} for x in path.parts):continue
        rel=path.relative_to(ROOT).as_posix(); text=path.read_text(encoding="utf-8"); low=text.lower(); p=P(); p.feed(text)
        private=rel in NOINDEX_PATHS or rel.startswith("admin/")
        if not p.title.strip(): errors.append(f"{rel}: missing title")
        if not p.desc: errors.append(f"{rel}: missing meta description")
        if p.h1!=1: errors.append(f"{rel}: expected 1 H1, found {p.h1}")
        if private and rel!="404.html" and "noindex" not in p.robots: errors.append(f"{rel}: private/internal page missing noindex")
        if not private and not p.canonical: errors.append(f"{rel}: indexable page missing canonical")
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
            data=json.loads(cat.read_text(encoding="utf-8")); seen=set()
            if len(data.get("brands",[]))<30: errors.append("catalog: expected at least 30 brand seeds")
            for m in data.get("models",[]):
                slug=m.get("slug"); status=m.get("verification_status")
                if not slug or slug in seen: errors.append(f"catalog: missing/duplicate model slug {slug}")
                seen.add(slug)
                if status not in {"unverified","partial","verified"}: errors.append(f"catalog: invalid verification status {slug}")
                if status=="verified" and not m.get("sources"): errors.append(f"catalog: verified model lacks source {slug}")
                if status=="unverified" and any(m.get(k) not in (None,"") for k in ["surface","core","average_weight_oz","length_in","width_in","approval","nfc"]): errors.append(f"catalog: unverified model has asserted specs {slug}")
        except Exception as exc: errors.append(f"catalog JSON error: {exc}")

    robots=(ROOT/"robots.txt").read_text(encoding="utf-8") if (ROOT/"robots.txt").exists() else ""
    for required in ["Sitemap: https://chovot.vn/sitemap.xml","Disallow: /tin-nhan.html","Disallow: /admin/"]:
        if required not in robots: errors.append(f"robots: missing {required}")

    if (ROOT/"sitemap.xml").exists():
        try:
            root=ET.parse(ROOT/"sitemap.xml").getroot(); locs={e.text.strip() for e in root.iter() if e.tag.endswith("loc") and e.text}
            expected=[x for x in PUBLIC_REQUIRED if x.endswith(".html") and x not in NOINDEX_PATHS and x!="404.html" and not x.startswith("admin/")]
            for rel in expected:
                if url_for(rel) not in locs: errors.append(f"sitemap: missing {url_for(rel)}")
            if any("san-pham.html" in u or "tin-nhan.html" in u or "dang-nhap.html" in u or "tai-khoan.html" in u or "/admin/" in u for u in locs): errors.append("sitemap: private/dynamic URL present")
        except Exception as exc: errors.append(f"sitemap parse error: {exc}")

    def sql(name):
        p=ROOT/f"supabase/migrations/{name}"
        return p.read_text(encoding="utf-8") if p.exists() else ""
    core=sql("0001_core.sql"); lifecycle=sql("0002_lifecycle.sql"); trust=sql("0003_trust_hardening.sql"); guard=sql("0004_production_guardrails.sql")
    msg=sql("0005_messaging_media_integrity.sql"); staff=sql("0006_staff_moderation_api.sql"); abuse=sql("0007_abuse_and_auth_integrity.sql"); privacy=sql("0008_privacy_and_realtime.sql")
    for token in ["enable row level security","moderation_actions"]:
        if token not in core: errors.append(f"schema core: missing {token}")
    for token in ["handle_new_user","enforce_listing_publish_state","set_updated_at"]:
        if token not in lifecycle: errors.append(f"schema lifecycle: missing {token}")
    for token in ["seller creates own draft","before insert or update","revoke update on public.profiles","get_public_seller_trust","listing_evidence","seller_feedback"]:
        if token not in trust: errors.append(f"schema trust: missing {token}")
    insert_grant=re.search(r"grant\s+insert\s*\((.*?)\)\s+on\s+public\.listings",trust,re.I|re.S)
    if not insert_grant: errors.append("schema trust: listings INSERT column grant missing")
    elif re.search(r"\b(status|moderation_state|view_count|favorite_count|published_at|expires_at)\b",insert_grant.group(1),re.I): errors.append("schema trust: client INSERT grants server-owned listing fields")
    for token in ["user_roles","revoke update(status)","submit_listing_for_review","moderate_listing","listing-private","listing-public","revoke insert, update, delete on public.listing_images"]:
        if token not in guard: errors.append(f"schema guardrails: missing {token}")
    for token in ["public approved listing images read","start_listing_conversation","messages participants send unblocked","touch_conversation_on_message"]:
        if token not in msg: errors.append(f"schema messaging: missing {token}")
    for token in ["get_moderation_queue","get_staff_dashboard_counts","get_listing_moderation_evidence"]:
        if token not in staff: errors.append(f"schema staff API: missing {token}")
    for token in ["normalize_seller_verification_status","sync_phone_verification_from_auth","kyc_audit_events","enforce_message_rate_limit","report_listing"]:
        if token not in abuse: errors.append(f"schema abuse/auth: missing {token}")
    for token in ["revoke select on public.listings","revoke select on public.seller_verifications","revoke select on public.listing_evidence","get_own_listing_sensitive","supabase_realtime add table public.messages"]:
        if token not in privacy: errors.append(f"schema privacy: missing {token}")

    for path in (ROOT/"assets").rglob("*.js"):
        text=path.read_text(encoding="utf-8", errors="ignore").lower()
        if "service_role" in text: errors.append(f"frontend secret boundary: service_role reference in {path.relative_to(ROOT).as_posix()}")
        if re.search(r"(?:sk_live_|sk-proj-|eyj[a-z0-9_-]{40,})", text, re.I): errors.append(f"frontend secret boundary: secret-like token in {path.relative_to(ROOT).as_posix()}")

    print("ChoVot launch audit v2.6")
    print(f"HTML files checked: {len(html_files)}")
    for w in warnings: print("WARN ",w)
    for e in errors: print("ERROR",e)
    print(f"Result: {'FAIL' if errors else 'PASS'} | errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0
if __name__=="__main__": sys.exit(main())
