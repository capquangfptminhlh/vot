# ChoVot production readiness

Production-ready là trạng thái release đo được bằng test và vận hành thật, không phải nhận xét giao diện.

## Kiến trúc chuẩn
- Frontend chỉ gọi ChoVot REST API/WebSocket, không truy cập PostgreSQL hay SDK BaaS trực tiếp.
- API: Node.js 22 + NestJS 11.
- Database: PostgreSQL, schema/migration duy nhất do Prisma 7 quản lý.
- Cache/rate limit: Redis.
- Realtime chat: Socket.IO qua backend có xác thực JWT và authorization theo conversation.
- Media: S3-compatible object storage; MinIO dùng được cho self-hosted/local.
- Frontend preview có thể chạy trên GitHub Pages; backend production phải chạy ở hạ tầng server/container riêng.

## Frontend
- Không trình bày seller/trust/rating/tin minh họa như dữ liệu thật.
- Mọi authenticated action đi qua `assets/core/backend.js` và service layer.
- Access token chỉ giữ trong memory; refresh token nằm trong HttpOnly cookie do backend cấp.
- Không lưu access/refresh token trong `localStorage` hoặc `sessionStorage`.
- Loading, empty, error, offline và unauthorized state phải có xử lý.
- Public SEO entity pages giữ HTML crawlable; account/chat/admin và listing động hiện tại phải noindex cho tới khi có URL SSR/canonical riêng.
- Mobile, keyboard, accessibility và Core Web Vitals phải được kiểm trước production release.

## Auth và identity
- OTP email/phone phải dùng provider production; nếu chưa cấu hình backend phải fail closed.
- OTP challenge lưu target hash + code hash, giới hạn attempt và rate limit.
- Refresh token phải hash trong DB, rotation khi refresh và revoke khi logout.
- OTP liên kết số điện thoại seller phải tách khỏi OTP đăng nhập để không chuyển nhầm account.
- Seller chỉ `VERIFIED` khi phone + identity + bank đều được backend/provider xác nhận.
- Raw CCCD/selfie/liveness và thông tin tài khoản ngân hàng đầy đủ không được public hoặc chuyển thẳng vào browser database.
- Webhook eKYC production phải xác minh chữ ký/replay theo chuẩn chính thức của provider đã chọn.

## Database
- Prisma schema là source of truth; mọi thay đổi schema đi qua migration có version trong Git.
- CI phải chạy `prisma migrate deploy` trên PostgreSQL thật trước khi merge/release.
- Browser không được tự ghi moderation state, trust score, rating, counter hay system role.
- Listing lifecycle được kiểm phía backend: `DRAFT -> PENDING_REVIEW -> ACTIVE/RESERVED/SOLD/...`.
- Audit log bắt buộc cho moderation và các state transition nhạy cảm.
- Backup và restore PostgreSQL phải được test định kỳ trước launch lớn.

## Storage
- Seller upload vào private bucket bằng presigned URL giới hạn thời gian/path.
- Backend xác minh listing ownership, MIME, byte size và số lượng ảnh.
- Server decode/re-encode ảnh bằng Sharp để bỏ EXIF/GPS và tạo derivative an toàn.
- Hash ảnh phục vụ duplicate/fraud detection.
- Chỉ derivative đã moderation mới được đưa sang public bucket.
- Client không có credential ghi trực tiếp vào public bucket.

## Chat và abuse controls
- Conversation chỉ được tạo từ listing thật; seller ID luôn lấy từ database, không tin input browser.
- Chỉ buyer/seller thuộc conversation mới join Socket.IO room hay đọc lịch sử.
- Block hai chiều phải được kiểm server-side.
- Redis rate-limit chat, OTP và các endpoint abuse-prone.
- Report workflow do backend quản lý; client không được tự thay status/resolution.

## Moderation
- `MODERATOR`/`ADMIN` là role server-owned.
- Approve listing bắt buộc seller VERIFIED và tối thiểu 2 ảnh approved.
- Approve/reject/needs-review/suspend phải tạo audit record.
- Duplicate-image hash, pricing anomaly, report queue và evidence phải review được.

## Observability và recovery
- API structured logs + error monitoring production.
- Auth/moderation/storage failures phải searchable nhưng không log OTP, token, raw KYC hay secret.
- Database/storage backup, restore runbook và disaster recovery phải test.
- Health/readiness endpoint dùng cho deploy orchestration.

## CI / deployment gate
Release chỉ được xem là đạt khi:
1. `python qa/site_audit.py` trả 0 error/0 warning.
2. JavaScript syntax + browser secret scan pass.
3. `npm ci` dùng lockfile đã commit.
4. Prisma generate + validate pass.
5. `prisma migrate deploy` pass trên PostgreSQL test thật.
6. Nest build pass.
7. API khởi động với PostgreSQL + Redis và `/api/v1/health` pass.
8. Integration smoke pass: OTP dev -> login -> `/me` -> create draft -> unauthorized lifecycle bị chặn đúng.
9. Docker image/build/deploy production pass.
10. Production secrets chỉ nằm trong secret manager/environment của server, không commit vào repo.

## External blockers không được giả lập thành production
- SMS/email OTP provider production và credentials.
- eKYC/bank-name provider contract + provider-specific signed webhook validation.
- VPS/container host, PostgreSQL/Redis/object-storage production và backup destination.
- Production domain ownership/DNS/TLS.
- Thông tin pháp nhân/kênh khiếu nại/thủ tục TMĐT cần cho launch.
- Monitoring/analytics/search-console production.

Cho tới khi các blocker bên ngoài này được nối và test thật, repository có thể đạt **production-grade code/readiness**, nhưng không được gọi là **production live 100%**.
