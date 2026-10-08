import { db } from './Database.js'

export const FrameModel = {
  getAll() {
    const data = db.read()
    return data.frames || []
  },

  add(frameData) {
    const data = db.read()
    const id = frameData.id || `f-${Date.now()}`
    const newFrame = {
      id,
      name: frameData.name || 'Khung Mới JoyBooth',
      type: frameData.type || '2x6',
      slots: Number(frameData.slots) || 4,
      thumbnail: frameData.thumbnail || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300',
      theme: frameData.theme || 'Mới',
      isActive: frameData.isActive ?? true,
      usageCount: 0,
    }

    data.frames = [newFrame, ...(data.frames || [])]
    data.kpis.totalFrames = data.frames.length
    db.write(data)
    db.appendLog('content', `Thêm mới khung hình [${newFrame.name}] (${newFrame.type})`)
    return newFrame
  },

  toggle(id) {
    const data = db.read()
    const frame = (data.frames || []).find((f) => f.id === id)
    if (!frame) return null

    frame.isActive = !frame.isActive
    db.write(data)
    db.appendLog('content', `Khung [${frame.name}] đổi trạng thái sang ${frame.isActive ? 'KÍCH HOẠT' : 'ẨN'}`)
    return frame
  },

  delete(id) {
    const data = db.read()
    data.frames = (data.frames || []).filter((f) => f.id !== id)
    data.kpis.totalFrames = data.frames.length
    db.write(data)
    db.appendLog('content', `Đã xóa khung hình ID: ${id}`)
    return true
  },
}
