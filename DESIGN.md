---
colorMode: LIGHT
customColor: '#502A1D'
overridePrimaryColor: '#502A1D'
overrideSecondaryColor: '#78452F'
overrideTertiaryColor: '#237A57'
overrideNeutralColor: '#351C15'
headlineFont: PLUS_JAKARTA_SANS
headlineFontFamily: 'Plus Jakarta Sans'
bodyFont: MANROPE
bodyFontFamily: 'Manrope'
labelFont: PLUS_JAKARTA_SANS
labelFontFamily: 'Plus Jakarta Sans'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 1.0rem
  lg: 1.5rem
  xl: 2.0rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  gutter-desktop: 2.5rem
  margin-desktop: 3rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.125rem
  space-lg: 1.5rem
  space-xl: 2.25rem
  space-2xl: 3rem
---

# Fotolism 3.0 — Warm Minimal Luxury Design System

## 1. Brand & Aesthetic Direction

Fotolism 3.0 embodies **Warm Minimal Luxury** tailored for high-end Photobooth & Selfbooth retail studios.
Inspired by handcrafted walnut woodwork, natural warm illumination, and the signature Espresso Coffee brand logo (`#502A1D`), this design system rejects dry corporate palettes and childish neon saturations.

### Core Experience Pillars:
- **Refined & Tactile:** Rich espresso brown touch surfaces, warm cream canvases (`#FAF6F1`), and warm caramel accents (`#A66A43`).
- **Kiosk Touch Ergonomics:** Built for 21.5" to 32" vertical touchscreens (1080x1920) and horizontal displays (1920x1080) with touch targets exceeding 48px to 64px.
- **Uncompromised Camera Fidelity:** Canon EOS R100 Live View (960x640 MJPEG) and 24MP RAW/JPEG full photos remain completely free of UI color cast or filters.

---

## 2. Color Palette & Token System

### 2.1 Primary Brand Colors
- **`brand.primary` (`#502A1D`):** Espresso Brown — Main call-to-actions, selected states, key brand emblems.
- **`brand.primaryHover` (`#633726`):** Interactive button hover state.
- **`brand.primaryPressed` (`#3D2017`):** Physical button press active state.
- **`brand.secondary` (`#78452F`):** Cocoa Brown — Secondary branding and header tags.
- **`brand.accent` (`#A66A43`):** Caramel — Decorative accents, active indicators, highlights.
- **`brand.highlight` (`#EACDB6`):** Soft Warm Beige — Delicate emphasis, badge backgrounds.

### 2.2 Neutral Tones (65-70% Visual Ratio)
- **`background.primary` (`#FAF6F1`):** Warm Cream — Primary application canvas.
- **`background.secondary` (`#F2E9E1`):** Warm Almond — Secondary sections and grouping panels.
- **`surface.default` (`#FFFFFF`):** Pure White — Cards, modals, high-contrast QR codes.
- **`surface.warm` (`#FFF9F4`):** Warm Ivory — Bottom drawers, filter trays.
- **`border.default` (`#E6D9CF`):** Subtle structural borders.
- **`border.strong` (`#C8B2A4`):** Strong dividers and active selection cards.
- **`text.primary` (`#351C15`):** Deep Walnut Coffee — Primary headings and body text (WCAG AA > 7:1).
- **`text.secondary` (`#70594F`):** Warm Umber — Subtext, instructions, telemetry labels.
- **`text.inverse` (`#FFFFFF`):** White text on dark/espresso buttons.
- **`text.disabled` (`#897F79`):** Disabled button labels, placeholders.

### 2.3 Semantic Operational Tokens
- **`status.success` (`#237A57`):** Emerald Jade — Transaction confirmed, camera online, print completed.
- **`status.warning` (`#A86516`):** Warm Amber — Low paper alert, 10s countdown warning.
- **`status.error` (`#B43F3F`):** Crimson Wine — Camera disconnect, print jam, transaction timeout.
- **`status.info` (`#356A91`):** Sapphire Slate — Informational notes, help instructions.
- **`status.pending` (`#806348`):** Warm Taupe — Payment pending, image processing in spooler.

---

## 3. Kiosk Component Architecture

### Buttons
- **Primary CTA (`.btn-primary`):** Solid `#502A1D` fill with white text, `9999px` pill radius, min-height 54px–64px, warm walnut shadow `0 8px 24px rgba(80, 42, 29, 0.32)`.
- **Secondary / Ghost (`.btn-secondary`):** White surface `#FFFFFF` with `1.5px solid #C8B2A4` border and `#351C15` text. Active state applies `#FAF6F1`.

### VietQR Payment Terminal Card
- Crisp white surface `#FFFFFF` with hairline walnut border `#E6D9CF`.
- Pure black/white VietQR code for instant scan reliability with all Vietnamese banking apps (Vietcombank, SeABank, VNPAY, MoMo).
- Dynamic radar wave in caramel `#A66A43` indicating background payment webhook listening.

### Camera Viewfinder Stage (CaptureScreen)
- Obsidian bezel `#141419` isolating the 960x640 Canon Live View stream.
- Zero color filters on live feed or captured photos.
- Countdown ring rendered in high-contrast ivory `#FFF8F2` with subtle caramel radial sweep.
- Bottom Retake Dock with clean thumbnail cards showing shot sequence (1/4, 2/4...).

### Overhead Display & CMS Dashboard
- Overhead Screen features dark roasted espresso background `#1F1815` with ivory typography visible from 5 meters away.
- Cloud CMS uses the identical semantic color tokens with high information density, white table surfaces, and espresso sidebars.
