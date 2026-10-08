import { CouponModel } from '../models/Coupon.js'

export const CouponController = {
  getCoupons(req, res) {
    try {
      const coupons = CouponModel.getAll()
      res.json({ success: true, count: coupons.length, data: coupons })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  createCoupon(req, res) {
    try {
      const coupon = CouponModel.create(req.body)
      res.status(201).json({ success: true, data: coupon })
    } catch (err) {
      res.status(400).json({ success: false, error: err.message })
    }
  },

  toggleCoupon(req, res) {
    try {
      const coupon = CouponModel.toggle(req.params.code)
      if (!coupon) return res.status(404).json({ success: false, error: 'Mã voucher không tồn tại' })
      res.json({ success: true, data: coupon })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  deleteCoupon(req, res) {
    try {
      CouponModel.delete(req.params.code)
      res.json({ success: true, message: 'Đã xóa mã voucher' })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },

  verifyCoupon(req, res) {
    try {
      const { code, amount } = req.query
      const coupon = CouponModel.getByCode(code)
      if (!coupon) {
        return res.status(404).json({ success: false, valid: false, message: 'Mã giảm giá không tồn tại' })
      }
      if (!coupon.isActive) {
        return res.status(400).json({ success: false, valid: false, message: 'Mã giảm giá đã tạm ngưng' })
      }
      if (amount && Number(amount) < coupon.minOrder) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: `Đơn hàng tối thiểu ${coupon.minOrder.toLocaleString()}đ để dùng mã này`,
        })
      }
      res.json({ success: true, valid: true, coupon })
    } catch (err) {
      res.status(500).json({ success: false, error: err.message })
    }
  },
}
