---
name: frame-compositor
description: Hướng dẫn xử lý khung ảnh, tách lớp PNG transparency, tự động căn crop ảnh và ghép ảnh đa khung (strip 2x6, 4x6).
---

# 🖼️ Frame Compositor Skill — JoyBooth

## Mục tiêu
Tự động ghép ảnh chụp (1 tấm hoặc chuỗi 3–4 tấm) vào các mẫu khung viền sự kiện (PNG Frame):
- Tự động scale và center-crop ảnh để vừa vặn slot mà không làm méo mặt người.
- Hỗ trợ khung viền PNG có vùng trong suốt (Alpha channel).
- Xuất file chất lượng cao (300 DPI) sẵn sàng cho máy in hoặc chia sẻ mạng xã hội.

## Quy cách Chuẩn Khung Hình Photobooth
1. **Dải Strip 2x6 inch:** 600 x 1800 px (300 DPI) hoặc 1200 x 3600 px (600 DPI)
2. **Khổ Đơn 4x6 inch:** 1200 x 1800 px hoặc 1800 x 1200 px
3. **Khổ Vuông 5x5 inch / Kiosk:** 1500 x 1500 px

## Endpoint
- `POST /composite`:
  ```json
  {
    "imagePath": "f:/JoyBooth/data/enhanced/enhanced_xxx.jpg",
    "framePath": "f:/JoyBooth/data/frames/event_frame_1.png"
  }
  ```
