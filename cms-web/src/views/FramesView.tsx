import { useState } from 'react'
import { useCms } from '../context/CmsContext'
import { Plus, Check, PowerOff, Filter } from 'lucide-react'
import type { FrameItem } from '../types'

export default function FramesView() {
  const { frames, toggleFrame, addFrame } = useCms()
  const [filterSize, setFilterSize] = useState<'all' | '2x6' | '4x6'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFrameName, setNewFrameName] = useState('')
  const [newFrameSize, setNewFrameSize] = useState<'2x6' | '4x6'>('2x6')
  const [newFrameCategory, setNewFrameCategory] = useState<
    'Một màu' | 'Ngày lễ' | 'Thời trang' | 'Trào lưu' | 'Khác'
  >('Ngày lễ')

  const filteredFrames = frames.filter((f) => {
    if (filterSize === 'all') return true
    return f.size === filterSize
  })

  function handleCreateFrame() {
    if (!newFrameName.trim()) return
    const newFrame: FrameItem = {
      id: `frame_${Date.now()}`,
      name: newFrameName.trim(),
      size: newFrameSize,
      category: newFrameCategory,
      previewUrl:
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=120&auto=format&fit=crop',
      bgColor: '#ffd1dc',
      textColor: '#ec4899',
      isActive: true,
      usageCount: 0,
    }
    addFrame(newFrame)
    setNewFrameName('')
    setShowAddModal(false)
  }

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Quản Lý Khung Hình ({frames.length} Khung)</h3>
          <p className="section-sub">
            Bật/tắt khung hiển thị trên 2 máy Kiosk hoặc tải lên mẫu khung sự kiện mới
          </p>
        </div>

        <button className="btn-add-primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Thêm Khung Mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs-row">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase">Khổ in:</span>
        </div>
        <button
          className={`filter-btn ${filterSize === 'all' ? 'active' : ''}`}
          onClick={() => setFilterSize('all')}
        >
          Tất cả ({frames.length})
        </button>
        <button
          className={`filter-btn ${filterSize === '2x6' ? 'active' : ''}`}
          onClick={() => setFilterSize('2x6')}
        >
          Dải Strip 2x6 ({frames.filter((f) => f.size === '2x6').length})
        </button>
        <button
          className={`filter-btn ${filterSize === '4x6' ? 'active' : ''}`}
          onClick={() => setFilterSize('4x6')}
        >
          Bưu thiếp 4x6 ({frames.filter((f) => f.size === '4x6').length})
        </button>
      </div>

      {/* Frames Grid */}
      <div className="frames-grid">
        {filteredFrames.map((frame) => (
          <div
            key={frame.id}
            className={`frame-card-item ${!frame.isActive ? 'frame-disabled' : ''}`}
          >
            <div className="frame-preview-box">
              <img
                src={frame.previewUrl}
                alt={frame.name}
                className="frame-preview-img"
              />
              <span className="frame-size-badge">{frame.size.toUpperCase()}</span>
            </div>

            <div className="frame-info-block">
              <span className="frame-cat-tag">{frame.category}</span>
              <h4 className="frame-card-name">{frame.name}</h4>
              <span className="frame-usage-stat">
                Đã chụp: <strong>{frame.usageCount} lượt</strong>
              </span>
            </div>

            <div className="frame-footer-actions">
              <button
                className={`btn-toggle-frame ${
                  frame.isActive ? 'btn-active' : 'btn-inactive'
                }`}
                onClick={() => toggleFrame(frame.id)}
              >
                {frame.isActive ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Đang Bật
                  </>
                ) : (
                  <>
                    <PowerOff className="w-3.5 h-3.5" /> Đã Tắt
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Thêm Khung Mới */}
      {showAddModal && (
        <div className="cms-modal-backdrop">
          <div className="cms-modal-card">
            <h4 className="modal-title">Thêm Mẫu Khung Ảnh Mới</h4>
            <p className="modal-sub">
              Khung mới sẽ được tự động đồng bộ xuống 2 máy Kiosk trong vòng 30 giây
            </p>

            <div className="modal-form-group">
              <label>Tên khung ảnh:</label>
              <input
                type="text"
                placeholder="VD: Giáng Sinh Tuyết Rơi 🎄"
                value={newFrameName}
                onChange={(e) => setNewFrameName(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-form-row">
              <div className="modal-form-group flex-1">
                <label>Khổ in:</label>
                <select
                  value={newFrameSize}
                  onChange={(e) => setNewFrameSize(e.target.value as '2x6' | '4x6')}
                  className="modal-select"
                >
                  <option value="2x6">Dải Strip Đôi 2x6 inch</option>
                  <option value="4x6">Bưu Thiếp Postcard 4x6 inch</option>
                </select>
              </div>

              <div className="modal-form-group flex-1">
                <label>Chủ đề:</label>
                <select
                  value={newFrameCategory}
                  onChange={(e) =>
                    setNewFrameCategory(
                      e.target.value as 'Một màu' | 'Ngày lễ' | 'Thời trang' | 'Trào lưu' | 'Khác'
                    )
                  }
                  className="modal-select"
                >
                  <option value="Một màu">Một màu pastel</option>
                  <option value="Ngày lễ">Ngày lễ / Lễ hội</option>
                  <option value="Thời trang">Thời trang & Y2K</option>
                  <option value="Trào lưu">Trào lưu Hot Trend</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div className="modal-action-row">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Hủy Bỏ
              </button>
              <button className="btn-modal-submit" onClick={handleCreateFrame}>
                Lưu & Kích Hoạt Lên 2 Kiosks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
