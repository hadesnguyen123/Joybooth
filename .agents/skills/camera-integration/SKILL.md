---
name: camera-integration
description: Hướng dẫn kết nối và điều khiển camera USB Webcam & DSLR (Canon, Nikon, Sony) cho JoyBooth photobooth.
---

# 📸 Camera Integration Skill — JoyBooth

## Mục tiêu
Quản lý luồng video preview thời gian thực và kích hoạt chụp ảnh chất lượng cao từ thiết bị:
1. **Webcam USB:** Qua WebRTC / `navigator.mediaDevices.getUserMedia` (frontend) hoặc `cv2.VideoCapture` (backend).
2. **DSLR Tethering:** Qua DigiCamControl REST API / Canon EDSDK trên Windows.

## Kiến trúc Luồng Dữ liệu
```
[DSLR / Webcam] ──► [DigiCamControl / OpenCV] ──► [FastAPI /camera/capture] ──► Save to data/raw/
      │
      └───────────► [WebRTC / DirectShow Preview] ──► [React CaptureScreen UI]
```

## Các lệnh & Endpoints
- `GET http://localhost:8000/camera/list`: Trả về danh sách camera kết nối.
- `POST http://localhost:8000/camera/capture`: Kích hoạt chụp và lưu file JPEG full-res.

## Xử lý sự cố (Troubleshooting)
- **DSLR không nhận diện:** Kiểm tra driver WinUSB hoặc đảm bảo DigiCamControl Windows Service đang chạy ở port 5513.
- **Webcam bị chiếm quyền:** Đảm bảo không mở cùng lúc trên nhiều ứng dụng (OBS, Zoom...).
