# ChoVot Storage Security

Recommended Supabase Storage design for production. Do not reuse public unrestricted buckets for seller uploads.

## Buckets

### `listing-originals` (private)
- Original seller uploads.
- Path: `{seller_uuid}/{listing_uuid}/{random_uuid}.jpg`.
- Seller can upload only into own user prefix and only to a listing they own.
- Moderators/service backend can read for review.
- Never expose raw public URLs.

### `listing-public` (public/read-only to clients)
- Sanitized derivatives only after moderation.
- Strip EXIF metadata, especially GPS/device metadata.
- Resize and recompress; generate web-friendly variants.
- File names are random IDs, not phone/name/serial.
- Client cannot write directly.

### `kyc` — DO NOT CREATE by default
Prefer keeping CCCD/selfie/liveness with the contracted KYC provider. If business/legal requirements force internal retention, use a separate private system with strict access, encryption, auditing and documented retention/deletion periods rather than ordinary listing storage.

## Upload flow

1. Authenticated seller requests upload authorization for a listing they own.
2. Server verifies listing ownership, seller state, MIME/size/count limits and rate limits.
3. Client uploads to a signed/private path.
4. Worker validates actual file type, strips metadata, virus/scanner checks when available, computes SHA-256 + perceptual hash, and creates derivatives.
5. Moderation evaluates image/listing signals.
6. Only approved derivative is promoted to public delivery.

## Abuse controls

- Max 8–12 images per listing.
- Server-side MIME sniffing; never trust file extension.
- Reject SVG/HTML/script-capable formats for user product photos.
- Limit dimensions and decoded pixel count to avoid image bombs.
- Detect duplicate/perceptually similar images across different sellers/listings.
- Keep hashes even when images are removed only if permitted by the retention/privacy policy and needed for fraud prevention.
- Rate limit signed-upload creation.
- Do not allow bucket listing from anonymous users.

## Delivery

- Use immutable asset URLs for approved derivatives.
- Responsive `srcset` sizes for mobile performance.
- Lazy-load below-the-fold listing images.
- Use a placeholder while moderation/processing is pending.
- Deleting a listing should follow the published retention policy; it must not silently leave public derivatives indefinitely.

## Logging

Audit at minimum:
- uploader user ID;
- listing ID;
- upload timestamp;
- original hash;
- moderation result;
- processing failure;
- moderator/admin access to private originals.
