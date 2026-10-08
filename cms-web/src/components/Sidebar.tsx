import {
  LayoutDashboard,
  Monitor,
  Image as ImageIcon,
  Columns,
  BadgePercent,
  Banknote,
  ReceiptText,
  Settings,
  Sparkles,
} from 'lucide-react'

export type NavTab =
  | 'dashboard'
  | 'kiosks'
  | 'frames'
  | 'layouts'
  | 'pricing'
  | 'coupons'
  | 'accounting'
  | 'settings'

interface SidebarProps {
  currentTab: NavTab
  onSelectTab: (tab: NavTab) => void
  kioskCount: number
  frameCount: number
  couponCount: number
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  kioskCount,
  frameCount,
  couponCount,
}: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Bảng điều khiển',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'kiosks' as NavTab,
      label: 'Thiết bị Kiosks',
      icon: Monitor,
      badge: `${kioskCount} máy`,
    },
    {
      id: 'frames' as NavTab,
      label: 'Khung hình',
      icon: ImageIcon,
      badge: `${frameCount}`,
    },
    {
      id: 'layouts' as NavTab,
      label: 'Layout bố cục',
      icon: Columns,
      badge: '2',
    },
    {
      id: 'pricing' as NavTab,
      label: 'Gói dịch vụ & Giá',
      icon: Banknote,
      badge: null,
    },
    {
      id: 'coupons' as NavTab,
      label: 'Mã giảm giá',
      icon: BadgePercent,
      badge: `${couponCount}`,
    },
    {
      id: 'accounting' as NavTab,
      label: 'Thanh toán & Kế toán',
      icon: ReceiptText,
      badge: 'Realtime',
    },
    {
      id: 'settings' as NavTab,
      label: 'Cấu hình hệ thống',
      icon: Settings,
      badge: null,
    },
  ]

  return (
    <aside className="cms-sidebar">
      {/* Brand Logo Header */}
      <div className="cms-brand-box">
        <div className="brand-logo-icon">
          <Sparkles className="w-6 h-6 text-pink-500" />
        </div>
        <div>
          <h1 className="brand-title">JoyBooth</h1>
          <span className="brand-sub">Cloud Backoffice CMS</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="cms-nav-list">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id
          return (
            <button
              key={item.id}
              className={`cms-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <div className="nav-item-left">
                <Icon className="w-5 h-5 nav-icon" />
                <span className="nav-label">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`nav-badge ${isActive ? 'badge-active' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="cms-sidebar-footer">
        <div className="system-pill">
          <span className="pulse-dot"></span>
          <span>Cloud Center v1.2</span>
        </div>
        <p className="footer-copyright">JoyBooth Vietnam © 2026</p>
      </div>
    </aside>
  )
}
