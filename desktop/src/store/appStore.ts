import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppScreen =
  | 'idle'
  | 'select-size'
  | 'select-layout'
  | 'payment'
  | 'capture'
  | 'select-theme'
  | 'select-sticker'
  | 'review'
  | 'admin'

export type BoothMode = 'attended' | 'unattended'
export type CaptureMode = 'photobooth' | 'selfbooth'
export type FrameSize = '2x6' | '4x6'

// ─── Khung Kích Thước (Frame Size) ──────────────────────────────────────────
export interface FrameSizeOption {
  id: FrameSize
  name: string
  subtitle: string
  price: string
  aspectRatio: string
  description: string
  previewImage: string
}

export const FRAME_SIZE_OPTIONS: FrameSizeOption[] = [
  {
    id: '2x6',
    name: 'KHUNG 2X6 INCH',
    subtitle: 'Dải Strip Photobooth Cổ Điển',
    price: '50.000đ',
    aspectRatio: '1 / 3',
    description: 'Bản in dải strip đôi thời thượng, lý tưởng để kẹp ví hoặc dán ốp lưng',
    previewImage: 'strip_2x6',
  },
  {
    id: '4x6',
    name: 'KHUNG 4X6 INCH',
    subtitle: 'Bưu Thiếp Postcard Tiêu Chuẩn',
    price: '70.000đ',
    aspectRatio: '2 / 3',
    description: 'Khổ ảnh bưu thiếp sang trọng, chứa được nhiều người và bố cục đa dạng',
    previewImage: 'postcard_4x6',
  },
]

// ─── Bố Cục Theo Danh Mục Ảnh (Layouts categorized by photo count) ────────────
export type LayoutCategory = 1 | 3 | 4 | 6 | 8

export interface GridLayoutItem {
  id: string
  name: string
  photosCount: number
  cols: number
  rows: number
  strip: boolean
  description: string
  previewType: '1_single' | '3_strip' | '4_strip' | '4_grid' | '6_grid' | '8_grid'
}

export const ALL_LAYOUTS: Record<LayoutCategory, GridLayoutItem[]> = {
  1: [
    { id: '1_full_portrait', name: '1 ảnh Chân Dung', photosCount: 1, cols: 1, rows: 1, strip: false, description: '1 ảnh đơn phóng lớn', previewType: '1_single' },
  ],
  3: [
    { id: '3_vertical_strip', name: '3 ảnh Dọc Strip', photosCount: 3, cols: 1, rows: 3, strip: true, description: '3 ảnh dải đứng', previewType: '3_strip' },
  ],
  4: [
    { id: '4_strip_classic', name: '4 ảnh Dọc Strip', photosCount: 4, cols: 1, rows: 4, strip: true, description: '4 ảnh dải đứng kinh điển (2x6)', previewType: '4_strip' },
    { id: '4_grid_2x2', name: '4 ảnh Lưới Vuông', photosCount: 4, cols: 2, rows: 2, strip: false, description: '4 ảnh lưới 2x2 (4x6)', previewType: '4_grid' },
  ],
  6: [
    { id: '6_grid_2x3', name: '6 ảnh Lưới Dọc (2x3)', photosCount: 6, cols: 2, rows: 3, strip: false, description: '6 ảnh lưới 2 cột 3 hàng', previewType: '6_grid' },
    { id: '6_grid_3x2', name: '6 ảnh Lưới Ngang (3x2)', photosCount: 6, cols: 3, rows: 2, strip: false, description: '6 ảnh lưới 3 cột 2 hàng', previewType: '6_grid' },
  ],
  8: [
    { id: '8_grid_2x4', name: '8 ảnh Lưới Mini (2x4)', photosCount: 8, cols: 2, rows: 4, strip: false, description: '8 ảnh mini siêu vui', previewType: '8_grid' },
  ],
}

// ─── Chủ Đề Khung Hình (Themes) ───────────────────────────────────────────────
export type ThemeCategory = 'Một màu' | 'Khác' | 'Ngày lễ' | 'Thời trang' | 'Trào lưu'

export interface ThemeItem {
  id: string
  name: string
  category: ThemeCategory
  bgColor: string
  bgGradient: string
  textColor: string
  borderColor: string
  decorations?: string[]
}

export const THEME_OPTIONS: ThemeItem[] = [
  // Một màu (Solid pastel)
  { id: 'theme_pink_pastel', name: 'Hồng Phấn', category: 'Một màu', bgColor: '#ffd1dc', bgGradient: 'linear-gradient(180deg, #ffd1dc 0%, #fff0f5 100%)', textColor: '#F4729A', borderColor: '#F4729A' },
  { id: 'theme_cream_warm', name: 'Kem Sữa', category: 'Một màu', bgColor: '#FFF8F2', bgGradient: 'linear-gradient(180deg, #FFFFFF 0%, #FFF8F2 100%)', textColor: '#2D2426', borderColor: '#2D2426' },
  { id: 'theme_lavender', name: 'Tím Mộng Mơ', category: 'Một màu', bgColor: '#e8dcff', bgGradient: 'linear-gradient(180deg, #e8dcff 0%, #f4efff 100%)', textColor: '#7c59cf', borderColor: '#7c59cf' },
  { id: 'theme_mint', name: 'Xanh Mint', category: 'Một màu', bgColor: '#d8f5ea', bgGradient: 'linear-gradient(180deg, #d8f5ea 0%, #f0faf5 100%)', textColor: '#2e9e74', borderColor: '#2e9e74' },
  { id: 'theme_matcha', name: 'Xanh Matcha', category: 'Một màu', bgColor: '#e8f5e9', bgGradient: 'linear-gradient(180deg, #dcedc8 0%, #f1f8e9 100%)', textColor: '#33691e', borderColor: '#689f38' },
  { id: 'theme_noir', name: 'Đen Trầm', category: 'Một màu', bgColor: '#1f1e24', bgGradient: 'linear-gradient(180deg, #2b2a30 0%, #17161b 100%)', textColor: '#FFFFFF', borderColor: '#FFFFFF' },

  // Ngày lễ
  { id: 'theme_birthday', name: 'Sinh Nhật Party', category: 'Ngày lễ', bgColor: '#fff4cc', bgGradient: 'linear-gradient(180deg, #ffe082 0%, #fff9c4 100%)', textColor: '#e65100', borderColor: '#ffb300', decorations: ['🎂', '🎈', '🎉'] },
  { id: 'theme_wedding', name: 'Lễ Cưới Romance', category: 'Ngày lễ', bgColor: '#fff0f5', bgGradient: 'linear-gradient(180deg, #ffe4e1 0%, #fff0f5 100%)', textColor: '#F4729A', borderColor: '#F4729A', decorations: ['💍', '🕊️', '💐'] },
  { id: 'theme_christmas', name: 'Giáng Sinh Tuyết', category: 'Ngày lễ', bgColor: '#e8f5e9', bgGradient: 'linear-gradient(180deg, #c8e6c9 0%, #e8f5e9 100%)', textColor: '#2e7d32', borderColor: '#c62828', decorations: ['🎄', '❄️', '🎅'] },
  { id: 'theme_valentine', name: 'Valentine Tình Nhân', category: 'Ngày lễ', bgColor: '#ffebee', bgGradient: 'linear-gradient(180deg, #ffcdd2 0%, #ffebee 100%)', textColor: '#c2185b', borderColor: '#e91e63', decorations: ['❤️', '🍫', '🌹'] },

  // Thời trang & Trào lưu
  { id: 'theme_butterflies', name: 'Cánh Bướm Tím', category: 'Thời trang', bgColor: '#f3e5f5', bgGradient: 'linear-gradient(180deg, #e1bee7 0%, #f3e5f5 100%)', textColor: '#6a1b9a', borderColor: '#ab47bc', decorations: ['🦋', '✨', '💜'] },
  { id: 'theme_sky', name: 'Mây Trời Xanh', category: 'Thời trang', bgColor: '#e0f2fe', bgGradient: 'linear-gradient(180deg, #bae6fd 0%, #f0f9ff 100%)', textColor: '#0369a1', borderColor: '#38bdf8', decorations: ['☁️', '🕊️', '✨'] },
  { id: 'theme_summer', name: 'Summer Vibe', category: 'Trào lưu', bgColor: '#e1f5fe', bgGradient: 'linear-gradient(180deg, #81d4fa 0%, #e1f5fe 100%)', textColor: '#0277bd', borderColor: '#039be5', decorations: ['🌊', '☀️', '🏄'] },
  { id: 'theme_sunset_glow', name: 'Hoàng Hôn Sunset', category: 'Trào lưu', bgColor: '#fff1f2', bgGradient: 'linear-gradient(180deg, #fed7aa 0%, #f472b6 100%)', textColor: '#831843', borderColor: '#fb7185', decorations: ['🌅', '✨', '🧡'] },
  { id: 'theme_checker', name: 'Y2K Ca-rô', category: 'Trào lưu', bgColor: '#f5f5f5', bgGradient: 'linear-gradient(180deg, #e0e0e0 0%, #ffffff 100%)', textColor: '#212121', borderColor: '#000000', decorations: ['🏁', '⚡', '🖤'] },
  { id: 'theme_cyber_neon', name: 'Cyber Y2K Neon', category: 'Trào lưu', bgColor: '#18181b', bgGradient: 'linear-gradient(180deg, #312e81 0%, #831843 100%)', textColor: '#f43f5e', borderColor: '#ec4899', decorations: ['⚡', '💿', '🛸'] },
  { id: 'theme_mushroom', name: 'Nấm Cute Farm', category: 'Khác', bgColor: '#f9fbe7', bgGradient: 'linear-gradient(180deg, #dce775 0%, #f9fbe7 100%)', textColor: '#558b2f', borderColor: '#8bc34a', decorations: ['🍄', '🌻', '🐤'] },
  { id: 'theme_vintage_paper', name: 'Giấy Báo Retro', category: 'Khác', bgColor: '#faf6ee', bgGradient: 'linear-gradient(180deg, #f5ebd9 0%, #fbf8f2 100%)', textColor: '#45322e', borderColor: '#a88a6d', decorations: ['📰', '☕', '📜'] },
]

// ─── Stickers Trang Trí ───────────────────────────────────────────────────────
export type StickerCategory = 'Heart' | 'Emoji' | 'Cute' | 'Event' | 'Styles'

export interface StickerOption {
  id: string
  category: StickerCategory
  icon: string
  label: string
}

export const STICKER_LIBRARY: StickerOption[] = [
  // Heart
  { id: 'st_heart_pink', category: 'Heart', icon: '💖', label: 'Lấp lánh' },
  { id: 'st_heart_sparkle', category: 'Heart', icon: '💕', label: 'Trái tim đôi' },
  { id: 'st_heart_love', category: 'Heart', icon: '❤️', label: 'Tình yêu' },
  { id: 'st_heart_ribbon', category: 'Heart', icon: '💝', label: 'Hộp quà' },
  { id: 'st_heart_growing', category: 'Heart', icon: '💗', label: 'Rộn ràng' },

  // Cute
  { id: 'st_cute_bunny', category: 'Cute', icon: '🐰', label: 'Thỏ con' },
  { id: 'st_cute_cat', category: 'Cute', icon: '🐱', label: 'Mèo cưng' },
  { id: 'st_cute_butterfly', category: 'Cute', icon: '🦋', label: 'Bướm tím' },
  { id: 'st_cute_mushroom', category: 'Cute', icon: '🍄', label: 'Nấm đỏ' },
  { id: 'st_cute_rainbow', category: 'Cute', icon: '🌈', label: 'Cầu vồng' },
  { id: 'st_cute_chick', category: 'Cute', icon: '🐤', label: 'Gà con' },

  // Emoji
  { id: 'st_emoji_wink', category: 'Emoji', icon: '😉', label: 'Nháy mắt' },
  { id: 'st_emoji_stars', category: 'Emoji', icon: '🤩', label: 'Mắt sao' },
  { id: 'st_emoji_kiss', category: 'Emoji', icon: '😘', label: 'Thổi hôn' },
  { id: 'st_emoji_cool', category: 'Emoji', icon: '😎', label: 'Ngầu lòi' },

  // Event
  { id: 'st_event_cake', category: 'Event', icon: '🎂', label: 'Bánh kem' },
  { id: 'st_event_balloon', category: 'Event', icon: '🎈', label: 'Bóng bay' },
  { id: 'st_event_cheers', category: 'Event', icon: '🥂', label: 'Nâng ly' },
  { id: 'st_event_flower', category: 'Event', icon: '🌸', label: 'Hoa anh đào' },
  { id: 'st_event_sun', category: 'Event', icon: '☀️', label: 'Mặt trời' },

  // Styles
  { id: 'st_style_crown', category: 'Styles', icon: '👑', label: 'Vương miện' },
  { id: 'st_style_glasses', category: 'Styles', icon: '🕶️', label: 'Kính râm' },
  { id: 'st_style_bandaid', category: 'Styles', icon: '🩹', label: 'Băng cá nhân' },
  { id: 'st_style_sparkle', category: 'Styles', icon: '✨', label: 'Ánh sao' },
  { id: 'st_style_fries', category: 'Styles', icon: '🍟', label: 'Khoai tây chiên' },
]

export interface PlacedSticker {
  id: string
  icon: string
  x: number // percent 0 - 100
  y: number // percent 0 - 100
  scale: number
  rotation: number
}

// ─── Bộ Lọc Màu (Color Filters) ───────────────────────────────────────────────
export interface ColorFilterItem {
  id: string
  name: string
  cssFilter: string
  tag: string
  previewColor: string
}

export const COLOR_FILTERS: ColorFilterItem[] = [
  { id: 'normal',       name: 'Tự nhiên',       cssFilter: 'none', tag: 'GỐC', previewColor: '#ffffff' },
  { id: 'rosy_pastel',  name: 'Hồng Pastel',    cssFilter: 'contrast(1.04) brightness(1.08) saturate(1.18) hue-rotate(-6deg)', tag: 'HOT', previewColor: '#ffd1dc' },
  { id: 'korean_soft',  name: 'Hàn Quốc Soft',  cssFilter: 'contrast(0.96) brightness(1.12) saturate(1.08) sepia(0.08)', tag: 'TREND', previewColor: '#fff0f5' },
  { id: 'kodak_portra', name: 'Film Kodak',     cssFilter: 'sepia(0.18) contrast(1.08) brightness(1.06) saturate(1.22)', tag: 'FILM', previewColor: '#fde047' },
  { id: 'cool_cyan',    name: 'Xanh Lạnh Y2K',  cssFilter: 'contrast(1.05) brightness(1.10) saturate(1.12) hue-rotate(12deg)', tag: 'COLD', previewColor: '#bae6fd' },
  { id: 'peachy_glow',  name: 'Đào Cam Mọng',   cssFilter: 'contrast(1.06) brightness(1.09) saturate(1.25) hue-rotate(-10deg)', tag: 'PEACH', previewColor: '#fbcfe8' },
  { id: 'tokyo_airy',   name: 'Nhật Bản Soft',  cssFilter: 'contrast(0.92) brightness(1.15) saturate(1.10)', tag: 'AIRY', previewColor: '#e0e7ff' },
  { id: 'vintage_noir', name: 'Cổ điển B&W',    cssFilter: 'grayscale(100%) contrast(1.18) brightness(1.05)', tag: 'B&W', previewColor: '#334155' },
  { id: 'mono_moody',   name: 'Monochrome Sâu', cssFilter: 'grayscale(100%) contrast(1.35) brightness(0.98)', tag: 'MOODY', previewColor: '#18181b' },
  { id: 'retro_90s',    name: 'Retro 90s',      cssFilter: 'sepia(0.28) contrast(1.14) brightness(1.02) saturate(1.28)', tag: '90S', previewColor: '#d97706' },
  { id: 'warm_sunset',  name: 'Nắng Hoàng Hôn', cssFilter: 'sepia(0.25) saturate(1.20) contrast(1.02) brightness(1.05)', tag: 'WARM', previewColor: '#fed7aa' },
]

export interface CapturedPhoto {
  id: string
  rawPath: string
  enhancedPath: string
  compositedPath: string
  timestamp: number
}

export interface DiscountCoupon {
  code: string
  type: 'percent' | 'fixed'
  value: number // % hoặc số tiền VND
  description: string
}

export const DEFAULT_DISCOUNT_COUPONS: DiscountCoupon[] = [
  { code: 'JOYBOOTH10', type: 'percent', value: 10, description: 'Giảm 10% tổng hóa đơn' },
  { code: 'GIAM20K', type: 'fixed', value: 20000, description: 'Giảm trực tiếp 20.000đ' },
  { code: 'FREE', type: 'percent', value: 100, description: 'Miễn phí trải nghiệm (0đ)' },
  { code: 'VIP2026', type: 'percent', value: 20, description: 'Khách hàng thân thiết VIP (-20%)' },
]

export interface SessionState {
  sessionId: string
  photos: CapturedPhoto[]
  selectedFrameSize: FrameSize
  selectedLayout: GridLayoutItem
  selectedTheme: ThemeItem
  placedStickers: PlacedSticker[]
  qrUrl: string | null
  qrImagePath: string | null
  timelapseUrl: string | null
  gdriveUrl: string | null
  // Thông tin thanh toán đã chốt
  paidAmount: number
  paidCopies: number
  paymentMethod: 'vietqr' | 'cash' | 'free' | null
  discountCodeUsed: string | null
  discountAmount: number
}

// ─── Preset Làm Đẹp K-Beauty (Beauty Presets) ──────────────────────────────────
export interface BeautyPreset {
  id: string
  name: string
  icon: string
  description: string
  smoothing: number     // 0 - 100
  rosyTone: number      // 0 - 100
  glowClarity: number   // 0 - 100
  brightness: number    // 70 - 130 (100 là gốc)
  contrast: number      // 70 - 130
}

export const BEAUTY_PRESETS: BeautyPreset[] = [
  {
    id: 'korean_glass',
    name: 'Trắng Hồng Hàn Quốc',
    icon: '🌸',
    description: 'Làn da sứ trong veo, căng bóng mịn màng chuẩn K-Beauty (Khuyên Dùng)',
    smoothing: 42,
    rosyTone: 28,
    glowClarity: 22,
    brightness: 106,
    contrast: 98,
  },
  {
    id: 'natural',
    name: 'Tự Nhiên',
    icon: '🌿',
    description: 'Nét mộc chân thật, làm mịn nhẹ nhàng tự nhiên',
    smoothing: 20,
    rosyTone: 10,
    glowClarity: 15,
    brightness: 100,
    contrast: 100,
  },
  {
    id: 'haru_soft',
    name: 'Trong Trẻo Haru',
    icon: '❄️',
    description: 'Tông sáng mộng mơ, mềm mại trong trẻo phong cách Haru Film',
    smoothing: 38,
    rosyTone: 15,
    glowClarity: 26,
    brightness: 108,
    contrast: 97,
  },
  {
    id: 'peachy_glow',
    name: 'Má Đào Pastel',
    icon: '🍑',
    description: 'Má ửng hồng tươi tắn, ngọt ngào tràn đầy sức sống',
    smoothing: 35,
    rosyTone: 42,
    glowClarity: 18,
    brightness: 104,
    contrast: 100,
  },
  {
    id: 'studio_glam',
    name: 'Studio Glam',
    icon: '👑',
    description: 'Sắc nét nổi bật, tôn khối mắt và sống mũi rạng rỡ',
    smoothing: 25,
    rosyTone: 18,
    glowClarity: 45,
    brightness: 104,
    contrast: 104,
  },
]

export interface EventConfig {
  eventName: string
  eventLogo: string | null
  date: string
  operatorName: string
  countdownSeconds: number
  printEnabled: boolean
  printCopies: number
  qrEnabled: boolean
  // Chế độ chụp Photobooth vs Selfbooth
  captureMode: CaptureMode  // 'photobooth' | 'selfbooth'
  selfboothDurationSeconds: number // Thời gian giới hạn phiên Selfbooth (giây, mặc định 60s)
  // VietQR Kiosk Payment Settings
  paymentQrEnabled: boolean // Bật/tắt thanh toán QR
  paymentRequiredForPhotobooth: boolean // Yêu cầu thanh toán trước khi chụp Photobooth (Mặc định true)
  paymentRequiredForSelfbooth: boolean  // Yêu cầu thanh toán trước khi chụp Selfbooth (Mặc định false)
  bankBin: string           // Mã BIN ngân hàng (VD: 970422 - MB, 970436 - Vietcombank)
  bankName: string          // Tên hiển thị ngân hàng
  accountNumber: string     // Số tài khoản ngân hàng
  accountHolder: string     // Tên chủ tài khoản
  price2x6: number          // Giá gói 2x6 (VND)
  price4x6: number          // Giá gói 4x6 (VND)
  extraCopyPrice2x6: number // Giá bản in thêm 2x6 (VND)
  extraCopyPrice4x6: number // Giá bản in thêm 4x6 (VND)
  discountCoupons: DiscountCoupon[] // Danh sách mã giảm giá
  idleTimeoutSeconds: number
  // Timelapse Video Settings
  timelapseEnabled: boolean
  timelapseSpeed: number // 1.5, 2.0, 2.5, 3.0, 4.0
  // Google Drive Cloud Sync Settings
  gdriveEnabled: boolean
  gdriveFolderId: string
  gdriveFolderUrl: string
  gdriveWebhookUrl: string // URL Google Apps Script Web App để tạo subfolder tự động
  gdriveAutoSync: boolean
  // Storage Settings
  saveDirectory: string
}

// ─── Global App Store ─────────────────────────────────────────────────────────

interface AppStore {
  // Navigation
  screen: AppScreen
  setScreen: (screen: AppScreen) => void

  // Mode
  boothMode: BoothMode
  setBoothMode: (mode: BoothMode) => void

  // Session
  session: SessionState | null
  startNewSession: () => void
  addPhoto: (photo: CapturedPhoto) => void
  setSessionPhotos: (photos: CapturedPhoto[]) => void
  replaceSessionPhotoAt: (index: number, photo: CapturedPhoto) => void
  removeSessionPhotoAt: (index: number) => void
  clearSession: () => void
  setQr: (url: string, imagePath: string) => void
  setTimelapseUrl: (url: string | null) => void
  setGdriveUrl: (url: string | null) => void

  // Mode settings
  setCaptureMode: (mode: CaptureMode) => void
  setSelfboothDurationSeconds: (seconds: number) => void

  // Step 1: Chọn Khung Hình (2x6 inch vs 4x6 inch) & Số lượng in
  selectedFrameSize: FrameSize
  selectFrameSize: (size: FrameSize) => void
  selectedCopies: number
  setSelectedCopies: (copies: number) => void
  setSessionPayment: (data: {
    paidAmount: number
    paidCopies: number
    paymentMethod: 'vietqr' | 'cash' | 'free'
    discountCodeUsed: string | null
    discountAmount: number
  }) => void

  // Step 2: Chọn Bố Cục (1, 3, 4, 6, 8 ảnh)
  selectedCategory: LayoutCategory
  selectCategory: (cat: LayoutCategory) => void
  selectedLayout: GridLayoutItem
  selectLayout: (layout: GridLayoutItem) => void

  // Step 3 (Post Capture): Chọn Chủ Đề
  selectedTheme: ThemeItem
  selectTheme: (theme: ThemeItem) => void

  // Step 4 (Post Capture): Chọn Sticker
  placedStickers: PlacedSticker[]
  addSticker: (icon: string) => string
  updateSticker: (id: string, updates: Partial<PlacedSticker>) => void
  removeSticker: (id: string) => void
  clearStickers: () => void

  // Color Filters, Adjustments & Lighting
  selectedFilter: ColorFilterItem
  selectFilter: (filter: ColorFilterItem) => void
  selectedBeautyPreset: string | null
  applyBeautyPreset: (presetId: string) => void
  brightnessAdjust: number
  contrastAdjust: number
  saturationAdjust: number
  skinSmoothing: number // 0 - 100 Làm mịn da
  rosyTone: number      // 0 - 100 Trắng hồng
  glowClarity: number   // 0 - 100 Sáng nét
  setBrightnessAdjust: (val: number) => void
  setContrastAdjust: (val: number) => void
  setSaturationAdjust: (val: number) => void
  setSkinSmoothing: (val: number) => void
  setRosyTone: (val: number) => void
  setGlowClarity: (val: number) => void
  resetAdjustments: () => void
  getEffectiveFilterCss: () => string
  ringLightEnabled: boolean
  ringLightLevel: number
  setRingLightEnabled: (enabled: boolean) => void
  setRingLightLevel: (level: number) => void

  // Countdown (3s, 5s, 10s)
  countdownSeconds: number
  setCountdownSeconds: (sec: number) => void

  // Event config
  eventConfig: EventConfig
  setEventConfig: (config: Partial<EventConfig>) => void

  // Camera
  availableCameras: Array<{ id: string; name: string }>
  selectedCameraId: string | null
  mirrorCamera: boolean
  setCameras: (cameras: Array<{ id: string; name: string }>) => void
  selectCamera: (id: string) => void
  setMirrorCamera: (mirror: boolean) => void
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_EVENT_CONFIG: EventConfig = {
  eventName: 'FUN STUDIO PHOTOBOOTH',
  eventLogo: null,
  date: new Date().toISOString().split('T')[0],
  operatorName: '',
  countdownSeconds: 3,
  printEnabled: true,
  printCopies: 2,
  qrEnabled: true,
  // Chế độ chụp Photobooth vs Selfbooth
  captureMode: 'photobooth',
  selfboothDurationSeconds: 60,
  // VietQR Kiosk Payment Settings
  paymentQrEnabled: true,
  paymentRequiredForPhotobooth: true,
  paymentRequiredForSelfbooth: false,
  bankBin: '970422', // MB Bank
  bankName: 'MB Bank (Quân Đội)',
  accountNumber: '0388889999',
  accountHolder: 'JOYBOOTH VIETNAM',
  price2x6: 50000,
  price4x6: 70000,
  extraCopyPrice2x6: 25000,
  extraCopyPrice4x6: 35000,
  discountCoupons: DEFAULT_DISCOUNT_COUPONS,
  idleTimeoutSeconds: 60,
  timelapseEnabled: true,
  timelapseSpeed: 2.5,
  gdriveEnabled: true,
  gdriveFolderId: '1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU',
  gdriveFolderUrl: 'https://drive.google.com/drive/folders/1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU',
  gdriveWebhookUrl: 'https://script.google.com/macros/s/AKfycbwaxURdY_LUzje8k_IXilHcQiCXnvICL5Xo767cm6RwPsYjE2yJp-I3bE_jpQ3i66J7/exec',
  gdriveAutoSync: true,
  saveDirectory: 'Downloads/JoyBooth',
}

export const useAppStore = create<AppStore>((set, get) => ({
  screen: 'idle',
  setScreen: (screen) => set({ screen }),

  boothMode: 'unattended',
  setBoothMode: (boothMode) => set({ boothMode }),

  selectedFrameSize: '2x6',
  selectFrameSize: (size) => {
    if (size === '2x6') {
      const defaultLayout = ALL_LAYOUTS[4][0]
      set({
        selectedFrameSize: size,
        selectedCategory: 4,
        selectedLayout: defaultLayout,
        selectedCopies: 2,
      })
    } else {
      const defaultLayout = ALL_LAYOUTS[4][1] || ALL_LAYOUTS[4][0]
      set({
        selectedFrameSize: size,
        selectedCategory: 4,
        selectedLayout: defaultLayout,
        selectedCopies: 1,
      })
    }
  },

  selectedCopies: 2,
  setSelectedCopies: (selectedCopies) => set({ selectedCopies }),

  setSessionPayment: (data) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            ...data,
          }
        : null,
    })),

  selectedCategory: 4,
  selectCategory: (cat) => {
    const list = ALL_LAYOUTS[cat] || ALL_LAYOUTS[4]
    set({ selectedCategory: cat, selectedLayout: list[0] })
  },
  selectedLayout: ALL_LAYOUTS[4][0],
  selectLayout: (layout) => set({ selectedLayout: layout }),

  selectedTheme: THEME_OPTIONS[0],
  selectTheme: (theme) => set({ selectedTheme: theme }),

  placedStickers: [],
  addSticker: (icon) => {
    const newId = `st_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    set((state) => ({
      placedStickers: [
        ...state.placedStickers,
        {
          id: newId,
          icon,
          x: Math.floor(30 + Math.random() * 40),
          y: Math.floor(30 + Math.random() * 40),
          scale: 1,
          rotation: Math.floor((Math.random() - 0.5) * 20),
        },
      ],
    }))
    return newId
  },
  updateSticker: (id, updates) =>
    set((state) => ({
      placedStickers: state.placedStickers.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeSticker: (id) =>
    set((state) => ({
      placedStickers: state.placedStickers.filter((s) => s.id !== id),
    })),
  clearStickers: () => set({ placedStickers: [] }),

  session: null,
  startNewSession: () =>
    set({
      session: {
        sessionId: generateSessionId(),
        photos: [],
        selectedFrameSize: get().selectedFrameSize,
        selectedLayout: get().selectedLayout,
        selectedTheme: get().selectedTheme,
        placedStickers: [],
        qrUrl: null,
        qrImagePath: null,
        timelapseUrl: null,
        gdriveUrl: null,
        paidAmount: 0,
        paidCopies: get().selectedCopies,
        paymentMethod: null,
        discountCodeUsed: null,
        discountAmount: 0,
      },
      placedStickers: [],
    }),

  addPhoto: (photo) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, photos: [...state.session.photos, photo] }
        : state.session,
    })),

  setSessionPhotos: (photos) =>
    set((state) => ({
      session: state.session ? { ...state.session, photos } : state.session,
    })),

  replaceSessionPhotoAt: (index, photo) =>
    set((state) => {
      if (!state.session) return { session: state.session }
      const newPhotos = [...state.session.photos]
      newPhotos[index] = photo
      return { session: { ...state.session, photos: newPhotos } }
    }),

  removeSessionPhotoAt: (index) =>
    set((state) => {
      if (!state.session) return { session: state.session }
      const newPhotos = state.session.photos.filter((_, i) => i !== index)
      return { session: { ...state.session, photos: newPhotos } }
    }),

  setCaptureMode: (captureMode) =>
    set((state) => ({
      eventConfig: { ...state.eventConfig, captureMode },
    })),

  setSelfboothDurationSeconds: (selfboothDurationSeconds) =>
    set((state) => ({
      eventConfig: { ...state.eventConfig, selfboothDurationSeconds },
    })),

  clearSession: () => set({ session: null, placedStickers: [] }),

  setQr: (url, imagePath) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, qrUrl: url, qrImagePath: imagePath }
        : state.session,
    })),

  setTimelapseUrl: (url) =>
    set((state) => ({
      session: state.session ? { ...state.session, timelapseUrl: url } : state.session,
    })),

  setGdriveUrl: (url) =>
    set((state) => ({
      session: state.session ? { ...state.session, gdriveUrl: url } : state.session,
    })),

  selectedFilter: COLOR_FILTERS[0],
  selectFilter: (filter) => set({ selectedFilter: filter }),

  selectedBeautyPreset: 'korean_glass',
  applyBeautyPreset: (presetId) => {
    const preset = BEAUTY_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    set({
      selectedBeautyPreset: presetId,
      skinSmoothing: preset.smoothing,
      rosyTone: preset.rosyTone,
      glowClarity: preset.glowClarity,
      brightnessAdjust: preset.brightness,
      contrastAdjust: preset.contrast,
    })
  },

  brightnessAdjust: 106,
  contrastAdjust: 98,
  saturationAdjust: 100,
  skinSmoothing: 42, // Mặc định chuẩn làn da trắng hồng Hàn Quốc
  rosyTone: 28,      // Trắng hồng 28%
  glowClarity: 22,   // Sáng nét 22%
  setBrightnessAdjust: (brightnessAdjust) => set({ brightnessAdjust, selectedBeautyPreset: null }),
  setContrastAdjust: (contrastAdjust) => set({ contrastAdjust, selectedBeautyPreset: null }),
  setSaturationAdjust: (saturationAdjust) => set({ saturationAdjust, selectedBeautyPreset: null }),
  setSkinSmoothing: (skinSmoothing) => set({ skinSmoothing, selectedBeautyPreset: null }),
  setRosyTone: (rosyTone) => set({ rosyTone, selectedBeautyPreset: null }),
  setGlowClarity: (glowClarity) => set({ glowClarity, selectedBeautyPreset: null }),
  resetAdjustments: () =>
    set({
      selectedBeautyPreset: null,
      brightnessAdjust: 100,
      contrastAdjust: 100,
      saturationAdjust: 100,
      skinSmoothing: 0,
      rosyTone: 0,
      glowClarity: 0,
    }),
  getEffectiveFilterCss: () => {
    const {
      selectedFilter,
      brightnessAdjust,
      contrastAdjust,
      saturationAdjust,
      skinSmoothing,
      rosyTone,
      glowClarity,
    } = get()
    const base = selectedFilter.cssFilter === 'none' ? '' : selectedFilter.cssFilter

    // Tính toán độ sáng, tương phản, độ bão hòa
    const b = brightnessAdjust !== 100 ? `brightness(${brightnessAdjust / 100})` : ''
    const c = contrastAdjust !== 100 ? `contrast(${contrastAdjust / 100})` : ''
    const s = saturationAdjust !== 100 ? `saturate(${saturationAdjust / 100})` : ''

    // Hiệu ứng làm đẹp chuẩn Hàn Quốc (K-Beauty Bojeong):
    // Làm mịn da (Skin Smoothing): micro-blur + soft glow làm mờ nếp nhăn & lỗ chân lông
    const smooth = skinSmoothing > 0 ? `blur(${(skinSmoothing * 0.0065).toFixed(2)}px)` : ''
    // Trắng hồng (Rosy tone): hơi ngả ấm nhẹ nhàng và làm tươi màu môi, má đào
    const rosy =
      rosyTone > 0
        ? `hue-rotate(-${(rosyTone * 0.075).toFixed(1)}deg) saturate(${1 + rosyTone * 0.0025})`
        : ''
    // Sáng nét (Clarity): tăng tương phản chi tiết viền tóc, lông mi, sống mũi
    const clarity =
      glowClarity > 0 ? `contrast(${1 + glowClarity * 0.0016})` : ''

    const parts = [base, b, c, s, smooth, rosy, clarity].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : 'none'
  },

  ringLightEnabled: true,
  ringLightLevel: 75,
  setRingLightEnabled: (ringLightEnabled) => set({ ringLightEnabled }),
  setRingLightLevel: (ringLightLevel) => set({ ringLightLevel }),

  countdownSeconds: 3,
  setCountdownSeconds: (countdownSeconds) =>
    set((state) => ({
      countdownSeconds,
      eventConfig: { ...state.eventConfig, countdownSeconds },
    })),

  eventConfig: DEFAULT_EVENT_CONFIG,
  setEventConfig: (config) =>
    set((state) => ({ eventConfig: { ...state.eventConfig, ...config } })),

  availableCameras: [],
  selectedCameraId: null,
  mirrorCamera: true,
  setCameras: (cameras) => set({ availableCameras: cameras }),
  selectCamera: (id) => set({ selectedCameraId: id }),
  setMirrorCamera: (mirrorCamera) => set({ mirrorCamera }),
}))
