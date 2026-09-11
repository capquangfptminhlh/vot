# AGENTS.md — ChoVot Pickleball

Central Website OS governance:
- source repo: `capquangfptminhlh/seo-web`
- source ref: `main`
- pinned source commit for this phase: `ef18d255150f3a77a7c7587feccf1ba7c419ad7b`
- manifest: `governance/website-os.manifest.yml`
- entrypoint: `AGENTS.md`

Before substantive work, load the central manifest, resolve the source commit, complete the mandatory read order, then apply the local rules below. Local rules may extend but not silently weaken central hard gates.

## Product model — authoritative
- Project: ChoVot Pickleball, Vietnam.
- ChoVot is a **classified marketplace / listing-and-connection platform for pickleball paddles**.
- Core proposition: **verified seller + structured paddle specs/condition + direct buyer/seller contact**.
- Only sellers must complete mandatory verification before publishing a listing.
- Buyers do not need KYC to browse or contact sellers.
- Current model does **not** provide checkout, order creation, escrow, held funds, shipping, delivery tracking or payout.
- Buyer and seller independently negotiate price, inspect the paddle, choose payment method and arrange delivery/meetup.
- Never describe obsolete buyer-verification, protected checkout, escrow or platform-held-funds flows as current product behavior.

## Trust & data rules
- Never expose raw CCCD, bank account numbers, selfie/liveness, biometric data or other sensitive KYC data publicly.
- Production KYC must use an approved provider and a documented privacy/retention/deletion process; do not treat front-end/localStorage simulation as real verification.
- Seller verification is not paddle-authenticity verification. Product serial/NFC/invoice/status are separate fields.
- Do not fabricate seller ratings, transaction history, search volume, keyword difficulty, CPC, ranking, traffic potential or verified product performance data.
- Sample/demo data must not be presented as real marketplace activity.

## Marketplace quality rules
- Every listing should support: brand, model, condition, price, location, photos, thickness, shape, weight, surface, core, play style, grip dimensions, serial/NFC, invoice status, description and contact preference where available.
- Maintain `Hãng khác` fallback; brand lists are curated and must not be called exhaustive without current evidence.
- Production must support report/moderation, sold/expired state, duplicate/scam review, spam/rate limits and prohibited/counterfeit handling.
- Each production listing/model needs a stable canonical URL; a single dynamic `san-pham.html` demo URL is not sufficient for launch-scale SEO.

## Visual rules
- The approved desktop/mobile direction remains the visual source of truth for the first implementation.
- Mobile must behave as a web app, not merely a stacked desktop page: fixed bottom navigation, thumb-friendly actions, compact search/filter, safe-area handling and dedicated mobile composition.

## Legal/readiness rules
- Before commercial launch, complete legal-entity/contact details, privacy retention terms and applicable Vietnam e-commerce registration/notification requirements.
- The platform must clearly state it is not payment/shipping intermediary under the current model.

## Bootstrap evidence
- observed_at: 2026-09-11T12:19:00+07:00
- source_commit_sha: ef18d255150f3a77a7c7587feccf1ba7c419ad7b
- manifest_version: 1.3.0
- mandatory_read_complete: YES
- bootstrap_decision: PASS
