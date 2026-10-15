# 🖥️ JOYBOOTH — BẢNG ĐẶC TẢ CẤU HÌNH PHẦN CỨNG & HƯỚNG DẪN DEPLOYMENT
> **Phiên bản:** 1.0 (Chuẩn hóa cho Kiosk Photobooth & Selfbooth)  
> **Áp dụng cho:** Hệ thống JoyBooth Kiosk Engine (Electron + WebGL Shaders + MediaPipe Face Mesh)  
> **Ngân sách tối ưu:** 20.000.000 VNĐ cho cụm 3 máy (2 Photobooth + 1 Selfbooth, chưa bao gồm màn hình)

---

## 📌 1. ĐẶC TÙ TẢI TÀI NGUYÊN CỦA JOYBOOTH
Để phần mềm vận hành ổn định 24/7 không giật lag, phần cứng phải đáp ứng các tác vụ chạy đồng thời:
1. **Live Camera Preview 60 FPS**: Luồng video 1080p từ USB Webcam hoặc DSLR.
2. **Real-time AI Face Mesh (MediaPipe Tasks Vision)**: Bắt 468 điểm tọa độ trên khuôn mặt (tối đa 4 người cùng lúc) thông qua WebAssembly SIMD + GPU Delegate.
3. **WebGL GPU Shaders**: Tính toán biến dạng thon gọn cằm V-line cục bộ, thuật toán làm mịn da Bilateral Filter, nâng tone trắng hồng và phân vùng da người trong không gian màu YCbCr.
4. **Hi-Res Canvas Compositor**: Ghép khung ảnh độ phân giải in 300 DPI (1200x1800px hoặc 1800x2400px) tức thì trong dưới 2.5 giây.
5. **Hardware Video Encoding**: Ghi hình video Timelapse (WebM VP8/VP9) ngầm trong suốt buổi chụp.

---

## 🎯 2. CẤU HÌNH CHÍNH THỨC CHO DỰ ÁN (NGÂN SÁCH 20 TRIỆU CHO 3 MÁY)

### 🟢 2.1. Cấu hình cho 2 Máy Kiosk Photobooth (~6.1 triệu VNĐ / máy)
*Phục vụ Kiosk tự động đếm ngược, chụp liên tục và in ảnh ngay tại quầy.*

| Linh kiện | Thông số chi tiết | Đơn giá ước tính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **CPU** | **AMD Ryzen 5 4600G** (6 nhân, 12 luồng, xung 3.7 - 4.2GHz) | ~2.100.000 đ | Tích hợp iGPU Radeon Vega 7 (448 nhân đồ họa), xử lý WebGL Shader mượt gấp đôi Intel UHD cùng giá. |
| **Mainboard** | **A520M** (Asus Prime A520M-K / MSI A520M-A Pro / Asrock) | ~1.350.000 đ | Có ít nhất 6 cổng USB phía sau, hỗ trợ PCIe 3.0 NVMe. |
| **RAM** | **16GB DDR4 (2x8GB) Bus 3200MHz** (Kingston Fury / Lexar / G.Skill) | ~800.000 đ | **BẮT BUỘC cắm Dual Channel (2 thanh)** để mở khóa 100% băng thông cho iGPU Vega 7. |
| **Ổ cứng** | **512GB NVMe M.2 PCIe Gen 3x4** (Kingston NV2 / Lexar / Kioxia) | ~850.000 đ | Tốc độ đọc/ghi > 2000 MB/s, lưu frame và timelapse nhanh không nghẽn. |
| **Nguồn (PSU)** | **450W Chuẩn 80 Plus** (Xigmatek X-Power III / Aigo VK450 / Mik) | ~550.000 đ | Công suất thực, tải hệ thống chỉ ~120W nên nguồn luôn mát và bền bỉ. |
| **Vỏ Case** | **Case M-ATX Compact** văn phòng nhỏ gọn (Kenoo / Xigmatek) | ~450.000 đ | Gọn gàng để lắp lọt vào thùng Kiosk gỗ/kim loại. |
| **Tổng chi phí 1 Kiosk** | | **~6.100.000 đ** | **2 máy = ~12.200.000 đ** |

---

### 🔵 2.2. Cấu hình cho 1 Máy Selfbooth Studio (~7.6 triệu VNĐ)
*Dành cho phòng chụp tự do với máy ảnh DSLR/Mirrorless, màn hình xem trước lớn và số lượng ảnh chụp mỗi phiên cao.*

| Linh kiện | Thông số chi tiết | Đơn giá ước tính | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **CPU** | **AMD Ryzen 5 5600G** (6 nhân, 12 luồng, kiến trúc Zen 3, xung tới 4.4GHz) | ~2.800.000 đ | IPC mạnh hơn 20%, Vega 7 xung nhịp 1900MHz gánh tốt màn hình lớn và file ảnh lớn. |
| **Mainboard** | **B450M hoặc B550M** (MSI B450M-A Pro Max / Asus Prime B550M) | ~1.600.000 đ | VRM tản nhiệt tốt, nhiều cổng USB 3.2 băng thông cao cho DSLR. |
| **RAM** | **16GB DDR4 (2x8GB) Bus 3200MHz** | ~800.000 đ | Dual Channel ổn định cho xử lý đa luồng. |
| **Ổ cứng** | **1TB NVMe M.2 PCIe Gen 3/4** (Kingston NV2 / Kioxia G2) | ~1.350.000 đ | **Dung lượng 1TB** để lưu trữ kho ảnh khách chụp tự do (40 - 80 ảnh/phiên). |
| **Nguồn (PSU)** | **500W – 550W Chuẩn 80 Plus Bronze** | ~650.000 đ | Dự phòng cấp nguồn ổn định nếu sau này gắn thêm card đồ họa rời. |
| **Vỏ Case** | **Case M-ATX mặt lưới thoáng khí** | ~400.000 đ | Đảm bảo nhiệt độ CPU luôn dưới 60°C khi hoạt động liên tục. |
| **Tổng chi phí Selfbooth** | | **~7.600.000 đ** | |

👉 **TỔNG CỘNG CẢ 3 MÁY: 12.200.000đ + 7.600.000đ = 19.800.000 VNĐ** *(Vừa khít ngân sách 20 triệu).*

---

### 🟣 2.3. Phương án thay thế: Đồng bộ 3 chiếc Mini PC (Siêu gọn cho Kiosk hẹp)
Nếu thùng Kiosk đóng sẵn có khoang chứa máy tính quá chật (chiều sâu dưới 15cm):
* **Model khuyến nghị**: **Beelink SER5** hoặc **Minisforum UN100 / Morefine**
* **Thông số**: AMD Ryzen 5 5500U / 5600H, RAM 16GB DDR4, SSD 512GB NVMe.
* **Kích thước**: 11.5 x 10.2 x 4.1 cm (gắn trực tiếp sau lưng màn hình qua ngàm VESA).
* **Giá thị trường**: ~6.300.000đ – 6.600.000đ / máy.
* **Tổng 3 máy**: **~19.500.000 VNĐ**.

---

## ⚡ 3. NGUYÊN TẮC PHẦN CỨNG "SỐNG CÒN" KHI VẬN HÀNH KIOSK

1. **BẮT BUỘC RAM DUAL CHANNEL (2 x 8GB)**:
   * GPU tích hợp (Radeon Vega 7) lấy một phần RAM hệ thống làm bộ nhớ VRAM.
   * Nếu chỉ cắm 1 thanh 16GB (Single Channel), băng thông bộ nhớ bị giảm một nửa, dẫn đến FPS camera preview tụt xuống 25-30 FPS và hình ảnh soi gương bị trễ (delay).
2. **CẤU HÌNH TỰ ĐỘNG BẬT MÁY (AUTO POWER ON KHI CÓ ĐIỆN)**:
   * Vào BIOS (nhấn phím `Del` hoặc `F2` lúc khởi động):
   * Tìm mục **Advanced / Power Management Setup** -> Chọn **Restore on AC Power Loss** (hoặc `AC Back`) -> Chuyển thành **Always On** (hoặc `Power On`).
   * *Ý nghĩa*: Khi nhân viên bật cầu dao điện Kiosk vào buổi sáng, máy tính sẽ **tự động khởi động và vào thẳng phần mềm JoyBooth**, không cần mở thùng Kiosk bấm nút nguồn thủ công.
3. **CỔNG KẾT NỐI USB & BĂNG THÔNG**:
   * Thiết bị cắm vào Kiosk: (1) Máy in nhiệt DNP/HiTi, (2) Webcam Full HD, (3) Màn hình cảm ứng (cáp USB touch), (4) Thiết bị quẹt thẻ/QR.
   * Cắm Webcam và Máy in vào **các cổng USB 3.0/3.2 màu xanh phía sau mainboard**.
   * Nếu dùng Mini PC thiếu cổng, phải mua **Hub USB 3.0 có nguồn phụ riêng (Powered USB Hub)** để tránh sụt áp gây đứt kết nối camera giữa chừng.
4. **HỆ ĐIỀU HÀNH & CHỐNG TỰ KHỞI ĐỘNG LẠI**:
   * Sử dụng **Windows 10 IoT Enterprise LTSC** hoặc **Windows 11 Pro 64-bit**.
   * Bật Group Policy (`gpedit.msc`): Tắt tính năng tự động khởi động lại khi có bản cập nhật (`No auto-restart with logged on users for scheduled automatic updates installations = Enabled`).

---

## 🛠️ 4. BẢNG CHECKLIST KIỂM THỬ PHẦN CỨNG TRƯỚC KHI BÀN GIAO BOOTH

- [ ] **Kiểm tra FPS Camera**: Mở màn hình chụp, camera đạt ổn định 55–60 FPS khi cử động mặt.
- [ ] **Kiểm tra Face Mesh**: Nhận diện đồng thời 2–4 người trong khung hình, cằm V-line co tự nhiên bám theo mặt, không méo khung cảnh xung quanh.
- [ ] **Kiểm tra Tốc độ Chụp & In**: Bấm chụp 4 ảnh -> Chọn filter -> Bấm in: thời gian render dải ảnh dưới 2.5 giây.
- [ ] **Kiểm tra Chạy Tải (Burn-in Test)**: Chạy thử liên tục 4 tiếng, kiểm tra nhiệt độ CPU dưới 65°C trong thùng Kiosk đóng kín.
