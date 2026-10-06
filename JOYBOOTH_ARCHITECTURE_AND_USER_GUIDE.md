# 🌸 JOYBOOTH — TÀI LIỆU KIẾN TRÚC HỆ THỐNG & HƯỚNG DẪN VẬN HÀNH
> **Phiên bản:** 1.0 (Pink Pastel Edition)  
> **Ngày phát hành:** 02/10/2026  
> **Ngôn ngữ:** Tiếng Việt  

---

## 🏛️ 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

JoyBooth được thiết kế theo mô hình **Desktop Hybrid Architecture (Offline-First)**: kết hợp sức mạnh giao diện mượt mà của **React 18**, tính bảo mật native phần cứng của **Electron Shell**, và năng lực xử lý hình ảnh/AI chuyên sâu của **Python FastAPI**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MÀN HÌNH PHOTOBOOTH JOYBOOTH (TOUCH SCREEN)          │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    ELECTRON SHELL (DESKTOP)                      │  │
│  │                                                                  │  │
│  │  ┌───────────────────────────┐    ┌───────────────────────────┐  │  │
│  │  │   Renderer Process (UI)   │    │    Main Process (Bridge)  │  │  │
│  │  │   - React 18 + TypeScript │◄──►│    - Kiosk / Window Mgmt  │  │  │
│  │  │   - Zustand State Store   │IPC │    - Context Isolation    │  │  │
│  │  │   - Pink Pastel UI Engine │    │    - Win32 Native Access  │  │  │
│  │  └───────────────────────────┘    └─────────────┬─────────────┘  │  │
│  └─────────────────────────────────────────────────┼────────────────┘  │
│                                                    │ localhost REST    │
│  ┌─────────────────────────────────────────────────▼────────────────┐  │
│  │             JOYBOOTH AI SERVICE (Python FastAPI 8000)            │  │
│  │                                                                  │  │
│  │  [Camera Engine]    [AI Beauty/Filter]   [Frame Compositor]      │  │
│  │  - Webcam OpenCV    - Bilateral Filter   - Pillow Alpha Merge    │  │
│  │  - DSLR Canon Tether- Skin Smoothing     - Multi-slot Slicing    │  │
│  │                                                                  │  │
│  │  [Print Manager]    [QR Code Delivery]   [Local Database]        │  │
│  │  - Win32Print Queue - Local LAN Hotspot  - SQLite (Zero Config)  │  │
│  │  - Paper Tracker    - Cloud CDN Optional - Sessions & Photos     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Phân tầng chức năng
1. **Presentation Layer (Giao diện người dùng):**
   * Xây dựng bằng **React 18 + TypeScript + Vite**.
   * Hệ thống theme chuẩn **Pink Pastel & Warm Cream**, lấy cảm hứng từ các photobooth Hàn Quốc hàng đầu (*Photoism, Life4Cuts, Haru Film*).
   * Quản lý trạng thái toàn cục với **Zustand** (`appStore.ts`): lưu trữ thiết bị camera, bộ lọc màu, layout khung lưới, thời gian countdown và hàng đợi ảnh.
2. **Shell & Native Layer (Electron):**
   * Khóa màn hình Kiosk mode tự động toàn màn hình khi chạy sự kiện.
   * Cung cấp cầu nối `contextBridge` (`window.joyBooth`) an toàn, ngăn chặn tấn công XSS hoặc thoát app ngoài ý muốn.
3. **Local Core & AI Backend (Python FastAPI):**
   * Chạy ngầm tại `http://localhost:8000`.
   * Cung cấp các REST API độc lập: `/camera`, `/enhance`, `/composite`, `/qr`, `/print`, `/config`.
   * Cơ sở dữ liệu **SQLite** (`joybooth.db`) ghi nhận lịch sử mọi phiên chụp, số lượng ảnh xuất và lệnh in cục bộ ngay cả khi mất mạng Internet.

---

## 🎨 2. BẢNG MÀU CHỦ ĐẠO & THIẾT KẾ (EXACT REQUESTED PALETTE)

| Mã màu | Tên màu | Vai trò giao diện |
|---|---|---|
| `#FFF8F2` | **Cream Background** | Màu nền bao quanh tổng thể booth, tạo không gian ấm áp, thanh lịch |
| `#F4729A` | **Pink Primary** | Nút chụp chính *"Bắt đầu chụp"*, viền chọn khung lưới, countdown timer |
| `#D94F78` | **Dark Pink** | Màu hover, viền nhấn, bóng đổ chiều sâu |
| `#2D2426` | **Dark Text** | Màu chữ hiển thị chính, độ tương phản sắc nét và mềm mại |
| `#FFFFFF` | **White** | Nền các menu Flyout (`Khung lưới`, `Bộ lọc`, `Phát sáng`), card ảnh, viền ảnh |

---

## 📸 3. TÍNH NĂNG CHÍNH ĐÃ TRIỂN KHAI

### 3.1 Khung lưới đa ảnh (Layout Presets)
Hỗ trợ chuyển đổi nhanh giữa các kiểu dải ảnh hot trend:
* **2 ảnh:** Ngang (Horizontal) / Dọc (Vertical).
* **3 ảnh:** Dải ảnh 3 tấm phong cách cổ điển.
* **4 ảnh (Strip):** Dải ảnh dọc kinh điển 4 ô (phổ biến nhất tại các photobooth Hàn Quốc).
* **4 ảnh (Grid):** Lưới vuông 2x2 hiện đại.
* **6 ảnh:** Lưới 2x3 cho nhóm đông người.

### 3.2 Bộ lọc màu thời thượng & Tinh chỉnh ánh sáng (Color Filters & Fine-tuning)
Áp dụng trực tiếp theo thời gian thực (Real-time Preview 60fps) trên luồng camera:
* 🤍 **Tự nhiên (Normal):** Giữ nguyên 100% màu sắc chân thực gốc từ cảm biến camera.
* 🌸 **Hồng Pastel (Rosy Pastel - HOT):** Tông màu trắng hồng, làm da mịn màng, má ửng hồng chuẩn Photobooth Hàn Quốc.
* 🫧 **Hàn Quốc Soft (TREND):** Giảm tương phản nhẹ, tăng độ sáng trong trẻo phong cách studio Seoul.
* 📷 **Film Kodak Portra (FILM):** Tông film kinh điển, ấm áp, chuyển sắc da mềm mại và chiều sâu hoài niệm.
* ❄️ **Cool Tone Xanh Lạnh (Y2K):** Ám sắc xanh cyan trong trẻo, da trắng sứ thời thượng phong cách Gen Z.
* 🍑 **Đào Cam Mọng (Peachy Glow):** Nâng sắc cam đào tươi tắn, rạng rỡ và tràn đầy năng lượng.
* ☁️ **Nhật Bản Trong Trẻo (Tokyo Airy):** Nâng sáng high-key, ánh sáng mềm dịu như truyện tranh Nhật Bản.
* 🎞️ **Cổ điển B&W (Noir):** Đen trắng tương phản cao nghệ thuật retro.
* 🖤 **Monochrome Moody:** Đen trắng sâu thẳm, tương phản mạnh mẽ cá tính.
* 📼 **Retro 90s:** Tông màu những năm 90, ám sepia và hạt màu film cổ xưa.
* 🌅 **Nắng Hoàng Hôn (Warm Sunset):** Ánh hoàng hôn vàng cam ấm áp, tôn da dưới ánh chiều.

**🎛️ Bảng điều khiển tinh chỉnh thủ công (Manual Fine-Tuning):**
* **Độ sáng (Brightness):** Tùy chỉnh từ 80% đến 130%.
* **Độ tương phản (Contrast):** Tùy chỉnh từ 80% đến 130%.
* **Độ bão hòa (Saturation):** Tùy chỉnh từ 70% đến 150%.
* Nút **Đặt lại (Reset):** Nhanh chóng đưa các thông số về mặc định ban đầu.

### 3.3 Đèn phát sáng (Ring Light & Glam Glow)
* Tích hợp hiệu ứng viền đèn trợ sáng Studio (Ring Light) bao quanh camera.
* Tự động bù sáng cho khuôn mặt khách hàng trong không gian thiếu sáng hoặc sự kiện tiệc tối.
* Tùy chỉnh cường độ sáng từ 20% đến 100%.

### 3.4 Kỹ thuật xuất Video Timelapse với 1 Camera duy nhất (Single-Camera Timelapse & Capture)
* **Thách thức:** Chỉ có 1 chiếc camera (Webcam hoặc DSLR tethering), làm thế nào vừa ghi được video hậu trường tua nhanh vừa chụp được các bức ảnh tĩnh có độ phân giải cao?
* **Giải pháp kiến trúc:**
  1. **Tách luồng xử lý (Stream Demultiplexing):** Khi bắt đầu chuỗi chụp nhiều ảnh, hệ thống kích hoạt `MediaRecorder` ghi nhận liên tục luồng `MediaStream` phần cứng của camera (30 fps) vào bộ đệm bộ nhớ đệm (RAM buffer) mà không làm suy giảm hiệu năng.
  2. **Trích xuất ảnh tĩnh tức thời (Non-blocking Snapshot):** Tại thời điểm đồng hồ đếm ngược kết thúc (3s, 5s hoặc 10s), canvas trích xuất trực tiếp khung hình hiện tại ở độ phân giải gốc mà không làm tạm dừng (pause) hay ngắt quãng tiến trình ghi video.
  3. **Tua nhanh & Tối ưu hiệu ứng (Timelapse Speedup):** Kết thúc phiên, đoạn video WebM/MP4 được đóng gói và gán tốc độ tua nhanh tùy chọn ($1.5\times$, $2.0\times$, $2.5\times$, $3.0\times$, $4.0\times$). Khách hàng có thể xem lại video chuyển động nhộn nhịp, vui vẻ của cả nhóm trong lúc đổi dáng.

### 3.5 Đồng bộ Đám mây Google Drive & Quét QR Tải Toàn Bộ Media
* Mỗi phiên chụp hoàn tất sẽ tự động đóng gói bộ tài nguyên:
  1. Trọn bộ ảnh gốc độ phân giải cao (`photo_1.jpg`, `photo_2.jpg`, ...)
  2. Dải ảnh thành phẩm đã ghép khung & sticker (`strip_2x6.jpg` hoặc `postcard_4x6.jpg`)
  3. Video Timelapse hậu trường (`timelapse.webm`)
* Tự động đưa lên thư mục sự kiện trên **Google Drive** (`gdriveFolderUrl`).
* **Mã QR tại màn hình kết quả:** Trỏ trực tiếp đến thư mục Google Drive để khách chỉ cần quét bằng Camera iPhone/Android hoặc ứng dụng Zalo là có thể xem và tải về máy toàn bộ ảnh và video ngay lập tức.


### 3.6 Bộ chọn thời gian đếm ngược (Countdown Timer)
* 3 nút chọn nhanh dạng capsule ngay phía trên màn hình:
  * **⏱️ 3s:** Chụp nhanh, dành cho các phiên chụp đông khách cần tiết kiệm thời gian.
  * **⏱️ 5s:** Chuẩn bị vừa vặn, thời gian lý tưởng nhất để tạo dáng.
  * **⏱️ 10s:** Dành cho nhóm đông người hoặc trang phục phức tạp.

---

## 🛠️ 4. HƯỚNG DẪN CÀI ĐẶT & CHẠY PHẦN MỀM

### 4.1 Yêu cầu hệ thống (Đa nền tảng Windows & macOS)
* **Hệ điều hành:**
  * **Windows:** Windows 10 / 11 (64-bit).
  * **macOS:** macOS 12+ Monterey, Ventura, Sonoma, Sequoia (Hỗ trợ 100% cả chip **Apple Silicon M1/M2/M3/M4** lẫn chip Intel).
* **Phần mềm nền tảng:**
  * Node.js v18+ hoặc v20+ LTS.
  * Python 3.10+ (với `pip`).
* **Thiết bị ngoại vi trên Mac:**
  * **Camera:** Webcam tích hợp FaceTime HD, Webcam USB ngoài (Logitech, Elgato...), **iPhone Continuity Camera** (dùng iPhone làm webcam không dây 4K), hoặc máy ảnh DSLR qua Canon/Sony Webcam Utility.
  * **Máy in:** Máy in nhiệt Photobooth (HiTi, DNP, Citizen, Canon Selphy) qua hệ thống in chuẩn macOS CUPS / AirPrint.

---

### 4.2 Khởi chạy giao diện Desktop (React + Vite)

Mở terminal PowerShell tại thư mục:
```powershell
cd f:\JoyBooth\desktop
```

1. **Cài đặt thư viện (nếu mới clone):**
   ```powershell
   npm install
   ```

2. **Chạy máy chủ phát triển (Dev Server):**
   ```powershell
   npm run dev:vite
   ```
   👉 Truy cập trực tiếp tại trình duyệt: **`http://localhost:5173`**

3. **Chạy chế độ Desktop hoàn chỉnh (React + Electron Shell):**
   ```powershell
   npm run dev
   ```

4. **Biên dịch đóng gói bản cài đặt Windows (.exe installer):**
   ```bash
   npm run build:win
   ```
   *File cài đặt `JoyBooth Setup 0.1.0.exe` sẽ được xuất tại thư mục `desktop/release/`*.

5. **Biên dịch đóng gói bản cài đặt macOS (.dmg installer):**
   Chạy lệnh này trực tiếp trên máy Mac:
   ```bash
   npm run build:mac
   ```
   *File cài đặt `JoyBooth-0.1.0.dmg` sẽ được xuất tại thư mục `desktop/release/`. Chỉ cần mở file và kéo thả vào thư mục `Applications` là hoàn tất!*

6. **Tự động đóng gói .DMG qua GitHub Actions (Không cần máy Mac):**
   Đã cấu hình sẵn file [`.github/workflows/build-mac.yml`](file:///f:/JoyBooth/.github/workflows/build-mac.yml). Khi bạn push code lên GitHub, máy chủ đám mây macOS của GitHub sẽ tự động build và xuất file `.dmg` để bạn tải về máy.

---

### 4.3 Khởi chạy dịch vụ AI Backend (Python FastAPI)

Mở một cửa sổ PowerShell mới:
```powershell
cd f:\JoyBooth\ai-service
```

1. **Cài đặt dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

2. **Chạy server Uvicorn:**
   ```powershell
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Dịch vụ sẽ tự động khởi tạo cơ sở dữ liệu `joybooth.db` và các thư mục lưu trữ ảnh.*

---

## 📋 5. HƯỚNG DẪN DÀNH CHO NGƯỜI VẬN HÀNH (OPERATOR GUIDE)

### 5.1 Bắt đầu một ca làm việc tại sự kiện
1. Bật máy tính booth, cắm nguồn camera và máy in ảnh.
2. Khởi động phần mềm **JoyBooth**.
3. Tại màn hình chờ (Idle), click vào biểu tượng **⚙️ (Bánh răng)** ở góc dưới bên phải màn hình.
4. Nhập mã PIN mặc định: **`1234`**.
5. Trong bảng **Cấu Hình Sự Kiện**:
   * Đổi **Tên sự kiện** (vd: *"Wedding Linh & Nam"*, *"Sinh Nhật 18"*...).
   * Chọn thời gian đếm ngược mặc định (3s hoặc 5s).
   * Kiểm tra máy in và camera trong tab **Thiết Bị & Máy In**.
6. Bấm **"📸 Vào Chế Độ Chụp"** để đón khách.

---

### 5.2 Luồng trải nghiệm của khách hàng (Chuẩn 6 Bước Kiosk Studio)

1. **Bước 1 — Màn hình chờ (Idle Screen):**
   * Khách hàng chạm bất kỳ đâu hoặc bấm nút *"Chạm để bắt đầu"*.

2. **Bước 2 — Chọn Khung Hình (Frame Size - Ảnh 1):**
   * Màn hình hiển thị 2 lựa chọn kích thước khổ in tiêu chuẩn:
     * **KHUNG 2X6 INCH (50k):** Dải ảnh strip đôi kinh điển.
     * **KHUNG 4X6 INCH (70k):** Bưu thiếp postcard khổ lớn.

3. **Bước 3 — Chọn Bố Cục (Layout Selection - Ảnh 2):**
   * Khách chọn số lượng ảnh mong muốn qua các tab danh mục:
     * **1 ảnh** | **3 ảnh** | **4 ảnh** | **6 ảnh** | **8 ảnh**
   * Mỗi danh mục hiển thị trực quan sơ đồ các ô ảnh kèm giá tiền tương ứng.

4. **Bước 4 — Chụp Ảnh Với Dải Slot Tiến Trình Trực Tiếp (Capture - Ảnh 5):**
   * Trên đỉnh màn hình: Khách chọn thời gian đếm ngược **3s**, **5s** hoặc **10s**.
   * Bên dưới camera: **Thanh dải ô slot trực tiếp (Live Slot Progress Bar)** hiển thị số ô cần chụp (vd: `3/6`).
   * Mỗi lần bấm máy, ảnh vừa chụp lập tức xuất hiện vào ô tương ứng, ô chưa chụp hiển thị dấu `+` viền đứt nét.
   * Hệ thống tự động đếm ngược và chụp liên hoàn đủ số lượng ảnh theo bố cục đã chọn.

5. **Bước 5 — Chọn Chủ Đề Khung Hình (Theme Selection - Ảnh 3):**
   * Bên trái: Hiển thị bản xem trước dải ảnh đã chụp của khách hàng.
   * Bên phải: Các danh mục chủ đề (`Một màu`, `Ngày lễ`, `Thời trang`, `Trào lưu`, `Khác`) với hơn 10+ mẫu viền hoa văn (Cánh bướm tím, Giáng sinh, Nấm cute, Y2K Checkerboard...).

6. **Bước 6 — Chọn Sticker Trang Trí (Sticker Customization - Ảnh 4):**
   * Khách thỏa sức gắn sticker trực tiếp lên dải ảnh: Trái tim (`Heart`), Mèo/Thỏ (`Cute`), Biểu cảm (`Emoji`), Sự kiện (`Event`), Kính râm/Vương miện (`Styles`).
   * Có thể chạm vào sticker đã dán để xóa hoặc điều chỉnh.

7. **Bước 7 — Nhận Ảnh, Tải Về & In Tức Thì (Review, Download & Delivery):**
   * Xem trọn bộ dải ảnh thành phẩm hoàn chỉnh với chủ đề & sticker được căn ghép sắc nét.
   * **Bản vẽ Composite 300 DPI:** Hệ thống tự động sinh bản vẽ dải ảnh tiêu chuẩn (600x1800 px cho 2x6 hoặc 1200x1800 px cho 4x6) hỗ trợ cả Canvas phía Frontend lẫn endpoint Python `/api/composite/multi-cut`.
   * **Nút Tải dải strip về máy (`💾 Tải Dải Strip Về Máy`):** Cho phép lưu ngay file ảnh chất lượng cao mà không cần mạng.
   * **Quét Mã QR:** Quét bằng Camera điện thoại hoặc Zalo để tải toàn bộ ảnh gốc và dải strip về máy.
   * **In ảnh nhiệt (`[ 🖨️ In ngay ]`):** Tự động chuyển dải ảnh đã ghép hoàn chỉnh sang máy in nhiệt chuyên dụng (DNP, HiTi, Citizen) với số lượng bản in tùy chọn.
   * **Linh hoạt điều chỉnh:** Khách có thể bấm `[← Sửa Sticker]`, `[🎨 Đổi Theme]`, hoặc `[📸 Chụp Lại]` nếu muốn thay đổi mà không bị mất ảnh.
   * Bấm **`[ ✅ Hoàn tất & Về Trang Đầu ]`** để tự động reset phiên cho khách hàng tiếp theo.

---

> 💡 **Mẹo vận hành:**
> * Để ảnh chân dung đẹp nhất, hãy bật chế độ **"Phát sáng"** và chọn bộ lọc **"Hồng Pastel"**.
> * Nếu cần hỗ trợ kỹ thuật hoặc mở rộng thêm tính năng thanh toán VNPay/MoMo, xem thêm các bộ Agent Skills tại thư mục [`.agents/skills/`](file:///f:/JoyBooth/.agents/skills/).

