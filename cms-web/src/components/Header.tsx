import { Wifi, RefreshCw, UserCheck, ShieldCheck, Server, AlertCircle } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  onlineKioskCount: number
  totalKioskCount: number
  isBackendConnected: boolean
}

export default function Header({
  title,
  subtitle,
  onlineKioskCount,
  totalKioskCount,
  isBackendConnected,
}: HeaderProps) {
  return (
    <header className="cms-header">
      <div className="header-left">
        <h2 className="header-view-title">{title}</h2>
        {subtitle && <p className="header-view-sub">{subtitle}</p>}
      </div>

      <div className="header-right">
        {/* Backend API Server Status Capsule */}
        <div className={`status-capsule ${isBackendConnected ? 'api-online' : 'api-offline'}`}>
          {isBackendConnected ? (
            <>
              <Server className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>
                Backend API: <strong>Port 5181 (Live)</strong>
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>
                Backend API: <strong>Đang kết nối...</strong>
              </span>
            </>
          )}
        </div>

        {/* Kiosks Online Status Capsule */}
        <div className="status-capsule">
          <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>
            Kiosks: <strong>{onlineKioskCount}/{totalKioskCount} Online</strong>
          </span>
        </div>

        {/* Realtime Sync Badge */}
        <div className="status-capsule sync-capsule">
          <RefreshCw className="w-4 h-4 text-sky-500" />
          <span>Realtime Sync: <strong>Hoạt động</strong></span>
        </div>

        {/* Admin User Profile */}
        <div className="user-profile-badge">
          <div className="avatar-circle">
            <UserCheck className="w-4 h-4 text-white" />
          </div>
          <div className="user-info">
            <span className="user-name">Admin JoyBooth</span>
            <span className="user-role flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-500" /> Chủ hệ thống
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
