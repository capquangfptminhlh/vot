# ChoVot Pickleball

ChoVot là chợ đăng tin chuyên vợt pickleball tại Việt Nam, tập trung vào 3 giá trị: **người bán được xác thực, thông tin cây vợt có cấu trúc, liên hệ trực tiếp**.

## Mô hình sản phẩm
- Người mua: tìm kiếm, lọc, xem thông số/tình trạng, xem trust state người bán, yêu thích, báo cáo và nhắn trực tiếp.
- Người bán: tạo nháp, tải ảnh riêng tư, xác thực SĐT + danh tính + đối chiếu tên tài khoản ngân hàng, gửi tin kiểm duyệt và tự đánh dấu đã bán.
- ChoVot: nền tảng đăng tin/kết nối; **không giữ tiền, không tạo đơn hàng, không giao vận, không thu tiền hộ** trong mô hình hiện tại.

## Kiến trúc
### Frontend
- HTML/CSS/JavaScript responsive, mobile web-app shell.
- Browser chỉ gọi ChoVot REST API + Socket.IO; không truy cập database trực tiếp.
- Access token chỉ ở memory; refresh token dùng HttpOnly cookie.
- GitHub Pages hiện dùng làm preview frontend.

### Backend
- Node.js 22 + NestJS 11.
- PostgreSQL + Prisma 7, migrations versioned trong `backend/prisma/migrations`.
- Redis cho rate-limit/realtime support.
- S3-compatible storage; MinIO cho local/self-hosted.
- Socket.IO cho chat realtime có JWT + conversation authorization.
- Sharp xử lý ảnh: decode/re-encode WebP, bỏ metadata, hash chống ảnh trùng trước khi public.
- Docker Compose local stack: PostgreSQL + Redis + MinIO + API.

## Trust & Safety
- Listing luôn tạo ở `DRAFT`; browser không được tự chọn system status.
- Submit bắt buộc seller VERIFIED + tối thiểu 2 ảnh.
- Seller VERIFIED chỉ khi phone + identity + bank đều được backend/provider xác nhận.
- Raw serial được hash; public chỉ dùng hint/trạng thái cần thiết.
- Chat lấy seller từ listing trong database, không tin seller ID do browser truyền.
- Report, favorite counter, moderation state, role và audit log đều do backend quản lý.
- Moderator/admin action được authorize server-side và ghi audit.

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

Frontend local có thể chạy bằng bất kỳ static server nào; `assets/runtime-config.js` cần `apiBaseUrl` trỏ vào API local/production phù hợp.

## Quality gates
Frontend/static:
```bash
python qa/site_audit.py
```

Backend CI hiện kiểm:
- dependency install từ `package-lock.json`;
- Prisma generate + validate;
- `prisma migrate deploy` lên PostgreSQL test thật;
- Nest build;
- API boot + health;
- OTP dev login -> `/me` -> tạo listing draft;
- submit draft chưa KYC phải bị backend từ chối đúng.

## Chưa được gọi là production live 100% cho tới khi
- Có hạ tầng backend production thật: API host/VPS, PostgreSQL, Redis, S3-compatible object storage + backup.
- Có OTP email/SMS provider production.
- Có eKYC/bank-name provider production và webhook validation đúng chuẩn provider.
- Có domain/DNS/TLS production được xác nhận.
- Có monitoring/logging/alert/backup-restore đã test.
- Điền thông tin pháp nhân/kênh khiếu nại và hoàn tất nghĩa vụ TMĐT áp dụng trước launch.

Không có cam kết “Top 1 Google”. Mục tiêu là xây UX, trust, dữ liệu và topical coverage đủ mạnh để cạnh tranh vị trí dẫn đầu dựa trên dữ liệu thật sau launch.
