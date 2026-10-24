# FOTOLISM 3.0 — TÀI LIỆU XUẤT THIẾT KẾ & ĐẶC TẢ GIAO DIỆN (UI/UX SPECIFICATION)

> **Mục đích:** Tài liệu này chứa toàn bộ thiết kế, luồng tương tác, thông số kỹ thuật (Tokens, Typography, Grid, Breakpoints), hệ thống 10 màn hình của phần mềm Photobooth Fotolism 3.0, phục vụ việc import và thiết kế lại (Redesign) trên **Google Stitch** (`https://stitch.withgoogle.com`).

---

## 1. Thông Tin Kết Nối Stitch MCP
- **Stitch MCP Endpoint:** `https://stitch.googleapis.com/mcp`
- **Tài khoản / Dự án trên Stitch:**
  - **Project 1 (Kiosk Touchscreen Suite):** `projects/1538746746964596560` (`Fotolism 3.0 Kiosk Touchscreen Suite`)
  - **Project 2 (Cloud CMS Admin):** `projects/17405695665666017594` (`JoyBooth CMS Admin Portal`)
- **File cấu hình:**
  - Global: `~/.gemini/config/mcp_config.json`
  - Workspace: `.agents/mcp_config.json` và `mcp_config.json`
- **Đã thiết lập Design System Token:** Đã upload `DESIGN.md` và khởi tạo Design System Asset (`6dfe1dee57ba4815bc0cad3389d717de`).

---

## 2. Hệ Thống Design Tokens & Bảng Màu (Warm Minimal Luxury)

### 2.1 Màu Thương Hiệu Chính (Brand Primary)
| Token | Hex | Ứng Dụng | Ghi Chú |
| :--- | :--- | :--- | :--- |
| `brand.primary` | `#502A1D` | Nút CTA chính (Bắt đầu, Chụp, Tiếp tục, In), trạng thái chọn | Espresso Brown chuẩn nhận diện logo Fotolism |
| `brand.primaryHover` | `#633726` | Trạng thái hover nút bấm | Tăng độ sáng nhẹ |
| `brand.primaryPressed` | `#3D2017` | Trạng thái nhấn giữ (Active) | Đậm hơn, độ lún xúc giác |
| `brand.secondary` | `#78452F` | Nhận diện phụ, tag phụ, viền nổi bật | Cocoa Brown |
| `brand.accent` | `#A66A43` | Điểm nhấn trang trí, tia quét radar QR | Caramel ấm áp |
| `brand.highlight` | `#EACDB6` | Nền chip, badge thông tin, highlight nhẹ | Warm Beige |

### 2.2 Màu Trung Tính (Neutral - 65–70% diện tích màn hình)
| Token | Hex | Ứng Dụng | Ghi Chú |
| :--- | :--- | :--- | :--- |
| `background.primary` | `#FAF6F1` | Nền canvas toàn bộ phần mềm Kiosk | Warm Cream dịu mắt, hòa hợp không gian gỗ |
| `background.secondary`| `#F2E9E1` | Khối phân cách nhóm, sidebar CMS | Warm Almond |
| `surface.default` | `#FFFFFF` | Thẻ card, dialog popup, nền mã QR | Độ tương phản cao để camera điện thoại dễ quét |
| `surface.warm` | `#FFF9F4` | Khay trượt làm đẹp, bảng điều khiển phụ | Warm Ivory |
| `border.default` | `#E6D9CF` | Viền hairline ngăn cách khối | Thanh mảnh, tinh tế |
| `border.strong` | `#C8B2A4` | Viền thẻ đang tương tác, vách ngăn chính | Tương phản tốt |
| `text.primary` | `#351C15` | Tiêu đề H1/H2, văn bản chính | Deep Walnut Coffee (WCAG AA > 7:1) |
| `text.secondary` | `#70594F` | Phụ đề, hướng dẫn sử dụng, nhãn slot ảnh | Warm Umber |
| `text.inverse` | `#FFFFFF` | Chữ trắng trên nền Espresso đậm | Tương phản tối đa |
| `text.disabled` | `#897F79` | Nút vô hiệu hóa, placeholder | Xám nâu mờ |

### 2.3 Trạng Thái Nghiệp Vụ (Semantic Colors)
| Token | Hex | Ứng Dụng |
| :--- | :--- | :--- |
| `status.success` | `#237A57` | Camera online, thanh toán VietQR thành công, in hoàn tất |
| `status.warning` | `#A86516` | Cảnh báo sắp hết giấy in, đếm ngược còn dưới 10s |
| `status.error` | `#B43F3F` | Mất kết nối camera, kẹt giấy, hủy phiên |
| `status.info` | `#356A91` | Thông tin hướng dẫn, tooltip |
| `status.pending` | `#806348` | Đang xử lý ảnh, chờ webhook chuyển khoản |

---

## 3. Typographic Hierarchy (Cỡ Chữ & Phông)

- **Display & Headline Font:** `Quicksand` / `Plus Jakarta Sans` (Tròn trịa, hiện đại, hỗ trợ tiếng Việt đầy đủ).
- **Body & Metadata Font:** `Manrope` / `Quicksand` (Rõ nét trên màn cảm ứng).
- **Phân cấp tỉ lệ:**
  - **Kiosk Super Display (`80px - 120px`, Bold):** Đồng hồ đếm ngược 3... 2... 1...
  - **Headline XL (`40px`, Line Height 48px, Weight 800):** Tiêu đề màn hình chào (Tap to Start).
  - **Headline LG (`28px`, Line Height 36px, Weight 700):** Tên các bước quy trình ("Chọn khổ ảnh", "Thanh toán VietQR").
  - **Touch Action Label (`16px - 18px`, Weight 700, Uppercase/Semibold):** Nhãn nút bấm cảm ứng (cao tối thiểu 64px).

---

## 4. Danh Mục 10 Màn Hình Cần Redesign Trong Kiosk Suite

### 1. Màn Hình Chờ (Idle / Attract Screen)
- **File nguồn:** [IdleScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/IdleScreen.tsx) & [IdleScreen.css](file:///f:/JoyBooth/desktop/src/screens/IdleScreen.css)
- **Mục tiêu UX:** Thu hút khách đi ngang qua gian hàng trong TTTM, rạp chiếu phim, hội chợ.
- **Thành phần:**
  - Logo Fotolism phát sáng với hiệu ứng hạt lấp lánh (Sparkle particles).
  - Khung demo chạy slideshow các dải ảnh mẫu (Twin strips 2x6).
  - Nút khổng lồ dạng viên thuốc: **"CHẠM VÀO ĐÂY ĐỂ BẮT ĐẦU"** nhịp thở (Pulse animation).
  - Banner sự kiện/nhà tài trợ ở góc dưới.

### 2. Màn Hình Chọn Khổ In (Select Frame Size)
- **File nguồn:** [SelectFrameSizeScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/SelectFrameSizeScreen.tsx)
- **Mục tiêu UX:** Giúp khách quyết định khổ giấy in vật lý.
- **2 Lựa chọn chính:**
  1. **Khổ 2x6 kép (Twin Strips):** In ra 1 tờ 4x6 được máy DNP tự động cắt đôi thành 2 dải 2x6 (mỗi dải 3 hoặc 4 ảnh). Phù hợp nhóm bạn đi 2 người.
  2. **Khổ đơn 4x6 (Classic Postcard):** 1 ảnh bưu thiếp kích thước 10x15cm, bố cục 4 ảnh hoặc 6 ảnh.
- **Thành phần:** 2 Card 3D mô phỏng kích thước thật có bóng đổ mềm, giá tiền in kèm (Ví dụ: `70.000đ`).

### 3. Màn Hình Chọn Bố Cục (Select Layout)
- **File nguồn:** [SelectLayoutScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/SelectLayoutScreen.tsx)
- **Lựa chọn:** Bố cục 3 ảnh dọc, 4 ảnh dọc, 2x2 lưới vuông, hoặc 6 ảnh nghệ thuật.
- **Thành phần:** Lưới wireframe hiển thị tỉ lệ từng ô ảnh (Pose count 3, 4, 6), nhãn "Phổ biến nhất" (Most Popular).

### 4. Màn Hình Thanh Toán Tự Động (VietQR & Cash)
- **File nguồn:** [PaymentScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/PaymentScreen.tsx)
- **Mục tiêu UX:** Thanh toán không tiền mặt siêu tốc dưới 5 giây.
- **Thành phần:**
  - Card VietQR trung tâm kích thước lớn, hiển thị logo Napas247, Vietcombank / SeABank / MoMo.
  - Vòng radar sóng quét xanh báo hiệu hệ thống đang tự động lắng nghe giao dịch.
  - Đồng hồ đếm ngược 120s giữ phiên.
  - Tùy chọn chuyển sang "Tiền mặt" hoặc "Nhập mã Voucher giảm giá".

### 5. Sân Khấu Chụp Ảnh (Camera Viewfinder Stage)
- **File nguồn:** [CaptureScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/CaptureScreen.tsx)
- **Mục tiêu UX:** Trọng tâm trải nghiệm của khách.
- **Thành phần:**
  - **Live View HUD:** Khung hiển thị luồng MJPEG 960x640 từ Canon EOS R100, qua bộ lọc làm nét ma trận SVG Laplacian convolution (`image-rendering: -webkit-optimize-contrast`).
  - **Vòng đếm ngược:** Đếm 3s, 5s hoặc 10s có âm thanh "Bíp... Bíp... Tách!".
  - **Bảng làm đẹp (Beauty Flyout):** Thanh trượt làm mịn da (Smoothness), tông màu ấm (Warmth), và độ trong trẻo (Clarity).
  - **Khay Slot Ảnh Dưới (Photo Deck):** Hiển thị các pô đã chụp (1/4, 2/4...). Khách có thể chạm vào ảnh vừa chụp để ấn **"Chụp lại (Retake)"**.
  - **Hiệu ứng Flash:** Chớp trắng tỏa tròn toàn màn hình khi màn trập máy ảnh nhả.

### 6. Màn Hình Chọn Khung & Chủ Đề (Theme Selection)
- **File nguồn:** [ThemeSelectScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/ThemeSelectScreen.tsx)
- **Mục tiêu UX:** Cá nhân hóa dải ảnh theo gu khách hàng.
- **Chủ đề có sẵn:**
  - *Minimal White:* Viền trắng tinh khôi, chữ đen thanh mảnh.
  - *Pastel Blossom:* Tông hồng phấn, hoa anh đào.
  - *Midnight Luxury:* Đen nhung huyền bí, viền vàng ánh kim.
  - *Y2K Cyberpunk:* Neon rực rỡ, hiệu ứng tem vintage.
  - *Wedding / Event:* Khung đồng bộ theo thương hiệu đối tác.

### 7. Màn Hình Bộ Lọc Màu & Sticker (Filter & Sticker Decorator)
- **File nguồn:** [FilterScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/FilterScreen.tsx) & [StickerScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/StickerScreen.tsx)
- **Thành phần:**
  - Thẻ chọn Filter màu LUT: *Original, Korean Glow, Soft Peach, Black & White, Sepia Retro*.
  - Khay sticker kéo thả: Tim, ngôi sao, kính mắt, vương miện, nơ, chữ cute.
  - Tùy chọn in ngày giờ chụp & logo kỷ niệm.

### 8. Màn Hình Xem Lại, In & Quét Mã QR Nhận Ảnh (Review & QR Delivery)
- **File nguồn:** [ReviewScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/ReviewScreen.tsx)
- **Thành phần:**
  - Bản xem trước bản in hoàn chỉnh tỉ lệ 300 DPI chân thực.
  - Bộ chọn số lượng in: `[-] 2 Bản [+]`.
  - **Hai mã QR nhận file gốc:**
    1. **Mã QR Online (Google Drive / Cloud CDN):** Tải trọn bộ ảnh gốc chất lượng cao + video tua nhanh (Timelapse boomerang).
    2. **Mã QR Offline (LAN Hotspot):** Quét Wi-Fi nội bộ Kiosk tải ảnh ngay lập tức kể cả khi rớt mạng internet.
  - Nút bấm lớn: **"HOÀN TẤT VÀ IN ẢNH"** kèm hoạt hình minh họa giấy in đang chạy ra khay.

### 9. Màn Hình Quản Trị Kỹ Thuật Kiosk (Admin Diagnostics)
- **File nguồn:** [AdminScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/AdminScreen.tsx)
- **Bảo mật:** Khóa mã PIN (Mặc định `8888`).
- **Thành phần:**
  - Trạng thái Canon EDSDK Daemon (Port 8899, USB-C link, Shutter Count).
  - Giám sát máy in DNP RX1HS / HiTi (Bộ đếm cuộn giấy, nhiệt độ đầu in, hàng đợi Spooler).
  - Cấu hình giá vé, tải khung ảnh offline, xem đối soát doanh thu tiền mặt.

### 10. Màn Hình Phụ Cho Khán Giả Ngoài Buồng (Overhead Audience Secondary Display)
- **File nguồn:** [OverheadScreen.tsx](file:///f:/JoyBooth/desktop/src/screens/OverheadScreen.tsx)
- **URL kích hoạt:** `http://localhost:5173/?mode=overhead` (chạy trên màn hình TV gắn ngoài hoặc màn hình phụ thứ 2).
- **Thành phần:**
  - Khi buồng rảnh: Trình chiếu TVC, video hướng dẫn vui nhộn.
  - Khi đang chụp: Chiếu phản chiếu Live View và khoảnh khắc tạo dáng của bạn bè.
  - Khi hoàn tất: Bắn pháo hoa chúc mừng và hiển thị mã QR nhận ảnh.

---

## 5. Hướng Dẫn Sử Dụng Với Google Stitch

1. Mở dự án Kiosk trên Stitch:
   👉 **`https://stitch.withgoogle.com/projects/1538746746964596560`**
2. Hoặc sử dụng CLI tự động đã tích hợp trong source code:
   ```bash
   # Liệt kê dự án
   npm run stitch:projects

   # Tải bản thiết kế cập nhật
   npm run stitch:upload

   # Sử dụng CLI tương tác
   npm run stitch -- list-screens 1538746746964596560
   ```
3. Nhập câu lệnh (Prompt) trực tiếp vào Stitch để tái thiết kế màn hình mong muốn:
   - *Ví dụ:* `"Design a modern Korean Photobooth Live Viewfinder screen for 1080x1920 vertical touchscreen with camera status, big circular countdown ring, beauty sliders, and retake thumbnail deck at bottom using the uploaded DESIGN.md palette."*
