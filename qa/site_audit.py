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
    "assets/runtime-config.js","assets/core/backend.js",
    "assets/services/auth-service.js","assets/services/listing-service.js","assets/services/conversation-service.js","assets/services/admin-service.js","assets/services/engagement-service.js",
    "assets/pages/auth-page.js","assets/pages/sell-page.js","assets/pages/account-page.js","assets/pages/market-page.js",
    "assets/pages/product-page.js","assets/pages/chat-page.js","assets/pages/moderation-page.js","assets/pages/verification-page.js",
    "backend/package.json","backend/prisma.config.ts","backend/prisma/schema.prisma","backend/src/main.ts","backend/src/app.module.ts",
    "backend/src/auth/auth.service.ts","backend/src/listings/listings.service.ts","backend/src/conversations/conversations.gateway.ts",
    "backend/src/verification/verification.service.ts","backend/src/admin/admin.service.ts","backend/src/storage/storage.service.ts",
    "backend/Dockerfile","backend/.env.example","docker-compose.yml",".github/workflows/backend-quality.yml",
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

def text(path):
    p=ROOT/path
    return p.read_text(encoding="utf-8",errors="ignore") if p.exists() else ""

def main():
    errors=[]; warnings=[]
    for rel in PUBLIC_REQUIRED:
        if not (ROOT/rel).exists(): errors.append(f"MISSING required file: {rel}")

    html_files=sorted(ROOT.rglob("*.html"))
    for path in html_files:
        if any(x in {".git","node_modules","dist"} for x in path.parts):continue
        rel=path.relative_to(ROOT).as_posix(); raw=path.read_text(encoding="utf-8"); low=raw.lower(); p=P(); p.feed(raw)
        private=rel in NOINDEX_PATHS or rel.startswith("admin/")
        if not p.title.strip(): errors.append(f"{rel}: missing title")
        if not p.desc: errors.append(f"{rel}: missing meta description")
        if p.h1!=1: errors.append(f"{rel}: expected 1 H1, found {p.h1}")
        if private and rel!="404.html" and "noindex" not in p.robots: errors.append(f"{rel}: private/internal page missing noindex")
        if not private and not p.canonical: errors.append(f"{rel}: indexable page missing canonical")
        if p.img_alt: errors.append(f"{rel}: {p.img_alt} image(s) missing alt")
        if 'href="#"' in raw or "href='#'" in raw: errors.append(f"{rel}: placeholder href=#")
        for term in STALE_CRITICAL:
            if term.lower() in low: errors.append(f"{rel}: stale flow term: {term}")
        for phone in FAKE_CONTACT:
            if phone in raw: errors.append(f"{rel}: fake contact: {phone}")
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

    robots=text("robots.txt")
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

    # Frontend architecture boundary: browser code may call only ChoVot API, never a database/BaaS SDK.
    for path in (ROOT/"assets").rglob("*.js"):
        raw=path.read_text(encoding="utf-8",errors="ignore"); low=raw.lower(); rel=path.relative_to(ROOT).as_posix()
        if "supabase" in low: errors.append(f"frontend architecture: Supabase dependency/reference in {rel}")
        if "service_role" in low: errors.append(f"frontend secret boundary: service_role reference in {rel}")
        if re.search(r"(?:sk_live_|sk-proj-|eyj[a-z0-9_-]{40,})",raw,re.I): errors.append(f"frontend secret boundary: secret-like token in {rel}")
    backend_js=text("assets/core/backend.js").lower()
    runtime_js=text("assets/runtime-config.js")
    if "apibaseurl" not in runtime_js.lower(): errors.append("frontend runtime: apiBaseUrl missing")
    if "credentials: \"include\"" not in text("assets/core/backend.js") and "credentials: 'include'" not in text("assets/core/backend.js"): errors.append("frontend auth: refresh cookie credential flow missing")
    if "localstorage" in backend_js or "sessionstorage" in backend_js: errors.append("frontend auth: token storage must not use Web Storage")

    # Backend architecture/security invariants.
    schema=text("backend/prisma/schema.prisma")
    package=text("backend/package.json")
    main_ts=text("backend/src/main.ts")
    auth=text("backend/src/auth/auth.service.ts")
    listing=text("backend/src/listings/listings.service.ts")
    storage=text("backend/src/storage/storage.service.ts")
    chat=text("backend/src/conversations/conversations.service.ts")+text("backend/src/conversations/conversations.gateway.ts")
    verify=text("backend/src/verification/verification.service.ts")
    admin=text("backend/src/admin/admin.service.ts")
    for token in ["model User","model SellerVerification","model Listing","model ListingImage","model Conversation","model Message","model Report","model ModerationAction","model RefreshToken","model OtpChallenge","model AuditLog"]:
        if token not in schema: errors.append(f"backend schema: missing {token}")
    for token in ['"@prisma/adapter-pg"','"argon2"','"ioredis"','"socket.io"','"sharp"']:
        if token not in package: errors.append(f"backend package: missing {token}")
    for token in ["helmet()","cookieParser()","ValidationPipe","CORS_ORIGINS"]:
        if token not in main_ts: errors.append(f"backend bootstrap: missing {token}")
    for token in ["argon2.hash","argon2.verify","REFRESH_TOKEN_PEPPER","OTP_RATE_LIMIT","issueSession"]:
        if token not in auth: errors.append(f"backend auth: missing {token}")
    for token in ["PENDING_REVIEW","SELLER_VERIFICATION_REQUIRED","serialHash","markSold","auditLog"]:
        if token not in listing: errors.append(f"backend listing lifecycle: missing {token}")
    for token in ["getSignedUrl","sharp(","contentHash","privateBucket","publicBucket"]:
        if token not in storage: errors.append(f"backend media security: missing {token}")
    for token in ["MESSAGE_RATE_LIMIT","userBlock","join_conversation","verifyAsync"]:
        if token not in chat: errors.append(f"backend chat security: missing {token}")
    for token in ["phoneVerified","identityVerified","bankNameVerified","KYC_WEBHOOK_SECRET"]:
        if token not in verify: errors.append(f"backend verification: missing {token}")
    for token in ["moderationAction","SELLER_NOT_VERIFIED","MIN_2_APPROVED_IMAGES"]:
        if token not in admin: errors.append(f"backend moderation: missing {token}")

    print("ChoVot launch audit v3.0 self-hosted")
    print(f"HTML files checked: {len(html_files)}")
    for w in warnings: print("WARN ",w)
    for e in errors: print("ERROR",e)
    print(f"Result: {'FAIL' if errors else 'PASS'} | errors={len(errors)} warnings={len(warnings)}")
    return 1 if errors else 0
if __name__=="__main__": sys.exit(main())
