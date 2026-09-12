# ChoVot production readiness

Production-ready is a measurable release state, not a visual claim.

## Frontend
- No fake trust, seller or transaction data can be presented as real.
- Authenticated actions use the backend service layer only.
- Loading, empty, error, offline and unauthorized states are handled.
- Public SEO pages remain crawlable HTML; private account/admin pages are noindex.
- Mobile, keyboard and accessibility checks must pass before release.

## Auth and identity
- Supabase Auth uses production redirect URLs only.
- Phone OTP requires a configured SMS provider.
- Seller publication requires verified seller state.
- Raw identity images, bank identifiers and KYC provider references are never public.

## Database
- Migrations are applied only to a dedicated ChoVot Supabase project.
- RLS is enabled for every user-facing table.
- Browser clients cannot write moderation, trust scores, ratings, counters or system state.
- Lifecycle changes use audited RPC/Edge Functions.

## Storage
- Seller uploads land in a private bucket first.
- EXIF/GPS and unsafe metadata are removed before public delivery.
- Public bucket receives only moderated derivatives.
- MIME type, byte size and rate limits are enforced server-side.

## Moderation
- Staff roles are server-owned.
- Approve/reject/suspend actions create audit records.
- Duplicate-image hash, suspicious pricing and report queues are reviewable.

## Observability and recovery
- Frontend and Edge Function errors are monitored.
- Auth/moderation failures are searchable.
- Database backups and restore procedure are tested.

## CI / deployment
- Static QA returns 0 errors and 0 warnings.
- Database migration validation passes.
- No service-role key, KYC secret or provider webhook secret is committed.
- Preview and production configuration are separate.

## External blockers that must never be faked
- Dedicated Supabase project selection or creation.
- SMS provider for phone OTP.
- KYC provider contract and webhook credentials.
- Production domain ownership and DNS.
- Legal entity/contact information required for launch policies.
