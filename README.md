# ChoVot Pickleball

ChoVot là chợ đăng tin chuyên vợt pickleball tại Việt Nam, tập trung vào 3 giá trị: **người bán được xác thực, thông tin cây vợt có cấu trúc, liên hệ trực tiếp**.

## Mô hình sản phẩm
- Người mua: tìm kiếm, lọc, xem thông số/tình trạng, xem trust state người bán, yêu thích, báo cáo và nhắn trực tiếp.
- Người bán: tạo nháp, tải ảnh riêng tư, xác thực SĐT + danh tính + đối chiếu tên tài khoản ngân hàng, gửi tin kiểm duyệt và tự đánh dấu đã bán.
- ChoVot: nền tảng đăng tin/kết nối; **không giữ tiền, không tạo đơn hàng, không giao vận, không thu tiền hộ** trong mô hình hiện tại.

## Kiến trúc
### Frontend
- HTML/CSS/JavaScript responsive, mobile web-app shell.
- Browser chỉ gọi ChoVot REST API + Socket.IO; không truy cập database/BaaS trực tiếp.
- Access token chỉ ở memory; refresh token dùng HttpOnly + Secure + SameSite cookie ở production.
- Production frontend được đóng gói trong `deploy/Dockerfile.web` và phục vụ cùng domain với API qua Caddy.
- GitHub Pages chỉ là **preview frontend**, không phải hạ tầng production.

### Backend
- Node.js 22 + NestJS 11.
- PostgreSQL + Prisma 7, migrations versioned trong `backend/prisma/migrations`.
- Redis cho rate-limit và realtime support.
- S3-compatible storage; MinIO cho local/self-hosted production.
- Socket.IO cho chat realtime có JWT + conversation authorization.
- Sharp xử lý ảnh: decode/re-encode WebP, bỏ metadata, hash chống ảnh trùng trước khi public.
- Backend không phụ thuộc Supabase.

### Production self-hosted
`docker-compose.production.yml` dựng stack riêng:
- Caddy edge: public 80/443 duy nhất;
- Nest API: private Docker network;
- PostgreSQL: private network, không publish 5432;
- Redis có password: private network, không publish 6379;
- MinIO: private network, không publish console/API trực tiếp;
- migration one-shot chạy trước API;
- signed upload dùng storage subdomain HTTPS;
- public image chỉ đi qua bucket sanitized/public.

Runbook đầy đủ: [`docs/PRODUCTION_DEPLOY.md`](docs/PRODUCTION_DEPLOY.md).

## Trust & Safety
- Listing luôn tạo ở `DRAFT`; browser không được tự chọn system status.
- Submit bắt buộc seller VERIFIED + tối thiểu 2 ảnh.
- Seller VERIFIED chỉ khi phone + identity + bank đều được backend/provider xác nhận.
- Seller `SUSPENDED` không thể tự trở lại VERIFIED do callback KYC.
- Raw serial được hash; public chỉ dùng hint/trạng thái cần thiết.
- Chat lấy seller từ listing trong database, không tin seller ID do browser truyền.
- Report, favorite counter, moderation state, role và audit log đều do backend quản lý.
- Moderator/admin action được authorize server-side và ghi audit.
- OTP có quota theo target + IP; OTP không giao được sẽ bị vô hiệu challenge ngay.

## Các trang/giao diện hiện có
- Trang chủ desktop + mobile web-app.
- Chợ tìm vợt với filter.
- Chi tiết tin đăng + trust seller.
- Form đăng bán nhiều thông số + ảnh.
- Tài khoản và listing lifecycle.
- OTP email/phone UI.
- Seller verification UI.
- Chat realtime adapter.
- Admin moderation console.
- Công cụ định giá tham khảo.
- Brand/model SEO entities + FAQ/AEO foundations.

## Local backend
```bash
cp backend/.env.example backend/.env
# thay secret dev nếu cần
docker compose up --build
```

API health:
```text
GET http://localhost:3000/api/v1/health
```

Frontend local có thể chạy bằng static server; `assets/runtime-config.js` cần `apiBaseUrl` trỏ vào API local phù hợp.

## Quality gates
Frontend/static:
```bash
python qa/site_audit.py
```

Backend CI kiểm:
- dependency install từ `package-lock.json`;
- Prisma generate + validate;
- migration lên PostgreSQL test thật;
- Nest build + Jest;
- API boot + health/readiness;
- OTP dev login -> `/me` -> tạo listing draft;
- submit draft chưa KYC phải bị backend từ chối đúng;
- regression test cho trust/suspension.

Container/deploy CI kiểm:
- cú pháp `deploy/backup.sh` và `deploy/restore.sh`;
- local + production Compose;
- API runtime image;
- Prisma migration image;
- frontend Caddy image;
- production Caddy config;
- frontend image không chứa `backend/`, `docs/` hay `qa/`.

## Backup/restore
- `deploy/backup.sh`: backup PostgreSQL + private/public MinIO + checksum + commit metadata.
- `deploy/restore.sh`: verify checksum, restore DB/object storage, migrate forward rồi mới mở API/web.
- `.env*`, dumps và thư mục backup được `.gitignore` chặn khỏi Git.

## Chưa được gọi là production live 100% cho tới khi
- VPS production thật được cấu hình và stack `docker-compose.production.yml` chạy trên đó.
- Domain/DNS/TLS production được xác nhận.
- OTP email/SMS provider production được kết nối và test thật.
- eKYC/bank-name provider production + webhook contract được kết nối và test thật.
- Browser E2E toàn luồng bằng hai user thật pass trên production: login -> KYC -> đăng tin -> upload ảnh -> moderation -> public listing -> favorite/report/chat -> sold.
- Backup được copy off-host và restore drill đã pass.
- Monitoring/logging/alerting production hoạt động.
- Điền thông tin pháp nhân/kênh khiếu nại và hoàn tất nghĩa vụ TMĐT/quyền riêng tư áp dụng trước launch.
- Dữ liệu catalog và listing thật đủ chất lượng để thay toàn bộ dữ liệu minh họa.

Không có cam kết “Top 1 Google”. Mục tiêu là xây UX, trust, dữ liệu và topical coverage đủ mạnh để cạnh tranh vị trí dẫn đầu dựa trên dữ liệu thật sau launch.
