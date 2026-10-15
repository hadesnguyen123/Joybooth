# 📸 JoyBooth Desktop Kiosk Application

Ứng dụng Photobooth & Selfbooth chuyên nghiệp vận hành trên nền tảng **Electron + React 19 + TypeScript + Vite + WebGL GPU Shaders**.

---

## 🚀 Tính Năng Chính
- **Real-time K-Beauty Camera**: WebGL GLSL Shader chạy 60 FPS trên GPU (Làm mịn da Bilateral, nâng tone trắng sáng, trắng hồng má đào, độ nét chi tiết).
- **MediaPipe AI Face Tracking (100% Offline)**: Nhận diện 468 điểm tọa độ khuôn mặt theo thời gian thực (tối đa 4 người cùng lúc) để thon gọn cằm V-line chuẩn xác bám theo chuyển động thực tế.
- **2 Chế độ chụp chuyên nghiệp**:
  - **Photobooth cổ điển**: Đếm ngược tự động, chụp theo lượt, cho phép xóa ô chụp chưa ưng ý để chụp lại (Retake).
  - **Selfbooth tự do**: Khách tự cầm remote chụp không giới hạn trong thời gian quy định, sau đó chọn ảnh đẹp nhất vào khung.
- **Bộ lọc màu thời thượng (`FilterScreen`)**: 11 preset phong cách Hàn Quốc (*Film Kodak, Hồng Pastel, Haru Soft, Retro 90s, v.v.*).
- **Hệ thống Quản trị Kiosk (`AdminScreen`)**: Điều chỉnh thông số làm đẹp với gương soi trực tiếp, cấu hình bảng giá, camera, máy in và khóa máy an toàn.

---

## 🖥️ Cấu Hình Phần Cứng Khuyến Nghị (Ngân Sách 20 Triệu / 3 Máy)
> Chi tiết toàn bộ cấu hình, bảng giá linh kiện và lưu ý kỹ thuật xem tại:  
> 📄 **[HARDWARE_SPECIFICATION_AND_DEPLOYMENT_GUIDE.md](../HARDWARE_SPECIFICATION_AND_DEPLOYMENT_GUIDE.md)**

* **2 Máy Kiosk Photobooth (~6.1 triệu / máy)**:
  - CPU: AMD Ryzen 5 4600G (6C/12T, Radeon Vega 7)
  - RAM: 16GB (2x8GB) DDR4 3200MHz Dual Channel
  - SSD: 512GB NVMe M.2
  - Nguồn: 450W 80 Plus, Mainboard A520M
* **1 Máy Selfbooth Studio (~7.6 triệu)**:
  - CPU: AMD Ryzen 5 5600G (Vega 7 Zen 3)
  - RAM: 16GB (2x8GB) DDR4 3200MHz Dual Channel
  - SSD: 1TB NVMe M.2 (chứa kho ảnh lớn từ DSLR)
  - Nguồn: 500W 80 Plus, Mainboard B450M / B550M
* **Hoặc Phương án 3 chiếc Mini PC**: Beelink SER5 / Minisforum (Ryzen 5 5500U/5600H, RAM 16GB, SSD 512GB) ~6.3 - 6.5 triệu/máy.

---

## 🛠️ Lệnh Phát Triển & Đóng Gói

### 1. Chạy môi trường phát triển (Dev)
```bash
# Cài đặt thư viện
npm install

# Chạy cả Vite dev server (port 5173) và Electron Window
npm run dev

# Chỉ chạy giao diện Web Vite
npm run dev:vite
```

### 2. Kiểm tra mã nguồn (Typecheck & Lint)
```bash
# Kiểm tra lỗi kiểu TypeScript
npx tsc -b

# Lint mã nguồn
npm run lint
```

### 3. Đóng gói ứng dụng chạy thử trên Windows (Production Build)
```bash
# Tạo bộ cài NSIS và bản Portable (.exe) trong thư mục release/
npm run build:win
```
- Bản chạy ngay không cần cài đặt: `desktop/release/JoyBooth 0.1.0.exe`
- Bản cài đặt NSIS: `desktop/release/JoyBooth Setup 0.1.0.exe`
