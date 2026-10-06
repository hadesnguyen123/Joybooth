import type {
  GridLayoutItem,
  ThemeItem,
  PlacedSticker,
  ColorFilterItem,
  FrameSize,
} from '../store/appStore'

interface RenderOptions {
  photos: string[] // data URLs or image URLs
  frameSize: FrameSize
  layout: GridLayoutItem
  theme: ThemeItem
  stickers: PlacedSticker[]
  filter: ColorFilterItem
  eventName: string
  eventDate: string
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/**
 * Tạo bản vẽ Photobooth Strip Canvas chất lượng cao (300 DPI tương đương khổ in)
 * - 2x6 inch: 600 x 1800 px
 * - 4x6 inch: 1200 x 1800 px
 */
export async function generateStripComposite(opts: RenderOptions): Promise<string> {
  const is2x6 = opts.frameSize === '2x6'
  const width = is2x6 ? 600 : 1200
  const height = 1800

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  // 1. Vẽ nền (Background Color / Gradient)
  if (opts.theme.bgGradient) {
    const colorMatches = opts.theme.bgGradient.match(/#(?:[0-9a-fA-F]{3,8})|rgba?\([^)]+\)/g)
    if (colorMatches && colorMatches.length >= 2) {
      const grad = ctx.createLinearGradient(0, 0, width, height)
      grad.addColorStop(0, colorMatches[0])
      grad.addColorStop(1, colorMatches[colorMatches.length - 1])
      ctx.fillStyle = grad
    } else {
      ctx.fillStyle = opts.theme.bgColor || '#FFFFFF'
    }
  } else {
    ctx.fillStyle = opts.theme.bgColor || '#FFFFFF'
  }
  ctx.fillRect(0, 0, width, height)

  // 2. Tính toán khung ảnh (Slots)
  const count = Math.min(opts.photos.length, opts.layout.photosCount)
  const footerHeight = 150
  const padX = is2x6 ? 36 : 50
  const padTop = 40
  const gap = 20

  const availableHeight = height - padTop - footerHeight
  const cols = opts.layout.cols || 1
  const rows = Math.ceil(count / cols)

  const slotW = (width - padX * 2 - gap * (cols - 1)) / cols
  const slotH = (availableHeight - gap * (rows - 1)) / rows

  // 3. Tải và vẽ từng ảnh
  for (let i = 0; i < count; i++) {
    const colIdx = i % cols
    const rowIdx = Math.floor(i / cols)
    const sx = padX + colIdx * (slotW + gap)
    const sy = padTop + rowIdx * (slotH + gap)

    // Khung viền ảnh
    ctx.save()
    ctx.fillStyle = '#1A1A1A'
    ctx.beginPath()
    ctx.roundRect(sx, sy, slotW, slotH, 12)
    ctx.fill()
    ctx.clip()

    const photoSrc = opts.photos[i]
    if (photoSrc) {
      try {
        const img = await loadImage(photoSrc)
        // Áp dụng bộ lọc màu nếu photo chưa được nướng sẵn filter (không phải data:image)
        if (!photoSrc.startsWith('data:image') && opts.filter.cssFilter && opts.filter.cssFilter !== 'none') {
          ctx.filter = opts.filter.cssFilter
        }

        // Fit & Center crop (aspect fill)
        const imgAspect = img.width / img.height
        const slotAspect = slotW / slotH
        let dw = slotW
        let dh = slotH
        let dx = sx
        let dy = sy

        if (imgAspect > slotAspect) {
          dw = slotH * imgAspect
          dx = sx - (dw - slotW) / 2
        } else {
          dh = slotW / imgAspect
          dy = sy - (dh - slotH) / 2
        }

        ctx.drawImage(img, dx, dy, dw, dh)
      } catch (err) {
        console.warn(`Could not load photo ${i + 1}:`, err)
        // Fallback placeholder
        ctx.fillStyle = '#333333'
        ctx.fillRect(sx, sy, slotW, slotH)
      }
    } else {
      ctx.fillStyle = '#EEEEEE'
      ctx.fillRect(sx, sy, slotW, slotH)
    }

    ctx.restore()
  }

  // 4. Vẽ các sticker được dán
  for (const st of opts.stickers) {
    const px = (st.x / 100) * width
    const py = (st.y / 100) * height

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate((st.rotation * Math.PI) / 180)
    ctx.font = '56px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(st.icon, 0, 0)
    ctx.restore()
  }

  // 5. Vẽ Footer Branding & Ngày tháng
  ctx.save()
  ctx.fillStyle = opts.theme.textColor || '#2D2426'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Tiêu đề sự kiện
  ctx.font = '900 28px "Outfit", sans-serif'
  ctx.letterSpacing = '2px'
  ctx.fillText(opts.eventName.toUpperCase(), width / 2, height - 85)

  // Ngày tháng & Bộ lọc
  ctx.font = '600 16px "Plus Jakarta Sans", sans-serif'
  ctx.letterSpacing = '1px'
  ctx.globalAlpha = 0.8
  ctx.fillText(`${opts.eventDate}  •  ${opts.filter.name}`, width / 2, height - 48)
  ctx.restore()

  return canvas.toDataURL('image/jpeg', 0.96)
}
