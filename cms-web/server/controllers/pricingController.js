import { PricingModel } from '../models/Pricing.js'

export const PricingController = {
  getPricing(req, res) {
    try {
      const pricing = PricingModel.get()
      res.json({ success: true, data: pricing })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  updatePricing(req, res) {
    try {
      const updated = PricingModel.update(req.body)
      res.json({ success: true, message: 'Bảng giá đã được cập nhật thành công', data: updated })
    } catch (err) {
      res.status(400).json({ success: false, error: err.message })
    }
  },
}
