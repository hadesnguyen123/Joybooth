# 📷 FOTOLISM 2.2 — TÀI LIỆU KIẾN TRÚC HỆ THỐNG & HƯỚNG DẪN VẬN HÀNH
> **Hệ sinh thái:** Fotolism AI-Powered Photobooth Suite  
> **Phiên bản:** 2.2 — Camera Reliability & Production Readiness  
> **Phần cứng chuẩn:** Canon EOS R100 kết nối trực tiếp Laptop Windows qua cáp USB Type-C  
> **Cập nhật gần nhất:** 24/10/2026  
> **Ngôn ngữ:** Tiếng Việt  

---

## 🏛️ 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG FOTOLISM 2.2

Fotolism 2.2 được xây dựng theo kiến trúc **Desktop Hybrid Micro-Services (Offline-First, Zero-Lag, Idempotent & Hardware-Direct)**, tối ưu hóa cho độ tin cậy phần cứng cao nhất và tính toàn vẹn của dữ liệu hình ảnh trước khi đưa vào vận hành thương mại:

```text
React 19 UI (Kiosk Touch Screen)           React 19 UI (Overhead Display)
         │                                                │
         │ Electron IPC                                   │ Electron IPC
         ▼                                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   ELECTRON MAIN PROCESS (SUPERVISOR)                   │
│  - Window Manager (Kiosk / Multi-Monitor Overhead Auto-Detect)         │
│  - Session Orchestrator & Recovery Engine                              │
│  - SQLite Session Storage (Sessions, Captures, MediaFiles, PrintJobs)  │
│  - Daemon Supervisor (Auto-Spawn, Healthcheck & Watchdog)              │
│  - Preload ContextIsolation Bridge (Zero Node.js API in Renderer)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Localhost (127.0.0.1:8899)
                                    │ POST /api/captures (Idempotent)
                                    │ GET  /liveview     (MJPEG Multi-Client)
                                    │ GET  /api/diagnostics
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               FOTOLISM CANON PERSISTENT DAEMON (.NET 64-bit)           │
│  - Camera State Machine (DISCONNECTED ↔ READY ↔ LIVEVIEW ↔ CAPTURING)   │
│  - Camera Command Queue (Single-Threaded STA PTP Coordination)         │
│  - Idempotency Cache (10 Concurrent Requests -> Exactly 1 Physical Shot│
│  - Live View Stream Engine (Non-blocking, Dropping Old Frames)         │
│  - Capture & File Transfer Manager (.tmp Download + Atomic Rename)     │
│  - Structured JSON Logging & Diagnostics Ring Buffer                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ USB Type-C Data Cable
                                    │ Canon EDSDK 64-bit Native PTP
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CANON EOS R100 / R50 MIRRORLESS                    │
│  - Cảm biến APS-C 24.1MP Full Resolution (6000 x 4000)                │
│  - Màn trập cơ học Completely_NonAF (Zero AF Delay, Single Actuation)  │
│  - Nguồn cấp độc lập (DC Coupler / Power Adapter)                      │
└────────────────────────────────────────────────────────────────────────┘
```

> **Nguyên tắc cốt lõi:** Chỉ có **Camera Daemon** được phép sở hữu và điều khiển EDSDK session. Không cho phép Electron Renderer hoặc Python mở kết nối điều khiển camera độc lập.

---

## ⚡ 2. CÁC PHÂN HỆ NÂNG CẤP TRỌNG TÂM (FUNCTIONAL REQUIREMENTS)

### 2.1 FR-01 — Quản lý Vòng đời Máy ảnh (Camera Lifecycle State Machine)
Hệ thống triển khai Finite State Machine (FSM) gồm 8 trạng thái nghiêm ngặt:
* `DISCONNECTED`: Không phát hiện máy ảnh trên cổng USB.
* `CONNECTING`: Đang dò tìm và mở phiên làm việc Canon EDSDK (`EdsOpenSession`).
* `READY`: Máy ảnh đã kết nối, kích hoạt nhận diện sự kiện `kEdsObjectEvent_All` và cấu hình bộ nhớ lưu trữ `kEdsSaveTo_Both` / `kEdsSaveTo_Host`.
* `LIVEVIEW`: Luồng EVF đang kéo frame liên tục gửi đến các màn hình.
* `CAPTURING`: Máy ảnh đang xả màn trập phơi sáng, tạm dừng EVF để nhường tài nguyên PTP.
* `TRANSFERRING`: Dữ liệu ảnh 24MP đang được truyền qua cáp USB Type-C.
* `RECOVERING`: Phát hiện mất tín hiệu tạm thời, đang cleanup session và tái kết nối với thuật toán **Exponential Backoff** (200ms $\rightarrow$ 400ms $\rightarrow$ 800ms $\rightarrow$ 1600ms $\rightarrow$ max 3000ms).
* `ERROR`: Lỗi phần cứng không thể tự phục hồi.

**Khả năng phục hồi:**
- Khi rút cáp USB trong lúc đang Live View: FSM lập tức chuyển sang `RECOVERING` $\rightarrow$ `DISCONNECTED`, giải phóng unmanaged memory (`EdsCloseSession`, `EdsRelease`) mà **không làm treo ứng dụng**.
- Khi cắm lại cáp hoặc bật lại công tắc nguồn máy ảnh từ `OFF` $\rightarrow$ `ON`: Hệ thống tự nhận diện lại thiết bị trong vòng 1.5 giây.
- Khởi tạo EDSDK session **đúng 1 lần duy nhất**, loại trừ hoàn toàn việc tạo nhiều session chồng chéo.

---

### 2.2 FR-02 — Hàng Đợi Điều Phối Lệnh EDSDK (Camera Command Queue)
Do giao thức PTP của Canon EDSDK là đơn luồng (Single-Threaded Apartment):
- Toàn bộ thao tác SDK (`EdsSendCommand`, `EdsGetEvent`, `EdsDownloadEvfImage`, `EdsDownload`) được điều phối tuần tự trên **1 Worker Thread duy nhất** của Daemon.
- Hàng đợi `ConcurrentQueue<CaptureRecord>` ngăn chặn triệt để 2 lệnh chụp chạy song song.
- **Cơ chế nhường quyền (Yielding):** Khi có lệnh chụp được kích hoạt từ Kiosk, luồng Live View ngay lập tức nhường quyền điều khiển PTP cho lệnh chụp.
- **Xả màn trập 1 lần cơ học duy nhất:** Lệnh chụp sử dụng `kEdsCameraCommand_ShutterButton_Completely_NonAF`, loại bỏ bước đệm `Halfway` gây giật rèm trập 2 lần. Sau khi ảnh truyền xong, daemon luôn chủ động gửi lệnh `kEdsCameraCommand_ShutterButton_OFF`.

---

### 2.3 FR-03 — Chuẩn Hóa API Chụp & Cơ Chế Chống Trùng Lệnh (Idempotency)
Thay thế hoàn toàn API cũ `GET /capture?savePath=...` bằng endpoint chuẩn RESTful:

**Endpoint:** `POST /api/captures`  
**Request Body:**
```json
{
  "captureId": "cap_session_001_slot2_1729728000000",
  "sessionId": "session_001",
  "slotIndex": 2
}
```

**Bảo đảm tính Idempotent:**
1. Mỗi lượt chụp được định danh bằng một `captureId` duy nhất.
2. Bộ nhớ đệm `ConcurrentDictionary<string, CaptureRecord>` theo dõi trạng thái vòng đời:
   $$\text{PENDING} \longrightarrow \text{CAPTURING} \longrightarrow \text{TRANSFERRING} \longrightarrow \text{COMPLETED}$$
3. **Thử nghiệm đối soát:** Nếu UI gửi liên tiếp 10 request cùng `captureId`, daemon chỉ gửi **đúng 1 lệnh bấm máy duy nhất** tới máy ảnh. 9 request còn lại lập tức trả về kết quả đã cache kèm cờ `idempotent: true`.
4. Nếu lượt chụp thất bại hoặc timed out, daemon giữ trạng thái `FAILED` và trả về kết quả lỗi chứ không tùy tiện bấm chụp lại vào cảm biến máy ảnh.
5. Đường dẫn lưu file được kiểm soát nghiêm ngặt theo sandbox an toàn:
   `F:\Fotolism_image\sessions\{sessionId}\raw_slot_{slotIndex}_{captureId}.jpg`. UI không được phép truyền đường dẫn tùy ý ngoài sandbox.

---

### 2.4 FR-04 — Tối Ưu Live View & Đa Màn Hình Chia Sẻ Luồng (Multi-Client EVF)
- **1 Nguồn Kéo Duy Nhất:** Chỉ có 1 vòng lặp EVF trong Daemon giao tiếp với chip xử lý DIGIC của Canon R100.
- **Chia sẻ đa màn hình:** Cả màn hình Kiosk chính và màn hình phụ Overhead đều lấy chung luồng qua `http://127.0.0.1:8899/liveview`.
- **Chống phình bộ đệm (Frame Dropping):** Frame queue chỉ lưu giữ khung hình mới nhất (`LatestEvfFrame`), các khung hình cũ bị tự động hủy để đảm bảo độ trễ hiển thị p95 luôn dưới **200ms**.
- Tốc độ Live View thực tế ổn định từ **30 – 35 FPS**. Khi máy ảnh mất kết nối, hiển thị placeholder chuyên nghiệp thay vì màn hình đen.

---

### 2.5 FR-05 — Độ Tin Cậy Khi Truyền Tải File (Atomic File Transfer)
Để đảm bảo ảnh in không bao giờ bị lỗi sọc hay file JPEG hỏng:
1. File ảnh từ camera ban đầu được tải vào file tạm:
   `raw_slot_0.jpg.tmp.{guid}`
2. **Xác minh tính toàn vẹn 2 lớp:**
   - Dung lượng file tối thiểu: $> 1000$ bytes (thực tế ảnh 24MP từ 7MB – 12MB).
   - Kiểm tra **Magic SOI Marker** của định dạng JPEG: 2 byte đầu tiên phải chính xác là `0xFF, 0xD8`.
3. Sau khi xác minh hợp lệ, thực hiện **Atomic Move (`File.Move`)** sang tên file chính thức.
4. Nếu download thất bại hoặc gián đoạn, file `.tmp` bị xóa sạch ngay lập tức; không cập nhật slot bằng ảnh hỏng.

---

### 2.6 FR-06 — Lưu Trữ Phiên Bền Vững Bằng SQLite (Persistent Session Storage)
Hệ thống tích hợp SQLite engine native (`node:sqlite`) chạy trực tiếp trong Electron Main Process lưu tại `fotolism_sessions.db`:

```sql
-- Bảng quản lý phiên
CREATE TABLE Sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  total_slots INTEGER NOT NULL DEFAULT 4,
  layout_id TEXT,
  price INTEGER DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  print_copies INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- Bảng quản lý các lượt chụp & lịch sử Retake
CREATE TABLE Captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  slot_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  file_path TEXT,
  raw_file_path TEXT,
  is_retake INTEGER NOT NULL DEFAULT 0,
  retake_count INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  shutter_ms INTEGER DEFAULT 0,
  transfer_ms INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES Sessions(id)
);

-- Bảng quản lý media assets (ảnh gốc, ảnh ghép, video timelapse, QR)
CREATE TABLE MediaFiles (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  capture_id TEXT,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Bảng quản lý lệnh in ấn
CREATE TABLE PrintJobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  copies INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  printer_name TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);
```

**Bảo vệ dữ liệu khi Retake:**
Khi khách hàng bấm xóa ô hỏng và chụp lại, ảnh gốc cũ **không bị ghi đè**. Lượt chụp mới được lưu với `is_retake: 1` và tăng `retake_count`, giúp kế toán và kỹ thuật đối soát đầy đủ lịch sử hoạt động.

---

### 2.7 FR-07 — Độ Tin Cậy Cáp USB & Chống Treo Máy Ảnh (USB Reliability)
- **Chống ngủ (Anti-Sleep):** Định kỳ mỗi 15 giây, daemon tự động gửi lệnh PTP `kEdsCameraCommand_ExtendShutDownTimer` để duy trì nguồn máy ảnh.
- **Độc lập nguồn điện:** Khuyến nghị sử dụng bộ cấp nguồn AC/DC Coupler cắm trực tiếp cho Canon EOS R100 thay vì chỉ dùng pin LP-E17.
- **Tránh xung đột:** Không khởi chạy phần mềm Canon EOS Utility song song làm tranh chấp cổng USB PTP.

---

### 2.8 FR-08 — Hỗ Trợ 2 Màn Hình Độc Lập (Overhead Multi-Monitor Support)
- **1 Màn hình:** Live View tích hợp trực tiếp trong giao diện Kiosk cảm ứng.
- **2 Màn hình:** Khi cắm thêm màn hình HDMI/DisplayPort treo cao, Electron Main Process tự phát hiện qua `screen.getAllDisplays()`.
- Admin có thể bật **Overhead Window** hiển thị tràn viền tại `?mode=overhead`.
- Màn hình Overhead hiển thị luồng MJPEG mượt mà, khung nhắc nhở góc nhìn camera và đồng hồ đếm ngược khi chụp.
- **An toàn khi rút cáp:** Khi màn hình phụ bị ngắt kết nối vật lý, sự kiện `screen.on('display-removed')` đóng nhẹ nhàng cửa sổ phụ mà **không làm crash ứng dụng Kiosk chính**.

---

### 2.9 FR-09 — Nhật Ký Cấu Trúc & Giám Sát Real-Time (Structured Observability)
Hệ thống ghi nhận log theo định dạng chuẩn JSON:
```json
{
  "timestamp": "2026-10-24T00:48:44.239+07:00",
  "level": "INFO",
  "event": "CAPTURE_SUCCESS",
  "cameraState": "READY",
  "sessionId": "session_001",
  "captureId": "cap_001",
  "durationMs": 1180,
  "details": "Total 1180ms (Shutter 120ms, Transfer 1060ms)"
}
```

**Endpoint giám sát:** `GET http://127.0.0.1:8899/api/diagnostics`  
Trả về đầy đủ các chỉ số:
- Trạng thái Camera FSM hiện tại.
- Live View FPS & Frame latency ms.
- Số lượng khách đang xem luồng Live View (Active Clients).
- Tổng số lần chụp, tỷ lệ thất bại và thời gian chụp trung bình.
- Số lần tự động tái kết nối USB.
- 50 dòng log gần nhất trong Ring Buffer hiển thị ngay trên giao diện Quản Trị Admin.

---

### 2.10 FR-10 — An Ninh & Triển Khai An Toàn (Security & Hardening)
- Daemon chỉ bind cục bộ `127.0.0.1:8899`, không mở ra mạng LAN hay Internet.
- **Mã PIN Quản Trị:** Thay thế mã PIN cứng `1234` bằng cơ chế cho phép cấu hình mã PIN riêng (`adminPin`) trong Cài Đặt (mặc định ban đầu `8888`).
- **Context Isolation:** Renderer không có quyền truy cập Node.js trực tiếp; mọi thao tác bắt buộc qua typed IPC whitelist tại [desktop/electron/preload.cts](file:///f:/JoyBooth/desktop/electron/preload.cts).

---

## 🧪 3. HỆ THỐNG KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITE)

Toàn bộ hệ thống được xác thực qua bộ test tự động 30 bài kiểm thử (`npm run test`):

```
✓ tests/unit-pricing-and-store.test.ts (14 tests)
    ✓ Bảng giá 2x6, 4x6, phụ phí bản in & mã Coupon
    ✓ Pure Camera Defaults (0% filter, mirrorCamera: false bất biến)
    ✓ Khổ ảnh in 300 DPI tiêu chuẩn (600x1800, 1200x1800)

✓ tests/system-e2e-userstories.test.ts (6 tests)
    ✓ US-01: Quy trình Photobooth 4 ảnh kèm Retake ô hỏng
    ✓ US-02: Quy trình Selfbooth tự do theo đồng hồ đếm lùi
    ✓ US-03: Retake chụp bù ô hỏng (giữ nguyên các ô còn lại)
    ✓ US-04: Hoạt động ngoại tuyến độc lập (Offline-First)
    ✓ US-05: Hệ thống tự động phục hồi kết nối máy ảnh bật ON
    ✓ US-06: Video Timelapse hậu trường WebM

✓ tests/integration-canon-daemon.test.ts (10 tests)
    ✓ IT-01: Healthcheck cổng 8899 phản hồi trạng thái kết nối
    ✓ IT-02: Endpoint /frame kéo frame JPEG hợp lệ
    ✓ IT-03: Endpoint /liveview truyền luồng MJPEG liên tục 35 FPS
    ✓ IT-04: Endpoint /capture xả màn trập 24MP không trễ
    ✓ IT-05: Cấu trúc IPC Bridge an toàn qua Preload ContextIsolation
    ✓ IT-06: Camera State Machine trả về 8 trạng thái chuẩn hóa
    ✓ IT-07: Idempotency: Gửi 10 request cùng captureId chỉ kích hoạt 1 lần
    ✓ IT-08: POST /api/captures chấp nhận payload chuẩn { captureId, sessionId, slotIndex }
    ✓ IT-09: Observability endpoint /api/diagnostics trả về Telemetry & Structured Logs
    ✓ IT-10: SQLite Persistent Session Storage lưu trữ và khôi phục toàn vẹn phiên
```

---

## 🛠️ 4. HƯỚNG DẪN BIÊN DỊCH & TRIỂN KHAI

### 4.1 Biên dịch Canon Native Daemon 64-bit
Khi có thay đổi trong mã nguồn [desktop/native-daemon/CanonDaemon.cs](file:///f:/JoyBooth/desktop/native-daemon/CanonDaemon.cs):
```powershell
cd f:\JoyBooth\desktop\native-daemon
powershell -ExecutionPolicy Bypass -File .\build.ps1
```
*Output: `f:\JoyBooth\desktop\electron\fotolism_canon_daemon.exe` (28 KB)*

### 4.2 Chạy môi trường kiểm thử tự động
```powershell
cd f:\JoyBooth\desktop
npm test
```

### 4.3 Đóng gói và kiểm tra toàn bộ ứng dụng
```powershell
cd f:\JoyBooth\desktop
npm run build
```

---

## 📋 5. QUY TRÌNH VẬN HÀNH TẠI ĐIỂM CHỤP (OPERATOR CHECKLIST)

1. **Chuẩn bị đầu ca:**
   * Cắm cáp USB Type-C từ Canon EOS R100 vào cổng **USB 3.0** của máy tính Kiosk.
   * Cắm bộ cấp nguồn DC Coupler cho Canon R100 (đảm bảo nguồn điện ổn định 8 tiếng).
   * Gạt công tắc máy ảnh sang `ON`, đặt chế độ xoay bánh xe sang `M` (Manual: Khuyến nghị `1/125s, f/4.0, ISO 400 - 800`).
   * Bật nguồn máy in nhiệt dye-sub (HiTi P525L / DNP RX1HS), kiểm tra giấy in và ribbon mực.
   * Nếu có màn hình treo cao Overhead: cắm cáp HDMI vào laptop Kiosk.

2. **Khởi động Fotolism:**
   * Bật ứng dụng Fotolism Desktop. Tiến trình Canon Daemon tự động chạy ngầm và kết nối camera trong 1.5 giây.
   * Chạm vào bánh răng ⚙️ ở góc màn hình chờ, nhập mã PIN quản trị (mặc định: `8888` hoặc mã PIN riêng đã đổi).
   * Tại tab **Thiết Bị Ngoại Vi**:
     - Kiểm tra Telemetry: Live View FPS hiển thị ~30-35 FPS, trạng thái `READY`/`LIVEVIEW`.
     - Nhấn *"Bấm Thử Màn Trập Canon R100"* để nghe 1 tiếng tách cơ học và kiểm tra ảnh 24MP.
     - Nếu có màn hình phụ: Nhấn *"▶️ Bật Màn Hình Phụ Overhead"*.

3. **Xử lý sự cố nhanh (Troubleshooting):**
   * *Camera báo bận hoặc không lên Live View:* Bấm nhẹ nửa nút chụp trên máy ảnh để đánh thức nếu đang ngủ (sleep), hoặc gạt công tắc `OFF` $\rightarrow$ `ON`. Daemon sẽ tự động khôi phục phiên trong 2 giây.
   * *Đổi mã PIN quản trị:* Vào tab **Cấu Hình Sự Kiện**, nhập mã PIN mới vào ô *🔐 Mã PIN Quản Trị Hệ Thống*.
   * *Xem nhật ký lỗi:* Mở tab **Thiết Bị Ngoại Vi**, cuộn xuống bảng *Nhật Ký Sự Kiện Hệ Thống Gần Nhất* để xem mã lỗi chi tiết.
