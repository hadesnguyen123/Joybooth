import { db } from '../models/Database.js'

export const SystemController = {
  getKPIs(req, res) {
    try {
      const data = db.read()
      res.json({ success: true, data: data.kpis })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  getAuditLogs(req, res) {
    try {
      const data = db.read()
      res.json({ success: true, data: data.auditLogs || [] })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  getSettings(req, res) {
    try {
      const data = db.read()
      res.json({ success: true, data: data.settings || {} })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  updateSettings(req, res) {
    try {
      const data = db.read()
      data.settings = { ...data.settings, ...req.body }
      db.write(data)
      db.appendLog('system', 'Cài đặt hệ thống (VietQR / Casso / GDrive) đã được cập nhật')
      res.json({ success: true, message: 'Đã lưu cấu hình', data: data.settings })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  healthCheck(req, res) {
    res.json({
      status: 'healthy',
      service: 'JoyBooth CMS MVC Backend',
      port: 5181,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  },
}
