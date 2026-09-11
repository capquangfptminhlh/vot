# ChoVot API Contract v0.1

This contract is backend-neutral. It is intended to be implemented by Supabase Edge Functions or another server layer; the browser must never receive service-role credentials or raw KYC documents.

## Auth
- `POST /auth/otp/start` — start phone/email OTP.
- `POST /auth/otp/verify` — verify OTP and create session.
- Seller-only protected actions require authenticated session.

## Seller verification
- `POST /seller/verification/start` — create KYC provider session; returns redirect/token only.
- `GET /seller/verification/status` — returns `pending|verified|rejected|suspended` plus public-safe flags.
- Bank-name verification result is stored as boolean/status; do not expose bank account numbers publicly.
- Raw CCCD/selfie images must stay with the contracted KYC provider when possible.

## Catalog
- `GET /brands`
- `GET /brands/:slug/models`
- `GET /models/:slug`
- Model fields include `verification_status`, `source_url`, `verified_at`. Unverified fields must not be presented as facts.

## Listings
- `GET /listings?q=&brand=&model=&condition=&price_min=&price_max=&province=&sort=`
- `GET /listings/:id`
- `POST /listings` — verified sellers only; creates `draft` or `pending_review`.
- `PATCH /listings/:id` — owner only.
- `POST /listings/:id/publish` — requires seller verification and moderation pass.
- `POST /listings/:id/mark-sold` — owner only.
- `POST /listings/:id/report` — authenticated user; anonymous reporting may be added with abuse controls.

## Images
- Browser requests signed upload URL; object path is scoped to seller/listing.
- Strip EXIF GPS by default.
- Generate image hash/perceptual hash for duplicate detection.
- Never allow arbitrary public bucket writes.

## Favorites & saved searches
- `PUT /favorites/:listing_id`
- `DELETE /favorites/:listing_id`
- `GET /favorites`
- `POST /saved-searches`
- Saved-search notifications require explicit opt-in and rate limits.

## Messaging
- `POST /conversations` — starts conversation for one listing; buyer and seller only.
- `GET /conversations`
- `GET /conversations/:id/messages`
- `POST /conversations/:id/messages`
- Block phone/link spam or repeated unsolicited messages server-side.

## Moderation
- Internal/admin only: `GET /admin/moderation/queue`
- `POST /admin/listings/:id/approve`
- `POST /admin/listings/:id/request-evidence`
- `POST /admin/listings/:id/reject`
- `POST /admin/users/:id/suspend`
- Every action writes `moderation_actions` audit log.

## Risk signals
At minimum calculate:
- seller verification state;
- new-account velocity;
- duplicate image hash;
- price deviation vs model median;
- repeated serial/phone/device signals;
- off-platform contact/link spam;
- report history;
- listing edit frequency after approval.

## Privacy / security requirements
- RLS on every user-data table.
- KYC and bank details are never public.
- Server-side authorization for all writes; UI state is never trusted.
- Rate limit OTP, messages, listing creation and reports.
- Audit admin/moderation access.
- Support account/data deletion and retention policy.
