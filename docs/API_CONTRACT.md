# ChoVot API Contract v1

API production do NestJS backend của ChoVot cung cấp tại prefix `/api/v1`. Browser chỉ gọi REST/WebSocket này; không nhận database credentials, object-storage secret, KYC secret hay raw identity documents.

## Auth
- `POST /auth/otp/request` — body `{ channel: "EMAIL"|"PHONE", target }`.
- `POST /auth/otp/verify` — xác minh OTP; trả access token ngắn hạn và set refresh token HttpOnly cookie.
- `POST /auth/refresh` — rotate refresh token và trả access token mới.
- `POST /auth/logout` — revoke refresh token hiện tại và clear cookie.
- Access token gửi bằng `Authorization: Bearer ...`; frontend giữ token trong memory.

## Account
- `GET /me` — hồ sơ hiện tại + public-safe seller verification state.
- `GET /me/listings` — tối đa 100 tin của chính seller, gồm lifecycle/moderation state.

## Seller verification
- `GET /verification/me` — trả `phoneVerified`, `identityVerified`, `bankNameVerified`, `status`.
- `POST /verification/phone/request` — OTP để liên kết SĐT với account đang đăng nhập; khác OTP login.
- `POST /verification/phone/verify` — xác minh và gắn SĐT vào đúng user hiện tại.
- `POST /verification/identity/session` — tạo phiên eKYC provider; yêu cầu phone đã verified.
- `POST /verification/bank/session` — tạo phiên đối chiếu bank-name provider; yêu cầu phone đã verified.
- `POST /verification/webhook/:kind` — endpoint server-to-server; production phải thay static placeholder bằng signature/replay validation theo provider cụ thể.
- Seller `VERIFIED` chỉ khi phone + identity + bank đều true.

## Catalog
Catalog nguồn hiện còn nằm trong `data/paddle-catalog.json`; production cần seed vào `Brand`/`PaddleModel` trong PostgreSQL và mở API đọc riêng.
Dự kiến:
- `GET /brands`
- `GET /brands/:slug/models`
- `GET /models/:slug`

## Listings
- `GET /listings?q=&limit=` — public `ACTIVE|RESERVED`; response chỉ field public-safe.
- `GET /listings/:id` — public `ACTIVE|RESERVED|SOLD`.
- `POST /listings` — authenticated seller; **luôn tạo `DRAFT`**, không cho browser chọn status.
- `POST /listings/:id/images/presign` — owner + draft only; trả signed private upload URL.
- `POST /listings/:id/images/complete` — xác nhận object đã upload và ghi metadata.
- `POST /listings/:id/submit` — yêu cầu seller VERIFIED + tối thiểu 2 ảnh; chuyển `PENDING_REVIEW`.
- `POST /listings/:id/sold` — owner only, từ `ACTIVE|RESERVED`; ghi audit log.
- Raw serial không được public; backend lưu hash + suffix hint khi cần.

## Favorites và report
- `GET /listings/:id/favorite` — trạng thái yêu thích của user hiện tại.
- `POST /listings/:id/favorite/toggle` — toggle server-side và cập nhật counter an toàn.
- `POST /listings/:id/reports` — reason nằm trong allowlist, open report được upsert để hạn chế duplicate spam.
- Client không được update report workflow fields.

## Images
1. Seller xin signed URL cho listing draft của chính mình.
2. Browser PUT file trực tiếp vào private S3-compatible bucket.
3. Backend HEAD object và ghi `ListingImage` pending.
4. Moderation xử lý ảnh: Sharp decode/rotate/resize/re-encode WebP, loại metadata, tính SHA-256.
5. Duplicate cross-seller là risk signal.
6. Chỉ derivative approved được copy sang public bucket và trả public URL.
- JPG/PNG/WebP only; max 12 MB/file; max 8 ảnh/tin ở flow hiện tại.

## Messaging
- `POST /conversations/from-listing/:listingId` — backend lấy seller từ listing thật; browser không truyền seller ID.
- `GET /conversations`
- `GET /conversations/:id`
- `GET /conversations/:id/messages?limit=`
- Socket.IO namespace `/chat`:
  - handshake `auth.token` là JWT access token;
  - `join_conversation` chỉ thành công nếu user là buyer/seller;
  - `send_message` kiểm participant, block state và Redis rate-limit 30 msg/min/user;
  - server emit `message:new` vào room conversation.

## Moderation
Tất cả endpoint dưới đây yêu cầu authenticated `MODERATOR|ADMIN`:
- `GET /admin/dashboard`
- `GET /admin/moderation?limit=`
- `GET /admin/moderation/:id/evidence`
- `POST /admin/moderation/:id` — `{ decision: "approve"|"reject"|"needs_review", reason? }`.
- Approve yêu cầu seller VERIFIED + ít nhất 2 ảnh approved sau media processing.
- Mọi moderation decision ghi `ModerationAction`.

## Public seller trust
Listing public chỉ trả các trường trust an toàn: display name, seller score/rating và ba verification flags/status. Provider references, raw giấy tờ, bank identifiers và private evidence path không xuất hiện trong public response.

## Security invariants
- Browser không được chọn system role, listing status, moderation state, trust score hoặc counter.
- Mọi write nhạy cảm được authorize server-side bằng user lấy từ JWT/DB.
- PostgreSQL credentials, S3 secret, OTP/KYC secret chỉ tồn tại server-side.
- OTP target/code, refresh token, serial được hash phù hợp trước khi lưu.
- CORS production dùng allowlist; Socket.IO dùng cùng policy origin.
- OTP/chat/report/upload cần rate limit; abuse controls được mở rộng theo dữ liệu production.
- Audit moderation và lifecycle nhạy cảm.
