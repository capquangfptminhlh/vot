# AGENTS.md — ChoVot Pickleball Project Bootstrap

This repository is governed by the central Website OS repository.

- Source repo: `capquangfptminhlh/seo-web`
- Source ref: `main`
- Resolved source commit for this phase: `ef18d255150f3a77a7c7587feccf1ba7c419ad7b`
- Manifest: `governance/website-os.manifest.yml`
- Central entrypoint: `AGENTS.md`
- Enforcement engine: `engine/website_os_engine.py`
- Engine policy: `engine/policy.yml`

Before substantive project work, load the central manifest and complete its `mandatory_read_order`. Local rules may extend but must not silently weaken central normative gates.

## Project-specific rules

- Product: ChoVot Pickleball — verified marketplace for buying, selling, exchanging and consigning pickleball paddles in Vietnam.
- Both buyer and seller trust are first-class product concepts. Public UI must never expose sensitive identity documents.
- KYC, bank verification and escrow shown in the frontend are product states only until a compliant provider/backend is integrated; do not imply live financial custody.
- Approved desktop + mobile demo from the 2026-09-11 design cycle is the visual source of truth for implementation.
- Marketplace listing data in the current frontend MVP is demo data and must not be represented as live inventory.
- Local SEO is not enabled for launch; avoid city/district doorway pages.

Bootstrap failure state: `HOLD — WEBSITE OS BOOTSTRAP MISSING OR STALE`.
