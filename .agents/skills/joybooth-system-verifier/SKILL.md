---
name: joybooth-system-verifier
description: Trợ lý chuyên kiểm thử tự động, ra lệnh và đối soát xác minh từng phân hệ (Desktop Kiosk, CMS Web, Backend API, Port Partitioning, Kế toán 3 bên) trong hệ sinh thái JoyBooth.
---

# 🛠️ JoyBooth System Verifier Skill

## Mục tiêu cốt lõi
Skill này được thiết kế để **ra lệnh (command orchestration)** và **xác minh tự động (automated verification)** toàn diện từng phân hệ của JoyBooth:
1. **Kiểm tra phân bổ cổng mạng**: Đảm bảo không xung đột giữa Desktop Kiosk (`5173`), CMS Web UI (`5180`), và CMS Backend MVC Server (`5181`).
2. **Kiểm tra tính toàn vẹn Database & API MVC**: Kiểm tra dữ liệu Kiosks, Frames, Pricing, Coupons, Transactions và tính bền vững khi ghi đĩa.
3. **Kiểm thử logic Đối soát kế toán 3 bên (Reconciliation Audit)**: Đối chiếu doanh thu VietQR ngân hàng + tiền mặt thực tế vs lượng giấy in tiêu hao của máy in nhiệt.
4. **Kiểm tra phần cứng & IPC Bridge**: Xác minh kết nối Electron Preload IPC tới máy in DNP RX1HS và Camera DSLR/Webcam.

## Lệnh thực thi kiểm tra tức thì
```bash
# Kiểm tra toàn bộ hệ thống từ thư mục gốc
npm run verify

# Hoặc chạy script trực tiếp:
node .agents/skills/joybooth-system-verifier/scripts/verify-all.mjs
```

## Các kịch bản ra lệnh & xác minh từng phần

### 1. Xác minh Backend MVC API (Port 5181)
- Lệnh: `Invoke-RestMethod -Uri "http://localhost:5181/api/health"`
- Kiểm tra các endpoint:
  * `GET /api/kiosks` -> Kiểm tra danh sách 2 Kiosks và chỉ số khay giấy in.
  * `GET /api/accounting/reconcile` -> Kiểm tra báo cáo đối soát 3 góc.
  * `POST /api/kiosks/:id/heartbeat` -> Kiểm tra nhận ping từ máy trạm.
  * `POST /api/transactions` -> Kiểm tra tạo đơn hàng và trừ giấy in tự động.

### 2. Xác minh CMS Web UI (Port 5180)
- Lệnh: `npm --prefix cms-web run build` (Kiểm tra 0 lỗi TypeScript & Vite)
- Lệnh chạy: `npm run cms` (Khởi chạy đồng thời Backend 5181 và UI 5180)

### 3. Xác minh Desktop Kiosk (Port 5173)
- Lệnh: `npm --prefix desktop run build`
- Lệnh chạy: `npm run dev`
