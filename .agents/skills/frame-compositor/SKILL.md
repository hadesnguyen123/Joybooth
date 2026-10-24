---
name: frame-compositor
description: Hướng dẫn xử lý bố cục khung ảnh, ghép ảnh đa ô (Strip 2x6 kép, Khổ đơn 4x6 300 DPI), cắt crop căn chỉnh khuôn mặt thông minh và xuất file in Fotolism 3.0.
---

# 🖼️ Frame Compositor Skill — Fotolism 3.0

Hướng dẫn chuẩn hóa quy trình ghép ảnh chụp của khách vào khung viền sự kiện (Event Frames), căn chỉnh tỷ lệ quang học và xuất file in chuẩn máy in nhiệt 300 DPI.

---

## 1. Quy Cách Khổ In & Bố Cục Tiêu Chuẩn

| Khổ Bố Cục | Kích Thước Pixel (300 DPI) | Quy Cách Ghép Ảnh | Dòng Máy In Mục Tiêu |
| :--- | :--- | :--- | :--- |
| **Dải Kép 2x6 Strip (Dual Strip)** | `1200 x 1800 px` | Gồm 2 dải 2x6 (mỗi dải `600 x 1800 px`) đặt cạnh nhau song song, chứa 3 hoặc 4 ô ảnh giống hệt nhau | DNP DS-RX1HS (Driver tự động cắt đôi 2-inch cut) |
| **Khổ Đơn 4x6 Dọc (Portrait Postcard)** | `1200 x 1800 px` | Khung 1 ô lớn, hoặc lưới 2 ô, 4 ô (2x2), 6 ô | DNP RX1HS, HiTi P525L, Canon Selphy |
| **Khổ Đơn 4x6 Ngang (Landscape Postcard)**| `1800 x 1200 px` | Bố cục ngang 1 ô đại diện hoặc 4 ô xếp hàng | Tiệc cưới, sự kiện công ty |
| **Khổ Vuông 5x5 / Kiosk** | `1500 x 1500 px` | 1 ô vuông nghệ thuật hoặc 4 ô cân xứng | Chia sẻ Instagram, Facebook |

---

## 2. Kiến Trúc Pipeline Ghép Ảnh Đa Lớp (Multi-Layer Compositor)

Mỗi bức ảnh hoàn thiện được tổng hợp theo thứ tự từ dưới lên trên:

```
[ LỚP 4: NƯỚC MỰC / OVERLAY ] ──► PNG Khung viền sự kiện (Logo, Hoa văn, Họa tiết trong suốt)
           ▲
[ LỚP 3: TEXT / STICKER ]    ──► Chữ kỷ niệm, ngày tháng, Icon sticker do khách dán
           ▲
[ LỚP 2: ẢNH CHỤP ĐÃ CROP ]  ──► Ảnh Canon 24MP sau khi căn giữa theo khuôn mặt (Face-Aware Crop)
           ▲
[ LỚP 1: PHÔNG NỀN (BASE) ]  ──► Màu nền trắng / đen hoặc hoa văn nền dưới cùng
```

---

## 3. Thuật Toán Căn Crop Thông Minh (Face-Aware Center Crop)

Khi ảnh gốc từ cảm biến Canon có tỷ lệ 3:2 (6000x4000) cần ghép vào các ô khung có tỷ lệ khác nhau (như 4:3, 1:1, hoặc 16:9):

1. **Tránh biến dạng hình học**:
   - Tuyệt đối giữ nguyên tỷ lệ khung hình (Aspect Ratio), **không kéo giãn méo mặt (no stretching)**.
2. **Căn crop ưu tiên khuôn mặt (Face-Aware Positioning)**:
   - Sử dụng tọa độ bounding box khuôn mặt từ MediaPipe:
     - Nếu tâm khuôn mặt nằm lệch lên phía trên: Căn crop neo theo trục đỉnh đầu (Top Anchor) để không cắt mất tóc hoặc vương miện.
     - Nếu chụp nhóm đông người: Tính toán trọng tâm trung bình của toàn bộ các khuôn mặt để crop cân xứng hai bên.

---

## 4. Quy Chuẩn Xuất File & In Ấn

- **Hệ màu chuẩn**: sRGB (được máy in nhiệt DNP/HiTi diễn giải màu sắc chính xác nhất).
- **Mật độ điểm ảnh**: Tối thiểu `300 DPI` (Dots Per Inch).
- **Chất lượng nén**: JPEG Quality `98%` (đảm bảo không xuất hiện răng cưa nén khối mà file vẫn lưu nhanh dưới 200ms).
- **Cơ chế lưu trữ song song**:
  - Bản xuất in: `F:\Fotolism_image\sessions\<sessionId>\composite_print.jpg`
  - Bản xem trên điện thoại (đã nén nhẹ tối ưu tải về): `F:\Fotolism_image\sessions\<sessionId>\composite_web.jpg`
