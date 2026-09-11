# ChoVot Pickleball

ChoVot là chợ đăng tin chuyên vợt pickleball tại Việt Nam, tập trung vào 3 giá trị: **người bán được xác thực, thông tin cây vợt có cấu trúc, liên hệ trực tiếp**.

## Mô hình sản phẩm hiện tại
- Người mua: tìm kiếm, lọc, xem thông số/tình trạng, xem hồ sơ người bán, nhắn/gọi trực tiếp.
- Người bán: bắt buộc xác thực SĐT + danh tính + đối chiếu tài khoản ngân hàng trước khi đăng công khai.
- ChoVot: cung cấp nền tảng đăng tin/kết nối; **không giữ tiền, không tạo đơn hàng, không giao vận, không thu tiền hộ** trong mô hình hiện tại.

## Giao diện hiện có
- Trang chủ responsive desktop + mobile web-app
- Chợ tìm vợt với lọc hãng/tình trạng/độ dày/lối chơi/giá
- Chi tiết tin đăng và hồ sơ người bán
- Form đăng bán với hãng, model, thông số, tình trạng, serial/NFC, chứng từ và ảnh
- Tin nhắn trực tiếp
- Công cụ định giá tham khảo
- Xác thực người bán (prototype UI)
- SEO foundations: title/meta/canonical/schema/robots/sitemap
- Website OS bootstrap + K0/D-Pre/D0 evidence

## Production blockers
Bản hiện tại vẫn là **front-end prototype tĩnh**. Trước khi launch thật cần hoàn tất:
1. Backend + database cho tài khoản, tin đăng, ảnh, tin nhắn, favorites, report/moderation và trạng thái đã bán.
2. Auth thật + rate limit + anti-spam.
3. KYC/đối chiếu ngân hàng qua nhà cung cấp phù hợp; không lưu CCCD/selfie thô trong front-end/localStorage.
4. Admin moderation, report scam, duplicate listing, prohibited/counterfeit workflow.
5. Hoàn thiện thông tin pháp nhân, quy chế hoạt động và thủ tục đăng ký website cung cấp dịch vụ TMĐT phù hợp quy định hiện hành.
6. Chính sách dữ liệu cá nhân, retention/deletion, consent và quy trình xử lý yêu cầu chủ thể dữ liệu.
7. Domain/hosting production, Search Console, analytics, monitoring, backup và security headers.

## Quality
Chạy `python qa/site_audit.py` để kiểm tra link nội bộ, SEO cơ bản, stale transaction flow, fake contact, sitemap/robots và các trang bắt buộc.

Không có tuyên bố hay đảm bảo Top 1. Mục tiêu là xây sản phẩm có UX, trust, data quality và topical coverage đủ mạnh để cạnh tranh vị trí dẫn đầu bằng dữ liệu thực tế sau launch.
