import { createContext, useContext, useState, type ReactNode } from 'react'
import type {
  KioskDevice,
  FrameItem,
  DiscountCoupon,
  PricingConfig,
  TransactionRecord,
  SystemKPIs,
} from '../types'
import {
  INITIAL_KPIS,
  INITIAL_KIOSKS,
  INITIAL_PRICING,
  INITIAL_COUPONS,
  INITIAL_FRAMES,
  INITIAL_TRANSACTIONS,
} from '../data/mockData'

interface CmsContextType {
  kpis: SystemKPIs
  kiosks: KioskDevice[]
  pricing: PricingConfig
  coupons: DiscountCoupon[]
  frames: FrameItem[]
  transactions: TransactionRecord[]
  // Actions
  toggleKioskLock: (kioskId: string) => void
  refillPaper: (kioskId: string, amount?: number) => void
  updatePricing: (newPricing: Partial<PricingConfig>) => void
  addCoupon: (coupon: DiscountCoupon) => void
  toggleCoupon: (code: string) => void
  deleteCoupon: (code: string) => void
  toggleFrame: (frameId: string) => void
  addFrame: (frame: FrameItem) => void
  exportAccountingCSV: () => void
}

const CmsContext = createContext<CmsContextType | null>(null)

export function CmsProvider({ children }: { children: ReactNode }) {
  const [kpis, setKpis] = useState<SystemKPIs>(INITIAL_KPIS)
  const [kiosks, setKiosks] = useState<KioskDevice[]>(INITIAL_KIOSKS)
  const [pricing, setPricing] = useState<PricingConfig>(INITIAL_PRICING)
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(INITIAL_COUPONS)
  const [frames, setFrames] = useState<FrameItem[]>(INITIAL_FRAMES)
  const [transactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS)

  // 1. Khóa / Mở Kiosk từ xa
  function toggleKioskLock(kioskId: string) {
    setKiosks((prev) =>
      prev.map((k) => (k.id === kioskId ? { ...k, isLocked: !k.isLocked } : k))
    )
  }

  // 2. Thay cuộn giấy mới (Reset bộ đếm)
  function refillPaper(kioskId: string, amount = 400) {
    setKiosks((prev) =>
      prev.map((k) =>
        k.id === kioskId ? { ...k, paperRemaining: amount, paperCapacity: amount } : k
      )
    )
  }

  // 3. Cập nhật bảng giá (Tự động sync xuống 2 máy)
  function updatePricing(newPricing: Partial<PricingConfig>) {
    setPricing((prev) => ({ ...prev, ...newPricing }))
  }

  // 4. Thêm & Bật/Tắt Voucher
  function addCoupon(coupon: DiscountCoupon) {
    setCoupons((prev) => [coupon, ...prev])
  }

  function toggleCoupon(code: string) {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, isActive: !c.isActive } : c))
    )
  }

  function deleteCoupon(code: string) {
    setCoupons((prev) => prev.filter((c) => c.code !== code))
  }

  // 5. Bật/Tắt Khung ảnh & Thêm khung
  function toggleFrame(frameId: string) {
    setFrames((prev) =>
      prev.map((f) => (f.id === frameId ? { ...f, isActive: !f.isActive } : f))
    )
  }

  function addFrame(frame: FrameItem) {
    setFrames((prev) => [frame, ...prev])
    setKpis((prev) => ({ ...prev, totalFrames: prev.totalFrames + 1 }))
  }

  // 6. Xuất báo cáo kế toán CSV đối soát 3 góc
  function exportAccountingCSV() {
    const headers = 'Mã Đơn,Thời Gian,Máy Kiosk,Khổ Ảnh,Số Bản In,Số Tiền (VND),Phương Thức,Mã Giảm Giá,Trạng Thái\n'
    const rows = transactions
      .map(
        (t) =>
          `"${t.orderCode}","${t.timestamp}","${t.kioskName}","${t.frameSize}",${t.copies},${t.amount},"${t.paymentMethod}","${t.couponCode || 'None'}","${t.status}"`
      )
      .join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `BaoCao_KeToan_JoyBooth_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <CmsContext.Provider
      value={{
        kpis,
        kiosks,
        pricing,
        coupons,
        frames,
        transactions,
        toggleKioskLock,
        refillPaper,
        updatePricing,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
        toggleFrame,
        addFrame,
        exportAccountingCSV,
      }}
    >
      {children}
    </CmsContext.Provider>
  )
}

export function useCms() {
  const context = useContext(CmsContext)
  if (!context) {
    throw new Error('useCms must be used within a CmsProvider')
  }
  return context
}
