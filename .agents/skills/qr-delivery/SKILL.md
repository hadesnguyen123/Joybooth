---
name: qr-delivery
description: Hướng dẫn tạo mã QR tức thì cho khách quét tải ảnh về điện thoại (hỗ trợ cả Offline LAN Hotspot và Online Cloud CDN).
---

# 📱 QR Delivery Skill — JoyBooth

## Mục tiêu
Tối ưu trải nghiệm nhận ảnh của khách mời:
1. **Chế độ Online (Cloud CDN):** Tự động upload ảnh lên Firebase Storage / S3 / Cloudinary và sinh link QR code tải ảnh trực tiếp về điện thoại với giao diện mobile gallery.
2. **Chế độ Offline (LAN Hotspot / Localhost):** Khi sự kiện không có Internet, Photobooth phát WiFi Hotspot cục bộ. Khách kết nối WiFi quét mã QR trỏ thẳng tới IP máy tính booth (vd: `http://192.168.1.100:8000/download/xxx`) để lưu ảnh ngay lập tức mà không cần 4G.

## Endpoints
- `POST /qr/generate`: Nhận `sessionId` và `imagePath`, trả về URL và file ảnh QR PNG để render lên màn hình ReviewScreen.
