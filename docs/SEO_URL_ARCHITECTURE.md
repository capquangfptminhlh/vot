# ChoVot SEO URL Architecture v1

Goal: every indexable URL owns one stable search intent/entity. Do not create indexable faceted-search combinations at scale.

## Canonical production routes

- `/` — homepage / marketplace brand.
- `/mua-vot/` — marketplace browse/search hub.
- `/hang/{brand-slug}/` — one indexable brand entity page, e.g. `/hang/joola/`.
- `/vot/{brand-slug}/{model-slug}/` — one indexable model reference page, e.g. `/vot/joola/ben-johns-perseus-3s-16mm/`.
- `/tin/{listing-id}-{short-slug}/` — one indexable active listing URL.
- `/nguoi-ban/{seller-id}-{slug}/` — public seller profile when it has enough public content.
- `/dinh-gia/` — valuation tool.
- `/kien-thuc/{article-slug}/` — editorial/help content.
- `/faq/`, `/an-toan-giao-dich/`, `/xac-thuc-nguoi-ban/` — evergreen trust/support pages.

The current `.html` paths are preview-compatible static routes. On production hosting, 301 them to the clean routes above and update canonicals/sitemap in the same release.

## Listing lifecycle

- `draft`, `pending_review`, `rejected`, `removed`: never indexable.
- `active`: indexable if content quality threshold passes.
- `reserved`: keep URL/indexability; show status.
- `sold`: keep URL for a useful retention window, show sold status, link to same model/current listings; do not immediately 404.
- expired without value/history: eventually 410 or redirect only when there is a truly equivalent canonical destination. Never mass-redirect unrelated expired listings to home.

## Facets & search

Query/filter pages such as `?brand=JOOLA&condition=used&price_max=3000000` are for UX, not automatic SEO landing pages.

Rules:
- self-canonical browse/search only where intentional;
- arbitrary filters: `noindex,follow` or canonical to the owning hub;
- create a static/indexable landing page only after search demand + sufficient inventory are verified;
- never index empty combinations;
- avoid province/model/condition combinatorial explosion.

## Pagination

- Stable paginated URLs for large category/brand pages.
- Unique crawlable links to each page; do not rely on JS-only infinite scroll.
- Canonical each page to itself when the page has unique listing set and is intended for crawl.

## Structured data

- Homepage: `WebSite` + `SearchAction`.
- Brand/hub: `CollectionPage` + `ItemList`.
- Model reference: `Product` without fabricated `Offer` if no real seller offer belongs to that page.
- Listing: `Product` + `Offer` using the actual listing price/status; seller data only when public-safe.
- FAQ: `FAQPage` only for visible on-page questions/answers.
- Breadcrumbs: `BreadcrumbList` on brand/model/listing/article pages.

## Sitemaps

Split when scale requires it:
- `sitemap-static.xml`
- `sitemap-brands.xml`
- `sitemap-models.xml`
- `sitemap-listings-1.xml` ...
- `sitemap-articles.xml`
- sitemap index at `/sitemap.xml`.

Only canonical, indexable, 200-status URLs belong in sitemaps.

## Quality gates before an entity URL becomes indexable

Brand page:
- verified brand identity/name;
- useful model/inventory links;
- unique intro/help content.

Model page:
- exact brand/model identity;
- at least one primary/authoritative source for factual specs;
- source timestamp/status;
- no fabricated specs;
- useful link to active listings.

Listing page:
- verified seller account;
- moderation approved;
- required real photos;
- brand/model or explicit custom model;
- condition + price + location;
- no prohibited/spam/scam signals.
