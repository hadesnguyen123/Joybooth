# 📷 FOTOLISM — TÀI LIỆU KIẾN TRÚC HỆ THỐNG & HƯỚNG DẪN VẬN HÀNH
> **Hệ sinh thái:** Fotolism AI-Powered Photobooth Suite  
> **Phiên bản:** 2.0 (High-Reliability & EDSDK Native Edition)  
> **Cập nhật gần nhất:** 17/10/2026  
> **Ngôn ngữ:** Tiếng Việt  

---

## 🏛️ 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Fotolism được xây dựng theo mô hình **Desktop Hybrid Architecture (Offline-First & Hardware-Resilient)**: kết hợp giao diện cảm ứng Kiosk thời thượng của **React 19 + Vite**, nhân native điều khiển phần cứng của **Electron Shell (Node.js)**, và phân hệ xử lý máy ảnh cơ **Canon EOS R100 (EDSDK)** cùng **Python AI Service**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   MÀN HÌNH CẢM ỨNG KIOSK FOTOLISM (TOUCH SCREEN)                       │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    ELECTRON SHELL RUNTIME (DESKTOP)                              │  │
│  │                                                                                  │  │
│  │  ┌─────────────────────────────────┐      ┌───────────────────────────────────┐  │  │
│  │  │      Renderer Process (UI)      │      │       Main Process (Bridge)       │  │  │
│  │  │  - React 19 + TypeScript + Vite │      │  - Kiosk / Window Management      │  │  │
│  │  │  - Zustand Global Store         │◄────►│  - Context Isolation Bridge       │  │  │
│  │  │  - Photobooth & Selfbooth Modes │ IPC  │  - Async CLI Runner (Zero-Block)  │  │  │
│  │  │  - 3.5s Client Timeout Race     │      │  - Centralized Disk I/O (D:\)     │  │  │
│  │  └─────────────────────────────────┘      └─────────────────┬─────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┼────────────────────┘  │
│                                                                │                       │
│             ┌──────────────────────────────────────────────────┼────────────────┐      │
│             │ USB Native Protocol / EDSDK Direct               │ REST localhost │      │
│             ▼                                                  ▼                ▼      │
│  ┌──────────────────────────────┐              ┌────────────────────────────────────┐  │
│  │ CANON EOS R100 DSLR / EDSDK  │              │    FOTOLISM BACKEND SERVICES       │  │
│  │                              │              │                                    │  │
│  │ - digiCamControl CLI Native  │              │ [Python AI Service - Port 8000]    │  │
│  │ - Non-blocking /wait 0 flag  │              │ - EDSDK Bridge & Face Beautify     │  │
│  │ - Shutter /capturenoaf       │              │ - Frame Compositor & QR Generator  │  │
│  │ - 24MP Ultra HD Raw Snapshot │              │                                    │  │
│  │                              │              │ [Local Storage Engine]             │  │
│  │ [Webcam HD Stream Fallback]  │              │ - D:\Fotolism_image (Primary)      │  │
│  │ - Instant 60fps Live Preview │              │ - Dual Base64 / Local File Sync    │  │
│  │ - Auto Fail-Safe Snapshot    │              │ - Google Drive Auto-Sync Webhook   │  │
│  └──────────────────────────────┘              └────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ 2. CƠ CHẾ ĐIỀU KHIỂN MÁY ẢNH & CHỐNG NGHẼN (HARDWARE RESILIENCE)

### 2.1 Kiến trúc chụp ảnh kép: Canon EOS R100 & Webcam Fallback
Để mang lại chất lượng ảnh studio 24MP mà vẫn đảm bảo Kiosk không bao giờ bị đứng máy khi vận hành đông khách:

```
┌─────────────────────────────────┐
│       Người dùng nhấn chụp      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Đếm ngược (3s, 5s, 10s)     │
│   Reset đếm ngược về 0 ngay     │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Kích hoạt Flash & Timeout Race │
└────────────────┬────────────────┘
                 │
        ┌────────┴───────────────────────────┐
        ▼ (Ưu tiên)                          ▼ (Song song)
┌───────────────────────────────┐   ┌───────────────────────────────┐
│  Gửi lệnh EDSDK / DigiCam     │   │  Bộ đếm Timer 3.5 Giây        │
│  - /capturenoaf (Bỏ qua AF)   │   │  - Client-side Promise.race   │
│  - /wait 0 (Thoát ngay)       │   │  - Ngăn chặn kẹt tiến trình   │
│  - Async subprocess           │   │                               │
└───────────────┬───────────────┘   └───────────────┬───────────────┘
                │                                   │
                ├───────────────┬───────────────────┤
                ▼ Thành công    ▼ Quá 3.5s / Lỗi    ▼
        ┌──────────────────┐    ┌───────────────────────────┐
        │  Ảnh DSLR 24MP   │    │  Webcam Fallback Frame    │
        │  Chất lượng cao  │    │  Trích xuất từ luồng trực │
        │  tiếp không gián │    │  tiếp tức thì             │
        └─────────┬────────┘    └─────────────┬─────────────┘
                  │                           │
                  └─────────────┬─────────────┘
                                ▼
                ┌───────────────────────────┐
                │ Cập nhật ô Slot & Bay vào │
                │ Giải phóng isCapturingShot│
                │ Sẵn sàng cho ô tiếp theo  │
                └───────────────────────────┘
```

### 2.2 Các cải tiến cốt lõi đã giải quyết triệt để lỗi nghẽn
1. **Loại bỏ hoàn toàn `execSync`:**
   - Trước đây `execSync` khóa cứng Electron main thread đến 15 giây khiến màn hình đơ cứng tại số `1`.
   - Hiện tại sử dụng `runAsyncCommand` (dựa trên `child_process.exec` bất đồng bộ) kèm timeout ngắt tự động 4 giây.
2. **Cờ `/wait 0` & `/capturenoaf`:**
   - Ngăn `CameraControlCmd.exe` gọi `Console.ReadLine()` chờ phím Enter từ terminal.
   - Bỏ qua khóa lấy nét tự động (`capturenoaf`) giúp máy ảnh chụp ngay lập tức kể cả khi khách di chuyển nhanh.
3. **Khối `try ... finally` cưỡng chế giải phóng UI:**
   - Bọc toàn bộ hàm `handleTakePhotoboothShot` và `handleTakeSelfboothShot` trong khối `finally { setCurrentCountdown(0); setIsCapturingShot(false); }`.
   - Ngay cả khi xảy ra lỗi bất ngờ, UI luôn được mở khóa để khách tiếp tục trải nghiệm.
4. **Chuẩn hóa đường dẫn tập tin Windows:**
   - Sử dụng `path.join` để đồng nhất dấu gạch chéo `\` trên Windows, tránh xung đột đường dẫn khi gọi CLI bên ngoài.

---

## 📁 3. CƠ CHẾ LƯU TRỮ TẬP TRUNG (`Fotolism_image`)

Toàn bộ hình ảnh, dải in và video hậu trường được quản lý tập trung và nhất quán theo quy chuẩn:

| Cấu hình | Giá trị mặc định | Mô tả |
|---|---|---|
| **Thư mục chính** | `D:\Fotolism_image` | Ổ cứng tốc độ cao được ưu tiên lưu trữ |
| **Thư mục dự phòng 1** | `F:\Fotolism_image` | Tự động kích hoạt nếu máy tính booth cấu hình ổ F:\ |
| **Thư mục dự phòng 2** | `%USERPROFILE%\Downloads\Fotolism_image` | Fallback an toàn nếu không có quyền ghi ổ đĩa ngoài |
| **Tiền tố ảnh đơn** | `fotolism_shot_{index}_{timestamp}.jpg` | Từng bức ảnh chụp đơn lẻ (24MP hoặc 1080p) |
| **Tiền tố dải in** | `fotolism_strip_{layout}_{timestamp}.jpg` | Dải ảnh hoàn chỉnh đã ghép khung, theme & sticker |
| **Tiền tố video** | `fotolism_timelapse_{timestamp}.webm` | Video tua nhanh quá trình tạo dáng của khách |
| **Tiền tố phiên chụp**| `fotolism_session_{timestamp}` | Thư mục con đóng gói toàn bộ media của một phiên |

---

## 🎨 4. HAI CHẾ ĐỘ CHỤP LINH HOẠT

### 4.1 Chế độ Photobooth Cổ Điển (Classic Photobooth)
* Chụp lần lượt từng ô theo bố cục đã chọn (1, 3, 4, 6 hoặc 8 ảnh).
* **Live Slot Bar:** Dải ô ảnh trực tiếp hiển thị ảnh vừa chụp, ô chưa chụp có dấu `+` đứt nét.
* **Tính năng Retake thông minh:** Khách chỉ cần bấm dấu `✕` trên bất kỳ ô nào chưa ưng ý để chụp lại riêng ô đó mà không phải chụp lại từ đầu cả dải.
* Sau khi đủ ảnh, hệ thống giữ nguyên giao diện để khách kiểm tra kỹ càng trước khi bấm *"Hài Lòng & Tiếp Tục ➔"*.

### 4.2 Chế độ Selfbooth Tự Do (Selfbooth Studio)
* Chụp tự do không giới hạn số lượng ảnh trong khoảng thời gian đếm lùi (mặc định 3 phút hoặc 5 phút).
* Đếm ngược nhanh 2 giây giữa mỗi lần bấm giúp khách liên tục thay đổi phong cách tạo dáng.
* Hết giờ, hệ thống mở thư viện ảnh để khách tự do chọn ra các bức ảnh đẹp nhất đưa vào dải in hoàn chỉnh.

---

## 💳 5. HỆ THỐNG THANH TOÁN ĐA PHƯƠNG THỨC

```
┌────────────────────────────────────────────────────────┐
│               MÀN HÌNH THANH TOÁN KIOSK                │
│                                                        │
│  [ Cột Trái: Đơn Hàng ]      [ Cột Phải: Phương Thức ] │
│  - Khổ ảnh & Bố cục          - Tab 1: VietQR Napas 24/7│
│  - Mã đơn: FTLxxxxxx         - Tab 2: Tiền mặt (Cash)  │
│  - Chọn số lượng bản in      - Đồng hồ đếm lùi 120s    │
│  - Áp dụng mã Coupon         - Nút xác nhận thanh toán │
│  - Tổng tiền (VND)           - Nút Test Mode (Bỏ qua)  │
└────────────────────────────────────────────────────────┘
```

1. **VietQR NAPAS 24/7:**
   - Tự động sinh mã VietQR động chứa số tài khoản, mã ngân hàng (BIN), số tiền chính xác theo số bản in và mã đơn hàng `FTLxxxxxx`.
   - Khách chỉ cần mở bất kỳ ứng dụng ngân hàng hoặc ví điện tử quét mã là thanh toán tức thì.
2. **Tiền mặt (Cash):**
   - Hướng dẫn đưa tiền cho nhân viên trực booth.
   - Nhân viên kiểm tra và bấm nút *"Xác nhận đã nhận tiền"* để mở camera.
3. **Mã ưu đãi (Discount Coupon):**
   - Hỗ trợ giảm theo phần trăm (%) hoặc trừ tiền trực tiếp.
4. **Chế độ kiểm thử nhanh (Test Mode):**
   - Cho phép nhân viên kỹ thuật hoặc quản trị viên booth bỏ qua bước thanh toán khi kiểm tra định kỳ.

---

## 🛠️ 6. HƯỚNG DẪN CÀI ĐẶT & VẬN HÀNH

### 6.1 Khởi chạy môi trường phát triển (Development)
Tại thư mục gốc `f:\JoyBooth`:
```powershell
# Chạy đồng thời Vite Frontend (5173) và Electron Desktop
npm run dev
```

### 6.2 Biên dịch mã nguồn Electron & Frontend
Khi có thay đổi trong `desktop/electron/main.cts` hoặc các màn hình React:
```powershell
# 1. Biên dịch Electron Main Process
cd f:\JoyBooth\desktop
npx tsc -p electron/tsconfig.json

# 2. Kiểm tra lỗi kiểu dữ liệu TypeScript
npx tsc --noEmit
```

### 6.3 Đóng gói ứng dụng Kiosk chạy độc lập (.exe)
```powershell
cd f:\JoyBooth\desktop
npm run build:win
```
*Tập tin cài đặt `Fotolism Setup.exe` sẽ được tạo tại thư mục `desktop/release/`.*

---

## 📋 7. QUY TRÌNH VẬN HÀNH TẠI SỰ KIỆN (OPERATOR CHECKLIST)

1. **Kiểm tra đầu ca:**
   * Cắm cáp USB máy ảnh Canon EOS R100 vào cổng USB 3.0 máy tính.
   * Bật nguồn máy ảnh Canon, gạt cần sang chế độ chụp ảnh tĩnh (`P` hoặc `M`, khuyến nghị `1/125s, f/4.0, ISO 400 - 800`).
   * Cắm nguồn máy in ảnh nhiệt (DNP / HiTi), đảm bảo đủ giấy in và mực ribbon.
2. **Mở phần mềm Fotolism:**
   * Mở ứng dụng Fotolism.
   * Chạm vào biểu tượng **⚙️ (Bánh răng)** tại màn hình chờ, nhập mã PIN quản trị mặc định: `1234`.
   * Kiểm tra thông số sự kiện, máy in mặc định và kết nối camera.
   * Nhấn nút *"📸 Vào Chế Độ Chụp"* để sẵn sàng đón khách.
3. **Xử lý sự cố nhanh (Troubleshooting):**
   * *Máy ảnh không nhận lệnh chụp:* Kiểm tra xem ứng dụng Canon EOS Utility chính hãng có đang chạy đè hay không. Fotolism sẽ tự động giải phóng xung đột, nhưng nếu cần có thể rút cắm lại cáp USB hoặc ấn nhẹ nút chụp trên thân máy để đánh thức máy khỏi chế độ ngủ (Auto Sleep).
   * *Hết giấy in:* Thay cuộn giấy mới, vào menu Admin bấm *"Kiểm tra máy in"* để in bản test.
