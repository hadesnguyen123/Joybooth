import { useState } from 'react'
import { CmsProvider, useCms } from './context/CmsContext'
import Sidebar, { type NavTab } from './components/Sidebar'
import Header from './components/Header'
import DashboardView from './views/DashboardView'
import KiosksView from './views/KiosksView'
import FramesView from './views/FramesView'
import LayoutsView from './views/LayoutsView'
import PricingView from './views/PricingView'
import CouponsView from './views/CouponsView'
import AccountingView from './views/AccountingView'
import SettingsView from './views/SettingsView'
import './App.css'

const TAB_META: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Bảng điều khiển trung tâm',
    subtitle: 'Tổng quan doanh thu, dung lượng lưu trữ và tình trạng 2 máy Kiosk',
  },
  kiosks: {
    title: 'Giám sát Kiosks từ xa',
    subtitle: 'Theo dõi giấy in, nhiệt độ máy in, trạng thái phần cứng và khóa máy khẩn cấp',
  },
  frames: {
    title: 'Quản lý khung hình (Frames)',
    subtitle: 'Kho 87 khung ảnh phân loại 2x6 Photo Strip & 4x6 Postcard',
  },
  layouts: {
    title: 'Cấu hình Layout bố cục',
    subtitle: 'Khai báo thông số kỹ thuật, tỷ lệ khung hình và kích thước in ấn',
  },
  pricing: {
    title: 'Cài đặt Bảng giá & Dịch vụ',
    subtitle: 'Cập nhật giá gói chụp và giá in ảnh thêm, tự động đồng bộ xuống 2 Kiosk',
  },
  coupons: {
    title: 'Quản lý Mã giảm giá (Coupons)',
    subtitle: 'Thiết lập voucher khuyến mãi cố định (VND) hoặc phần trăm (%)',
  },
  accounting: {
    title: 'Kế toán & Đối soát 3 bên',
    subtitle: 'Đối soát Doanh thu VietQR ngân hàng vs Tiền mặt két vs Lượng giấy in thực tế',
  },
  settings: {
    title: 'Cấu hình Hệ thống & Tích hợp',
    subtitle: 'Thiết lập VietQR động, Webhook Casso và Lưu trữ Google Drive',
  },
}

function CmsLayout() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard')
  const { kiosks, frames, coupons, isBackendConnected } = useCms()

  const onlineKiosks = kiosks.filter((k) => k.status === 'online').length
  const totalKiosks = kiosks.length
  const activeFrames = frames.length
  const activeCoupons = coupons.length

  const { title, subtitle } = TAB_META[currentTab]

  return (
    <div className="cms-app">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        kioskCount={totalKiosks}
        frameCount={activeFrames}
        couponCount={activeCoupons}
      />

      <div className="cms-main">
        <Header
          title={title}
          subtitle={subtitle}
          onlineKioskCount={onlineKiosks}
          totalKioskCount={totalKiosks}
          isBackendConnected={isBackendConnected}
        />

        <main className="cms-content-scroll">
          {currentTab === 'dashboard' && <DashboardView />}
          {currentTab === 'kiosks' && <KiosksView />}
          {currentTab === 'frames' && <FramesView />}
          {currentTab === 'layouts' && <LayoutsView />}
          {currentTab === 'pricing' && <PricingView />}
          {currentTab === 'coupons' && <CouponsView />}
          {currentTab === 'accounting' && <AccountingView />}
          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <CmsProvider>
      <CmsLayout />
    </CmsProvider>
  )
}
