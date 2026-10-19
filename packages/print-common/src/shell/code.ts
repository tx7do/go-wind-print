// 条码 / 二维码绘制：与 canvas 的 BarcodeElement / QrcodeElement 同口径
// （条宽定首选尺寸 → dpi 吸附 → 框不够等比缩小；二维码取 core/browser 同一份 SVG 出 <img> 铺满元素盒）。
// 绘制在 DOM 落位后由 hydrateCodes 补上，避免每次重渲染都同步跑一遍码制计算。
import JsBarcode from 'jsbarcode'
import { browserCodeRenderer } from '@worm-vue3-print/core/browser'
import {
  BARCODE_BAR_HEIGHT_MODULES,
  BARCODE_MARGIN_BOTTOM_MODULES,
  BARCODE_QUIET_ZONE_MODULES,
  BARCODE_TEXT_FONT_SIZE_MODULES,
  barcodeAvailableBoxMm,
  barcodeUnitsPerModule,
  resolveBarcodeSize,
} from '@worm-vue3-print/core/designer'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { h } from '../core/h'

const FIT_TO_PAR: Record<string, string> = {
  contain: 'xMidYMid meet',
  cover: 'xMidYMid slice',
  fill: 'none',
  none: 'xMidYMid meet',
  'scale-down': 'xMidYMid meet',
}

function codeText(el: RuntimeElement): string {
  const o = el.options
  return String(o.testData || o.formatter || o.title || '') || '条码'
}

export function renderQrcode(el: RuntimeElement) {
  return h('div', {
    class: 'print-qrcode',
    dataset: { codeId: el.id, codeKind: 'qrcode' },
  })
}

export function renderBarcode(el: RuntimeElement) {
  const o = el.options
  return h('div', {
    class: 'print-barcode',
    dataset: { codeId: el.id, codeKind: 'barcode' },
  }, [h('svg', {
    preserveAspectRatio: FIT_TO_PAR[String(o.fit || 'contain')] ?? 'xMidYMid meet',
    style: { maxWidth: '100%', maxHeight: '100%' },
  })])
}

function readViewBox(svg: SVGSVGElement): { width: number; height: number } | null {
  const parts = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null
  return { width: parts[2]!, height: parts[3]! }
}

function drawBarcode(el: RuntimeElement, svg: SVGSVGElement) {
  const o = el.options
  const unitPerModule = barcodeUnitsPerModule(o.barWidth)
  try {
    JsBarcode(svg, codeText(el), {
      format: String(o.barcodeType || 'CODE128'),
      width: unitPerModule,
      height: BARCODE_BAR_HEIGHT_MODULES * unitPerModule,
      displayValue: !o.hideTitle,
      fontSize: ((o.fontSize ?? BARCODE_TEXT_FONT_SIZE_MODULES) as number) * unitPerModule,
      margin: 0,
      marginLeft: BARCODE_QUIET_ZONE_MODULES * unitPerModule,
      marginRight: BARCODE_QUIET_ZONE_MODULES * unitPerModule,
      marginTop: 0,
      marginBottom: BARCODE_MARGIN_BOTTOM_MODULES * unitPerModule,
    })
  } catch {
    svg.replaceChildren()
    return
  }
  const viewBox = readViewBox(svg)
  const settled = viewBox
    ? resolveBarcodeSize({
      unitWidth: viewBox.width / unitPerModule,
      unitHeight: viewBox.height / unitPerModule,
      boxWidthMm: barcodeAvailableBoxMm(o.width, o.maxWidth),
      boxHeightMm: barcodeAvailableBoxMm(o.height, o.maxHeight),
      dpi: o.printerDpi,
      barWidth: o.barWidth,
    })
    : null
  svg.style.width = settled ? `${settled.widthMm}mm` : ''
  svg.style.height = settled ? `${settled.heightMm}mm` : ''
  svg.setAttribute('shape-rendering', 'crispEdges')
}

function drawQrcode(el: RuntimeElement, box: HTMLElement) {
  const o = el.options
  const text = String(o.testData || o.formatter || o.title || '') || '二维码'
  box.replaceChildren()
  try {
    // 与出纸同源（core/browser）：同一份 SVG、同一静区，矢量图形不随元素盒大小重出图
    const svg = browserCodeRenderer.render(text, 'qrcode', {
      qrCodeLevel: String(o.qrCodeLevel ?? 'M'),
      qrQuietZone: typeof o.qrQuietZone === 'number' ? o.qrQuietZone : undefined,
    })
    const img = document.createElement('img')
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    img.alt = 'qrcode'
    // 铺满元素盒（与出图端 codeImgHtml 同口径）：只给 max-* 时 img 停在内在像素尺寸
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = String(o.fit || 'contain')
    img.style.maxWidth = o.maxWidth ? `${o.maxWidth}mm` : '100%'
    img.style.maxHeight = o.maxHeight ? `${o.maxHeight}mm` : '100%'
    box.appendChild(img)
  } catch { /* 码值非法：留空，与设计态不弹错 */ }
}

/** DOM 落位后绘制所有码类元素 */
export function hydrateCodes(root: ShadowRoot, elements: RuntimeElement[]) {
  for (const holder of Array.from(root.querySelectorAll<HTMLElement>('[data-code-kind]'))) {
    const id = holder.dataset.codeId
    const el = elements.find(e => e.id === id)
    if (!el) continue
    if (holder.dataset.codeKind === 'barcode') {
      const svg = holder.querySelector('svg')
      if (svg) drawBarcode(el, svg as unknown as SVGSVGElement)
    } else {
      drawQrcode(el, holder)
    }
  }
}
