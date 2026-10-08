// Types cho JoyBooth Cloud CMS

export interface KioskDevice {
  id: string
  name: string
  location: string
  ipAddress: string
  status: 'online' | 'offline' | 'busy' | 'warning'
  paperRemaining: number
  paperCapacity: number
  temperature: number
  cameraModel: string
  printerModel: string
  lastHeartbeat: string
  isLocked: boolean
}

export interface FrameItem {
  id: string
  name: string
  size: '2x6' | '4x6'
  category: 'Một màu' | 'Ngày lễ' | 'Thời trang' | 'Trào lưu' | 'Khác'
  previewUrl: string
  bgColor: string
  textColor: string
  isActive: boolean
  usageCount: number
}

export interface DiscountCoupon {
  code: string
  type: 'percent' | 'fixed'
  value: number
  description: string
  isActive: boolean
  usageCount: number
  maxUsage: number
  expiryDate: string
}

export interface PricingConfig {
  price2x6: number
  price4x6: number
  extraCopyPrice2x6: number
  extraCopyPrice4x6: number
  currency: string
}

export interface TransactionRecord {
  id: string
  orderCode: string
  kioskId: string
  kioskName: string
  timestamp: string
  frameSize: '2x6' | '4x6'
  copies: number
  amount: number
  paymentMethod: 'vietqr' | 'cash' | 'free'
  couponCode: string | null
  discountAmount: number
  status: 'completed' | 'pending' | 'failed'
  gdriveUrl: string
}

export interface SystemKPIs {
  totalPhotos: number
  totalSessions: number
  totalLayouts: number
  totalFrames: number
  usedStorageGB: number
  totalStorageGB: number
  totalRevenueVND: number
  vietQrRevenueVND: number
  cashRevenueVND: number
}
