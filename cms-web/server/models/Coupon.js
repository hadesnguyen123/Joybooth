import { db } from './Database.js'

export const CouponModel = {
  getAll() {
    const data = db.read()
    return data.coupons || []
  },

  getByCode(code) {
    const coupons = this.getAll()
    return coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()) || null
  },

  create(couponData) {
    const data = db.read()
    const code = (couponData.code || '').trim().toUpperCase()
    if (!code) throw new Error('Mã giảm giá không được rỗng')

    // Kiểm tra trùng
    const exists = (data.coupons || []).some((c) => c.code === code)
    if (exists) throw new Error(`Mã giảm giá [${code}] đã tồn tại`)

    const newCoupon = {
      code,
      discountType: couponData.discountType || 'fixed',
      discountValue: Number(couponData.discountValue) || 10000,
      minOrder: Number(couponData.minOrder) || 0,
      usageCount: 0,
      maxUsage: Number(couponData.maxUsage) || 100,
      isActive: couponData.isActive ?? true,
      expiresAt: couponData.expiresAt || '2026-12-31',
      description: couponData.description || 'Ưu đãi JoyBooth',
    }

    data.coupons = [newCoupon, ...(data.coupons || [])]
    db.write(data)
    db.appendLog('marketing', `Tạo voucher mới [${newCoupon.code}] giảm ${newCoupon.discountValue}${newCoupon.discountType === 'percent' ? '%' : 'đ'}`)
    return newCoupon
  },

  toggle(code) {
    const data = db.read()
    const coupon = (data.coupons || []).find((c) => c.code === code)
    if (!coupon) return null

    coupon.isActive = !coupon.isActive
    db.write(data)
    db.appendLog('marketing', `Voucher [${code}] chuyển sang ${coupon.isActive ? 'BẬT' : 'TẮT'}`)
    return coupon
  },

  delete(code) {
    const data = db.read()
    data.coupons = (data.coupons || []).filter((c) => c.code !== code)
    db.write(data)
    db.appendLog('marketing', `Đã xóa mã giảm giá [${code}]`)
    return true
  },
}
