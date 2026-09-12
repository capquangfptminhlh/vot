# ChoVot Storage Security

ChoVot dùng S3-compatible object storage thông qua backend riêng. Local/self-hosted dùng được MinIO; production có thể dùng MinIO hoặc dịch vụ S3-compatible khác nhưng browser không được nhận access key/secret key.

## Buckets

### `chovot-private`
- Chứa original seller uploads.
- Key chuẩn: `{seller_uuid}/{listing_uuid}/{random_uuid}.{ext}`.
- Browser chỉ nhận presigned PUT URL ngắn hạn sau khi backend xác minh seller + listing draft + MIME/size/count.
- Không public bucket listing và không cấp raw public URL.
- Original dùng cho processing/moderation theo retention policy.

### `chovot-public`
- Chỉ chứa derivative đã xử lý và moderation approved.
- Backend/worker decode file gốc rồi re-encode WebP bằng Sharp, không copy nguyên bytes upload sang public.
- Strip metadata/EXIF/GPS qua decode/re-encode pipeline.
- Public key dùng UUID/listing ID, không đưa phone/name/serial vào filename.
- Browser chỉ có read URL; không có credential ghi bucket.

### KYC media
Không tạo bucket KYC chung với listing. Ưu tiên raw CCCD/selfie/liveness ở provider eKYC đã ký hợp đồng. Nếu yêu cầu pháp lý/nghiệp vụ buộc phải lưu nội bộ thì dùng storage riêng, private/encrypted, RBAC hẹp, audit bắt buộc và retention/deletion policy riêng.

## Upload flow
1. Authenticated seller gọi `POST /listings/:id/images/presign`.
2. Backend xác minh listing thuộc seller, đang `DRAFT`, chưa vượt max ảnh, MIME allowlist và byte size.
3. Backend tạo random private key và presigned PUT URL hết hạn ngắn.
4. Browser PUT trực tiếp vào private bucket; không đi qua public bucket.
5. Browser gọi `POST /listings/:id/images/complete`; backend HEAD object và xác minh metadata cơ bản trước khi ghi `ListingImage`.
6. Khi moderation xử lý, backend GET original private, Sharp decode/rotate/resize/re-encode WebP.
7. Backend tính SHA-256 derivative và tìm duplicate/risk signal cross-seller.
8. Nếu an toàn, derivative được PUT sang public bucket và metadata chuyển `APPROVED`; nếu nghi ngờ chuyển `NEEDS_REVIEW`.
9. Listing chỉ được approve khi có tối thiểu 2 ảnh approved và seller VERIFIED.

## Abuse controls
- Tối đa 8 ảnh/tin ở flow hiện tại.
- JPG/PNG/WebP only; tối đa 12 MB/file.
- Không chấp nhận SVG/HTML hoặc định dạng script-capable cho ảnh sản phẩm.
- Presign chỉ cấp cho seller sở hữu listing draft; key phải nằm trong prefix `{sellerId}/{listingId}/`.
- Server HEAD object sau upload; production nên bổ sung content sniffing/magic-byte validation nếu storage metadata không đủ tin cậy.
- Sharp resize giới hạn derivative tối đa 1800x1800 và không upscale.
- Duplicate content hash là moderation signal, không auto-ban chỉ dựa vào hash.
- Presign/upload/report cần rate-limit production.
- Không cho anonymous bucket listing.

## Delivery
- `PUBLIC_MEDIA_BASE_URL` chỉ trỏ public bucket/CDN approved derivatives.
- Approved derivative dùng cache immutable khi key content không bị overwrite.
- Frontend lazy-load ảnh dưới fold và dùng placeholder trong thời gian processing.
- Production nên tạo nhiều width variant/srcset để tối ưu mobile/Core Web Vitals.
- Xóa/expire listing phải tuân retention policy; public derivative không được tồn tại vô thời hạn nếu policy yêu cầu purge.

## Secret boundary
Các giá trị sau chỉ ở backend secret manager/environment và không bao giờ nằm trong frontend runtime config:
- `S3_ACCESS_KEY`
- `S3_SECRET_KEY`
- database credentials
- OTP provider secret
- KYC provider secret/webhook verification key

## Logging/audit
Ghi ít nhất:
- uploader user ID;
- listing ID;
- object key nội bộ;
- upload/processing timestamp;
- sanitized content hash;
- moderation result/risk signal;
- processing failure;
- moderator/admin access tới original private khi có.

Không log presigned URL sau khi sử dụng, access/secret keys, raw KYC document, OTP, refresh token hay serial nguyên văn.
