---
name: cms-backoffice
description: Hướng dẫn quản trị hệ thống Cloud CMS, giám sát mạng lưới Kiosks đa điểm, đồng bộ bảng giá, khung ảnh và kế toán đối soát doanh thu 3 bên Fotolism 3.0.
---

# ☁️ CMS Backoffice & Cloud Accounting Skill — Fotolism 3.0

Hướng dẫn chuẩn hóa quy trình quản trị mạng lưới máy Kiosk Photobooth phân tán từ xa thông qua nền tảng Cloud CMS tập trung của Fotolism.

---

## 1. Kiến Trúc Phân Vùng Mạng (Port Partitioning)

Để đảm bảo các phân hệ không xung đột tài nguyên mạng trên máy trạm hoặc máy chủ:

| Phân hệ | Cổng (Port) | Công nghệ | Nhiệm vụ chính |
| :--- | :--- | :--- | :--- |
| **Desktop Kiosk** | `5173` | Electron + React 19 + Vite | Giao diện màn hình cảm ứng khách hàng, điều khiển máy ảnh & in ấn |
| **Canon Camera Daemon** | `8899` | C#/.NET 64-bit Persistent Daemon | Quản lý độc quyền Canon EOS R100 EDSDK, MJPEG LiveView |
| **CMS Web Backoffice** | `5180` | Next.js 16 (App Router) / React | Giao diện Web quản trị dành cho chủ chuỗi, quản lý & kế toán |
| **CMS Backend API** | `5181` | Node.js MVC Server / Supabase REST | API đồng bộ Kiosk, xác thực voucher, báo cáo đối soát 3 góc |

---

## 2. Các Luồng Dữ Liệu Đồng Bộ Kiosk ⇄ Cloud (Offline-First)

Mọi Kiosk đều hoạt động độc lập ngay cả khi mất mạng Internet. Khi có mạng trở lại, hệ thống tự động đẩy dữ liệu lên Cloud CMS:

```
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│       Máy Trạm Kiosk Cục Bộ     │               │          Cloud CMS Center       │
│ - SQLite Lưu trữ bền vững       │               │ - PostgreSQL / Supabase RLS     │
│ - Lưu Sessions, Captures, Prints│               │ - Web Dashboard Đa Điểm         │
└────────────────┬────────────────┘               └────────────────┬────────────────┘
                 │                                                 │
                 │ 1. Heartbeat mỗi 60s (Ping, Giấy in, Nhiệt độ)   │
                 ├────────────────────────────────────────────────►│
                 │                                                 │
                 │ 2. Kéo Cấu hình (Bảng giá, Mã giảm giá, Khung)  │
                 │◄────────────────────────────────────────────────┤
                 │                                                 │
                 │ 3. Đẩy Giao dịch & Lịch sử phiên chụp hoàn tất   │
                 ├────────────────────────────────────────────────►│
                 │                                                 │
                 │ 4. Đối soát kế toán 3 bên tự động               │
                 │◄───────────────────────────────────────────────►│
```

---

## 3. Danh Mục API Kiosk ⇄ CMS Chuẩn

| Endpoint | Method | Chức năng | Chi tiết Payload |
| :--- | :--- | :--- | :--- |
| `http://localhost:5181/api/kiosks` | `GET` | Lấy danh sách toàn bộ Kiosks | Trả về ID máy, tên cơ sở, trạng thái online, định mức giấy còn lại |
| `http://localhost:5181/api/kiosks/:id/heartbeat` | `POST` | Kiosk gửi nhịp tim định kỳ | `{"paperRemaining": int, "appVersion": string, "cpuTemp": float, "cameraConnected": bool}` |
| `http://localhost:5181/api/config/pricing` | `GET` | Đồng bộ bảng giá gói chụp | Gói 2x6 strip, gói 4x6 đơn, phí in thêm bản copy |
| `http://localhost:5181/api/coupons/validate` | `POST` | Kiểm tra tính hợp lệ của Voucher | `{"code": "SUMMER2026", "packageId": "PKG_4X6"}` ➔ Trả về % giảm giá hoặc số tiền khấu trừ |
| `http://localhost:5181/api/transactions` | `POST` | Đẩy giao dịch thanh toán thành công | `{"orderId": string, "kioskId": string, "amount": int, "method": "vietqr"|"cash", "copies": int}` |
| `http://localhost:5181/api/accounting/reconcile` | `GET` | Báo cáo đối soát 3 góc | Đối chiếu: Doanh thu VietQR ngân hàng ⇄ Tiền mặt nhân viên nộp ⇄ Số lượng giấy in tiêu hao thực tế |

---

## 4. Quy Trình Đối Soát Kế Toán 3 Bên (3-Way Reconciliation)

1. **Góc 1: Doanh thu Ngân hàng (VietQR SeABank/Vietcombank)**:
   - Dữ liệu Webhook tự động biến động số dư tài khoản ngân hàng.
2. **Góc 2: Tiền mặt tại Kiosk (Cash Collector)**:
   - Số tiền mặt khách đưa nhân viên hoặc nạp vào đầu đọc tiền mặt tự động (Bill Acceptor).
3. **Góc 3: Giấy in tiêu hao thực tế (Hardware Spooler Audit)**:
   - Số lượt máy in nhiệt DNP/HiTi đã cắt giấy thật qua lệnh phần cứng.
4. **Phát hiện gian lận (Discrepancy Alarm)**:
   - Công thức: `Tổng tiền ghi nhận = (Số lượt in thực tế × Đơn giá gói) - Khấu trừ Voucher hợp lệ`.
   - Nếu chênh lệch (Delta) > 0: Hệ thống tự động gắn cờ đỏ cảnh báo gian lận hoặc thất thoát giấy in để quản lý cơ sở kiểm tra camera an ninh.
