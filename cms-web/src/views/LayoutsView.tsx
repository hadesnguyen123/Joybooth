import { Columns, Grid, CheckCircle2 } from 'lucide-react'

export default function LayoutsView() {
  const layouts = [
    {
      id: 'strip_2x6',
      name: 'Dải Strip Đôi (2x6 inch)',
      slots: '3 hoặc 4 ảnh đứng',
      type: 'strip',
      desc: 'Đặc trưng văn hóa photobooth Hàn Quốc. In 2 dải đối xứng.',
      active: true,
      paperSize: 'Khổ 2x6 inch (5x15cm)',
    },
    {
      id: 'postcard_4x6',
      name: 'Bưu Thiếp Postcard (4x6 inch)',
      slots: 'Lưới 1, 4 (2x2), 6 (2x3), 8 ảnh',
      type: 'grid',
      desc: 'Bản in khổ lớn postcard lưu album hoặc để bàn trang trí.',
      active: true,
      paperSize: 'Khổ 4x6 inch (10x15cm)',
    },
  ]

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Bố Cục Ảnh In ({layouts.length} Định Dạng Mặc Định)</h3>
          <p className="section-sub">
            Cấu hình các định dạng bố cục hiển thị trên màn hình chọn layout của Kiosk
          </p>
        </div>
      </div>

      <div className="layouts-grid">
        {layouts.map((l) => (
          <div key={l.id} className="layout-box-card">
            <div className="layout-box-header">
              <div className="flex items-center gap-2">
                {l.type === 'strip' ? (
                  <Columns className="w-5 h-5 text-pink-500" />
                ) : (
                  <Grid className="w-5 h-5 text-sky-500" />
                )}
                <h4 className="layout-box-title">{l.name}</h4>
              </div>
              <span className="layout-active-pill flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đang Áp Dụng 2 Kiosks
              </span>
            </div>

            <p className="layout-box-desc">{l.desc}</p>

            <div className="layout-specs-pill-row">
              <span className="spec-tag">Khổ giấy: {l.paperSize}</span>
              <span className="spec-tag">Bố cục slot: {l.slots}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
