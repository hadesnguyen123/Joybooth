import { KioskModel } from '../models/Kiosk.js'

export const KioskController = {
  getKiosks(req, res) {
    try {
      const kiosks = KioskModel.getAll()
      res.json({ success: true, data: kiosks })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  getKioskById(req, res) {
    try {
      const kiosk = KioskModel.getById(req.params.id)
      if (!kiosk) return res.status(404).json({ success: false, error: 'Kiosk không tồn tại' })
      res.json({ success: true, data: kiosk })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  postHeartbeat(req, res) {
    try {
      const { id } = req.params
      const stats = req.body || {}
      const kiosk = KioskModel.updateHeartbeat(id, stats)
      if (!kiosk) return res.status(404).json({ success: false, error: 'Kiosk không tồn tại' })
      res.json({ success: true, message: 'Heartbeat acknowledged', data: kiosk })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  toggleLock(req, res) {
    try {
      const { id } = req.params
      const kiosk = KioskModel.toggleLock(id)
      if (!kiosk) return res.status(404).json({ success: false, error: 'Kiosk không tồn tại' })
      res.json({ success: true, data: kiosk })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  refillPaper(req, res) {
    try {
      const { id } = req.params
      const amount = req.body?.amount || 400
      const kiosk = KioskModel.refillPaper(id, amount)
      if (!kiosk) return res.status(404).json({ success: false, error: 'Kiosk không tồn tại' })
      res.json({ success: true, data: kiosk })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },
}
