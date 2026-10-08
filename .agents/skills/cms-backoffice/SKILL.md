---
name: cms-backoffice
description: Hướng dẫn quản trị hệ thống Cloud CMS, giám sát Kiosks đa điểm, đồng bộ khung hình, bảng giá và kế toán đối soát doanh thu JoyBooth.
---

# ☁️ CMS Backoffice & Cloud Accounting Skill — JoyBooth

## Mục tiêu
Quản trị toàn diện mạng lưới Kiosks Photobooth từ xa thông qua nền tảng Web CMS Cloud tập trung:
- Giám sát trạng thái hoạt động theo thời gian thực (Online/Offline, Heartbeat, bộ đếm giấy in cuộn, nhiệt độ phần cứng).
- Đồng bộ bảng giá gói chụp (2x6, 4x6, in thêm) và mã giảm giá/voucher ưu đãi xuống tất cả máy trạm.
- Quản lý kho khung hình (Frame PNG overlays), bố cục (Layouts), bộ lọc màu và sticker trang trí.
- Kế toán tập trung & Đối soát 3 góc: Doanh thu VietQR ngân hàng vs Tiền mặt nhân viên thu vs Giấy in tiêu hao thực tế.

## Kiến Trúc Dữ Liệu Cốt Lõi
1. **Thiết bị (`kiosks`)**: Mã máy (`KIOSK_01`, `KIOSK_02`), tên cơ sở, trạng thái online, số giấy in còn lại trong khay.
2. **Phiên chụp (`sessions`)**: Lịch sử phiên chụp, khổ in, số lượng ảnh, link ảnh Google Drive / Cloud storage.
3. **Giao dịch (`transactions`)**: Mã giao dịch (`JBxxxxxx`), số tiền thanh toán, hình thức (`vietqr` / `cash`), mã giảm giá.
4. **Cấu hình (`configs`)**: Bảng giá dịch vụ, danh sách mã voucher, danh mục khung ảnh kích hoạt.

## Giao Tiếp Kiosk ⇄ Cloud (Offline-First)
- `POST /api/kiosk/heartbeat`: Máy trạm gửi ping mỗi 60s kèm trạng thái cuộn giấy.
- `GET /api/kiosk/config`: Máy trạm kéo bảng giá và mã giảm giá mới nhất về lưu cache SQLite.
- `POST /api/kiosk/session`: Máy trạm đồng bộ kết quả phiên chụp và giao dịch thanh toán lên Cloud.
