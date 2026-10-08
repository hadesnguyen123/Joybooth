import { db } from './Database.js'

export const PricingModel = {
  get() {
    const data = db.read()
    return data.pricing || {}
  },

  update(newPricing) {
    const data = db.read()
    data.pricing = {
      ...data.pricing,
      ...newPricing,
      updatedAt: new Date().toISOString(),
    }
    db.write(data)
    db.appendLog(
      'pricing',
      `Bảng giá được cập nhật: 2x6=${data.pricing.price2x6}đ, 4x6=${data.pricing.price4x6}đ, In thêm=${data.pricing.extraPrintPrice}đ`
    )
    return data.pricing
  },
}
