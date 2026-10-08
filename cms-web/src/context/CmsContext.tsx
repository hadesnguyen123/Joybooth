import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
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
  isBackendConnected: boolean
  // Actions
  toggleKioskLock: (kioskId: string) => Promise<void>
  refillPaper: (kioskId: string, amount?: number) => Promise<void>
  updatePricing: (newPricing: Partial<PricingConfig>) => Promise<void>
  addCoupon: (coupon: DiscountCoupon) => Promise<void>
  toggleCoupon: (code: string) => Promise<void>
  deleteCoupon: (code: string) => Promise<void>
  toggleFrame: (frameId: string) => Promise<void>
  addFrame: (frame: FrameItem) => Promise<void>
  exportAccountingCSV: () => void
  refreshData: () => Promise<void>
}

const CmsContext = createContext<CmsContextType | null>(null)

export function CmsProvider({ children }: { children: ReactNode }) {
  const [kpis, setKpis] = useState<SystemKPIs>(INITIAL_KPIS)
  const [kiosks, setKiosks] = useState<KioskDevice[]>(INITIAL_KIOSKS)
  const [pricing, setPricing] = useState<PricingConfig>(INITIAL_PRICING)
  const [coupons, setCoupons] = useState<DiscountCoupon[]>(INITIAL_COUPONS)
  const [frames, setFrames] = useState<FrameItem[]>(INITIAL_FRAMES)
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)

  // Đồng bộ dữ liệu với Backend MVC API
  const refreshData = async () => {
    try {
      const [kpisRes, kiosksRes, pricingRes, couponsRes, framesRes, txnsRes] =
        await Promise.all([
          fetch('/api/kpis').catch(() => null),
          fetch('/api/kiosks').catch(() => null),
          fetch('/api/pricing').catch(() => null),
          fetch('/api/coupons').catch(() => null),
          fetch('/api/frames').catch(() => null),
          fetch('/api/transactions').catch(() => null),
        ])

      let connected = false

      if (kpisRes?.ok) {
        const json = await kpisRes.json()
        if (json.success && json.data) {
          setKpis(json.data)
          connected = true
        }
      }
      if (kiosksRes?.ok) {
        const json = await kiosksRes.json()
        if (json.success && json.data) setKiosks(json.data)
      }
      if (pricingRes?.ok) {
        const json = await pricingRes.json()
        if (json.success && json.data) setPricing(json.data)
      }
      if (couponsRes?.ok) {
        const json = await couponsRes.json()
        if (json.success && json.data) setCoupons(json.data)
      }
      if (framesRes?.ok) {
        const json = await framesRes.json()
        if (json.success && json.data) setFrames(json.data)
      }
      if (txnsRes?.ok) {
        const json = await txnsRes.json()
        if (json.success && json.data) setTransactions(json.data)
      }

      setIsBackendConnected(connected)
    } catch {
      setIsBackendConnected(false)
    }
  }

  useEffect(() => {
    refreshData()
    const timer = setInterval(refreshData, 10000)
    return () => clearInterval(timer)
  }, [])

  // 1. Khóa / Mở Kiosk từ xa
  async function toggleKioskLock(kioskId: string) {
    setKiosks((prev) =>
      prev.map((k) => (k.id === kioskId ? { ...k, isLocked: !k.isLocked } : k))
    )
    try {
      await fetch(`/api/kiosks/${kioskId}/lock`, { method: 'POST' })
    } catch {
      // Ignored
    }
  }

  // 2. Thay cuộn giấy mới (Reset bộ đếm 400 tờ)
  async function refillPaper(kioskId: string, amount = 400) {
    setKiosks((prev) =>
      prev.map((k) =>
        k.id === kioskId
          ? { ...k, paperRemaining: amount, paperCapacity: amount, printerStatus: 'ready' }
          : k
      )
    )
    try {
      await fetch(`/api/kiosks/${kioskId}/refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
    } catch {
      // Ignored
    }
  }

  // 3. Cập nhật bảng giá
  async function updatePricing(newPricing: Partial<PricingConfig>) {
    setPricing((prev) => ({ ...prev, ...newPricing }))
    try {
      await fetch('/api/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPricing),
      })
    } catch {
      // Ignored
    }
  }

  // 4. Thêm & Bật/Tắt Voucher
  async function addCoupon(coupon: DiscountCoupon) {
    setCoupons((prev) => [coupon, ...prev])
    try {
      await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon),
      })
    } catch {
      // Ignored
    }
  }

  async function toggleCoupon(code: string) {
    setCoupons((prev) =>
      prev.map((c) => (c.code === code ? { ...c, isActive: !c.isActive } : c))
    )
    try {
      await fetch(`/api/coupons/${code}/toggle`, { method: 'POST' })
    } catch {
      // Ignored
    }
  }

  async function deleteCoupon(code: string) {
    setCoupons((prev) => prev.filter((c) => c.code !== code))
    try {
      await fetch(`/api/coupons/${code}`, { method: 'DELETE' })
    } catch {
      // Ignored
    }
  }

  // 5. Bật/Tắt Khung ảnh & Thêm khung
  async function toggleFrame(frameId: string) {
    setFrames((prev) =>
      prev.map((f) => (f.id === frameId ? { ...f, isActive: !f.isActive } : f))
    )
    try {
      await fetch(`/api/frames/${frameId}/toggle`, { method: 'POST' })
    } catch {
      // Ignored
    }
  }

  async function addFrame(frame: FrameItem) {
    setFrames((prev) => [frame, ...prev])
    setKpis((prev) => ({ ...prev, totalFrames: prev.totalFrames + 1 }))
    try {
      await fetch('/api/frames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frame),
      })
    } catch {
      // Ignored
    }
  }

  // 6. Xuất báo cáo kế toán CSV
  function exportAccountingCSV() {
    window.open('/api/accounting/export', '_blank')
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
        isBackendConnected,
        toggleKioskLock,
        refillPaper,
        updatePricing,
        addCoupon,
        toggleCoupon,
        deleteCoupon,
        toggleFrame,
        addFrame,
        exportAccountingCSV,
        refreshData,
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
