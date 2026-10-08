import { FrameModel } from '../models/Frame.js'

export const FrameController = {
  getFrames(req, res) {
    try {
      const { type } = req.query
      let list = FrameModel.getAll()
      if (type && type !== 'all') {
        list = list.filter((f) => f.type === type)
      }
      res.json({ success: true, count: list.length, data: list })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  addFrame(req, res) {
    try {
      const frame = FrameModel.add(req.body)
      res.status(201).json({ success: true, data: frame })
    } catch (err) {
      res.status(400).json({ success: false, error: err.message })
    }
  },

  toggleFrame(req, res) {
    try {
      const frame = FrameModel.toggle(req.params.id)
      if (!frame) return res.status(404).json({ success: false, error: 'Khung ảnh không tồn tại' })
      res.json({ success: true, data: frame })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  deleteFrame(req, res) {
    try {
      FrameModel.delete(req.params.id)
      res.json({ success: true, message: 'Đã xóa khung hình' })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },
}
