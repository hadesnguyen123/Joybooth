# 📸 Fotolism Canon EDSDK Persistent Daemon

Daemon chạy nền 64-bit hiệu năng cao, trực tiếp giao tiếp với máy ảnh Canon EOS (EOS R100, R50, DSLR...) qua thư viện **Canon EDSDK 64-bit**.

## 🚀 Tính năng chính
1. **Trực tiếp Live View (Zero Delay)**:
   - Kéo frame trực tiếp từ cảm biến máy ảnh qua `EdsDownloadEvfImage()`.
   - Cung cấp luồng streaming `multipart/x-mixed-replace` (MJPEG) tại cổng `8899/liveview` (30–40 FPS).
   - Hoàn toàn loại bỏ phụ thuộc vào driver ảo DirectShow EOS Webcam Utility.
2. **Chụp ảnh tức thì 1 lần dứt khoát (Single Crisp Shutter)**:
   - Kích hoạt bằng lệnh `kEdsCameraCommand_ShutterButton_Completely_NonAF` (0x00010003) đúng 1 lần duy nhất (Zero AF Lag, không bật đèn cam hỗ trợ nét).
   - Tự động bắt sự kiện `kEdsObjectEvent_DirItemRequestTransfer` tải ảnh 24MP full EXIF và đưa nút chụp về `OFF`.
   - Ngăn chặn triệt để hiện tượng xả 2 lần màn trập (double shutter actuation).
   - Giao diện Kiosk tự động tắt âm thanh loa giả lập khi máy ảnh Canon đang kết nối để tiếng màn trập cơ học thật vang lên trung thực nhất.
3. **Chống ngủ (Anti-Sleep KeepAlive)**:
   - Gửi lệnh `kEdsCameraCommand_ExtendShutDownTimer` mỗi 15 giây để máy ảnh không bao giờ tự tắt nguồn khi Kiosk đang hoạt động.
4. **Tự phục hồi (Auto-Reconnect)**:
   - Tự động nhận diện khi cắm/rút cáp USB hoặc bật lại nguồn máy ảnh.

## 🔌 API Endpoints (HTTP Port 8899)
- `GET /status`: Trả về trạng thái kết nối `{ "connected": true, "evfReady": true }`.
- `GET /liveview`: Luồng video multipart MJPEG chuẩn dùng trực tiếp cho thẻ `<img src="...">`.
- `GET /frame`: Lấy 1 khung hình JPEG Live View tĩnh mới nhất.
- `GET|POST /capture?savePath=...`: Kích hoạt chụp ảnh và tải file 24MP full resolution.
- `GET /quit`: Tắt Daemon an toàn và giải phóng SDK.

## 🔨 Cách biên dịch
Chạy file PowerShell:
```powershell
.\build.ps1
```
File thực thi sẽ được xuất ra `desktop/electron/fotolism_canon_daemon.exe`.
