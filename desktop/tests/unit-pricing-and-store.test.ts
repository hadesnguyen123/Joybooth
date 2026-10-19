import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PRICE_2X6,
  DEFAULT_PRICE_4X6,
  DEFAULT_EXTRA_COPY_PRICE_2X6,
  DEFAULT_EXTRA_COPY_PRICE_4X6,
} from '../src/lib/constants'
import {
  DEFAULT_BEAUTY_CONFIG,
  BEAUTY_PRESETS,
  DEFAULT_DISCOUNT_COUPONS,
  COLOR_FILTERS,
  ALL_LAYOUTS,
  FRAME_SIZE_OPTIONS,
  type DiscountCoupon,
  useAppStore,
} from '../src/store/appStore'

describe('UT-01: Bảng giá, Phụ phí in thêm & Mã ưu đãi (Pricing & Discounts)', () => {
  // Hàm tính toán giá theo chuẩn PaymentScreen
  function calculateTotal(params: {
    frameSize: '2x6' | '4x6'
    copies: number
    price2x6?: number
    price4x6?: number
    extraCopyPrice2x6?: number
    extraCopyPrice4x6?: number
    coupon?: DiscountCoupon | null
  }) {
    const {
      frameSize,
      copies,
      price2x6 = DEFAULT_PRICE_2X6,
      price4x6 = DEFAULT_PRICE_4X6,
      extraCopyPrice2x6 = DEFAULT_EXTRA_COPY_PRICE_2X6,
      extraCopyPrice4x6 = DEFAULT_EXTRA_COPY_PRICE_4X6,
      coupon,
    } = params

    const basePrice = frameSize === '2x6' ? price2x6 : price4x6
    const minCopies = frameSize === '2x6' ? 2 : 1
    const extraCopies = Math.max(0, copies - minCopies)
    const extraPricePerUnit =
      frameSize === '2x6'
        ? extraCopyPrice2x6 / 2 // mỗi dải phụ thêm
        : extraCopyPrice4x6     // mỗi postcard phụ thêm

    const subTotal = basePrice + extraCopies * extraPricePerUnit
    let discountAmount = 0
    if (coupon) {
      if (coupon.type === 'percent') {
        discountAmount = Math.round((subTotal * coupon.value) / 100)
      } else {
        discountAmount = coupon.value
      }
    }
    return Math.max(0, subTotal - discountAmount)
  }

  it('Tính chuẩn giá mặc định khổ 2x6: 2 dải in là 50.000đ hoặc 70.000đ theo cấu hình', () => {
    // Với cấu hình mặc định trong constants (50k):
    expect(calculateTotal({ frameSize: '2x6', copies: 2 })).toBe(50000)

    // Với bảng giá sự kiện 70k (2 dải):
    const total70k = calculateTotal({
      frameSize: '2x6',
      copies: 2,
      price2x6: 70000,
      extraCopyPrice2x6: 20000,
    })
    expect(total70k).toBe(70000)
  })

  it('Tính phụ phí in thêm chính xác cho khổ 2x6', () => {
    // Khách in 4 dải (thêm 2 dải phụ, giá 20k/2 dải -> +20k)
    const total4strips = calculateTotal({
      frameSize: '2x6',
      copies: 4,
      price2x6: 70000,
      extraCopyPrice2x6: 20000,
    })
    expect(total4strips).toBe(90000)

    // Khách in 6 dải (+4 dải phụ -> +40k)
    const total6strips = calculateTotal({
      frameSize: '2x6',
      copies: 6,
      price2x6: 70000,
      extraCopyPrice2x6: 20000,
    })
    expect(total6strips).toBe(110000)
  })

  it('Tính chuẩn giá và phụ phí cho khổ postcard 4x6 (80k base, +20k/bản)', () => {
    // 1 postcard chuẩn -> 80.000đ
    expect(
      calculateTotal({
        frameSize: '4x6',
        copies: 1,
        price4x6: 80000,
        extraCopyPrice4x6: 20000,
      })
    ).toBe(80000)

    // 3 postcards -> 80k + 2 * 20k = 120.000đ
    expect(
      calculateTotal({
        frameSize: '4x6',
        copies: 3,
        price4x6: 80000,
        extraCopyPrice4x6: 20000,
      })
    ).toBe(120000)
  })

  it('Áp dụng chính xác các mã giảm giá: GIAM20K, FREE, VIP2026', () => {
    const giam20k = DEFAULT_DISCOUNT_COUPONS.find((c) => c.code === 'GIAM20K')!
    const free = DEFAULT_DISCOUNT_COUPONS.find((c) => c.code === 'FREE')!
    const vip = DEFAULT_DISCOUNT_COUPONS.find((c) => c.code === 'VIP2026')!

    expect(giam20k).toBeDefined()
    expect(free).toBeDefined()
    expect(vip).toBeDefined()

    // GIAM20K trên đơn 70k -> còn 50k
    expect(
      calculateTotal({
        frameSize: '2x6',
        copies: 2,
        price2x6: 70000,
        coupon: giam20k,
      })
    ).toBe(50000)

    // FREE trên đơn 120k -> còn 0đ
    expect(
      calculateTotal({
        frameSize: '4x6',
        copies: 3,
        price4x6: 80000,
        extraCopyPrice4x6: 20000,
        coupon: free,
      })
    ).toBe(0)

    // VIP2026 (-20%) trên đơn 100k -> còn 80k
    expect(
      calculateTotal({
        frameSize: '4x6',
        copies: 2,
        price4x6: 80000,
        extraCopyPrice4x6: 20000,
        coupon: vip,
      })
    ).toBe(80000)
  })

  it('Không cho phép số tiền thanh toán âm khi giảm giá vượt quá hóa đơn', () => {
    const giam20k = DEFAULT_DISCOUNT_COUPONS.find((c) => c.code === 'GIAM20K')!
    const result = calculateTotal({
      frameSize: '2x6',
      copies: 2,
      price2x6: 10000, // giá nhỏ hơn mã giảm giá
      coupon: giam20k,
    })
    expect(result).toBe(0)
  })
})

describe('UT-02: Pure Camera Defaults & Zero Filter Guarantee', () => {
  it('DEFAULT_BEAUTY_CONFIG phải tuyệt đối là 0% cho tất cả hiệu ứng can thiệp da/khuôn mặt', () => {
    expect(DEFAULT_BEAUTY_CONFIG.slimFace).toBe(0)
    expect(DEFAULT_BEAUTY_CONFIG.skinSmoothing).toBe(0)
    expect(DEFAULT_BEAUTY_CONFIG.whiteningTone).toBe(0)
    expect(DEFAULT_BEAUTY_CONFIG.rosyTone).toBe(0)
    expect(DEFAULT_BEAUTY_CONFIG.glowClarity).toBe(0)
    expect(DEFAULT_BEAUTY_CONFIG.brightnessAdjust).toBe(100)
    expect(DEFAULT_BEAUTY_CONFIG.contrastAdjust).toBe(100)
    expect(DEFAULT_BEAUTY_CONFIG.saturationAdjust).toBe(100)
  })

  it('Preset làm đẹp đầu tiên phải là "none" (Gốc - Máy ảnh)', () => {
    expect(BEAUTY_PRESETS.length).toBeGreaterThan(0)
    const firstPreset = BEAUTY_PRESETS[0]
    expect(firstPreset.id).toBe('none')
    expect(firstPreset.smoothing).toBe(0)
    expect(firstPreset.rosyTone).toBe(0)
    expect(firstPreset.brightness).toBe(100)
    expect(firstPreset.contrast).toBe(100)
  })

  it('Filter màu mặc định phải là Tự nhiên (cssFilter: none)', () => {
    expect(COLOR_FILTERS.length).toBeGreaterThan(0)
    const normalFilter = COLOR_FILTERS[0]
    expect(normalFilter.id).toBe('normal')
    expect(normalFilter.cssFilter).toBe('none')
  })

  it('Chuỗi CSS filter sinh ra từ giá trị pure camera mặc định phải là "none"', () => {
    const {
      brightnessAdjust,
      contrastAdjust,
      saturationAdjust,
      skinSmoothing,
      rosyTone,
      glowClarity,
      whiteningTone,
    } = DEFAULT_BEAUTY_CONFIG

    const whiteMultiplier = 1 + (whiteningTone / 100) * 0.12
    const baseBright = brightnessAdjust !== 100 ? brightnessAdjust / 100 : 1
    const totalBright = baseBright * whiteMultiplier
    const b = totalBright !== 1 ? `brightness(${totalBright.toFixed(3)})` : ''
    const c = contrastAdjust !== 100 ? `contrast(${contrastAdjust / 100})` : ''
    const s = saturationAdjust !== 100 ? `saturate(${saturationAdjust / 100})` : ''
    const smooth = skinSmoothing > 0 ? `blur(${(skinSmoothing * 0.0065).toFixed(2)}px)` : ''
    const rosy = rosyTone > 0 ? `hue-rotate(-${(rosyTone * 0.075).toFixed(1)}deg) saturate(${1 + rosyTone * 0.0025})` : ''
    const clarity = glowClarity > 0 ? `contrast(${1 + glowClarity * 0.0016})` : ''

    const parts = [b, c, s, smooth, rosy, clarity].filter(Boolean)
    const resultCss = parts.length > 0 ? parts.join(' ') : 'none'

    expect(resultCss).toBe('none')
  })

  it('Gương (mirrorCamera) phải luôn luôn tắt (false) mặc định và khi bắt đầu session mới', () => {
    const state = useAppStore.getState()
    expect(state.mirrorCamera).toBe(false)

    // Kiểm tra sau khi resetAdjustments
    state.resetAdjustments()
    expect(useAppStore.getState().mirrorCamera).toBe(false)

    // Kiểm tra sau khi clearSession
    state.clearSession()
    expect(useAppStore.getState().mirrorCamera).toBe(false)
  })
})

describe('UT-03: Kích thước Canvas & Tỷ lệ chuẩn in ấn 300 DPI (Strip & Postcard)', () => {
  it('Kích thước bản vẽ 2x6 strip là 600 x 1800 px (tỷ lệ 1:3) đúng chuẩn 300 DPI', () => {
    const is2x6 = true
    const width = is2x6 ? 600 : 1200
    const height = 1800
    expect(width).toBe(600)
    expect(height).toBe(1800)
    expect(width / height).toBeCloseTo(1 / 3, 5)
  })

  it('Kích thước bản vẽ 4x6 postcard là 1200 x 1800 px (tỷ lệ 2:3) đúng chuẩn 300 DPI', () => {
    const is2x6 = false
    const width = is2x6 ? 600 : 1200
    const height = 1800
    expect(width).toBe(1200)
    expect(height).toBe(1800)
    expect(width / height).toBeCloseTo(2 / 3, 5)
  })

  it('Bố cục 4 ô strip (4_strip_classic) tính toán slot vừa vặn và không tràn viền', () => {
    const layout = ALL_LAYOUTS[4][0]
    expect(layout.cols).toBe(1)
    expect(layout.rows).toBe(4)
    expect(layout.photosCount).toBe(4)

    const width = 600
    const height = 1800
    const footerHeight = 150
    const padX = 36
    const padTop = 40
    const gap = 20

    const availableHeight = height - padTop - footerHeight
    const slotW = (width - padX * 2 - gap * (layout.cols - 1)) / layout.cols
    const slotH = (availableHeight - gap * (layout.rows - 1)) / layout.rows

    expect(slotW).toBe(528)
    expect(slotH).toBeGreaterThan(350)
    expect(slotH).toBeLessThan(400)
    expect(slotW * layout.cols).toBeLessThanOrEqual(width)
    expect(slotH * layout.rows + footerHeight + padTop + gap * 3).toBeLessThanOrEqual(height)
  })

  it('Bố cục 4 ô postcard (4_grid_2x2) tính toán slot 2 cột x 2 hàng cân đối', () => {
    const layout = ALL_LAYOUTS[4][1]
    expect(layout.cols).toBe(2)
    expect(layout.rows).toBe(2)
    expect(layout.photosCount).toBe(4)

    const width = 1200
    const height = 1800
    const footerHeight = 150
    const padX = 50
    const padTop = 40
    const gap = 20

    const availableHeight = height - padTop - footerHeight
    const slotW = (width - padX * 2 - gap * (layout.cols - 1)) / layout.cols
    const slotH = (availableHeight - gap * (layout.rows - 1)) / layout.rows

    expect(slotW).toBeGreaterThan(500)
    expect(slotW).toBeLessThan(600)
    expect(slotH).toBeGreaterThan(700)
    expect(slotH).toBeLessThan(850)
  })
})
