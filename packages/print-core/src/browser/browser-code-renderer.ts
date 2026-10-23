// print-core/src/browser/browser-code-renderer.ts
// 浏览器侧 CodeRenderer：jsbarcode（条形码）+ qrcode（二维码矩阵拼 SVG），纯前端无服务依赖。
//
// 条形码出纸清晰度的三条硬约束（实测得出，勿随意回退）：
// 1. 每模块必须是整数个打印点：非整数会被打印机/RIP 各自取整，同一逻辑条宽打成 2 点或 3 点，
//    出纸即「条宽忽宽忽窄」。给出 printerDpi 时按整数点反算最终尺寸（见 render/barcode-dot.ts）。
// 2. shape-rendering="crispEdges"：抗锯齿会在条边缘生成灰像素，热敏头只有黑白两态，
//    灰边被阈值化后条宽进一步失真（实测灰像素占墨迹 11.3% → 1.7%）。二维码一直是这么设的。
// 3. 静区缺省不给 0：jsbarcode 默认 10 模块，EAN13/UPC/ITF14 等码制没有静区会直接扫不出；
//    现由 barQuietZone 逐元素可调（0~20，缺省仍是 10），二维码的静区另有 qrQuietZone（缺省 0）。

import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import {
  BARCODE_MARGIN_BOTTOM_MODULES,
  BARCODE_TEXT_FONT_SIZE_MODULES,
  QR_DEFAULT_QUIET_MODULES,
  barcodeQuietZoneModules,
  barcodeUnitsPerModule,
  layoutBarcodeSize,
} from '../render/barcode-dot.js'
import type { CodeRenderer, CodeRenderOptions } from '../render/types.js'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** 读 svg 的 viewBox 宽高；缺失或非法时返回 null */
function readViewBox(svg: SVGSVGElement): { width: number; height: number } | null {
  const raw = svg.getAttribute('viewBox')
  if (!raw) return null
  const parts = raw.trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null
  return { width: parts[2]!, height: parts[3]! }
}

/**
 * 条形码：jsbarcode 渲染到离体 SVG 元素，取 outerHTML。
 * 所有 jsbarcode 参数都以「模块」为单位再乘以每模块用户单位数，使条码图形与倍率无关；
 * 条区模块数由条高布局给出（见 render/barcode-dot.ts）：未填条高只生成一趟，填了则先用缺省档
 * 探出模块数与折算粒度，必要时按目标条高重生成一趟。落纸尺寸仍由统一的结算算法给出：
 * 条宽定首选、有 printerDpi 时吸附到整数打印点、可用框放不下则等比缩小，故这里总是写成 mm。
 */
function renderBarcodeSvg(value: string, opts: CodeRenderOptions): string {
  const svg = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement
  const unitPerModule = barcodeUnitsPerModule(opts.barWidth)
  const quietModules = barcodeQuietZoneModules(opts.barQuietZone)

  /** 生成一趟码面并读回 viewBox，供布局算法决定条区模块数 */
  const measure = (barHeightModules: number) => {
    JsBarcode(svg as unknown as SVGElement, value, {
      format: (opts.barcodeType || 'CODE128') as unknown as string,
      width: unitPerModule,
      height: barHeightModules * unitPerModule,
      displayValue: opts.showText !== false,
      fontSize: (opts.fontSize ?? BARCODE_TEXT_FONT_SIZE_MODULES) * unitPerModule,
      // 静区只留左右：上下留白会白白吃掉元素高度（jsbarcode 的 margin 是四边通配）
      margin: 0,
      marginLeft: quietModules * unitPerModule,
      marginRight: quietModules * unitPerModule,
      marginTop: 0,
      marginBottom: BARCODE_MARGIN_BOTTOM_MODULES * unitPerModule,
    })
    const viewBox = readViewBox(svg)
    return viewBox ? { widthUnits: viewBox.width, heightUnits: viewBox.height } : null
  }

  const layout = layoutBarcodeSize({
    barHeightMm: opts.barHeightMm,
    boxWidthMm: opts.targetWidthMm ?? 0,
    boxHeightMm: opts.targetHeightMm ?? 0,
    dpi: opts.printerDpi,
    barWidth: opts.barWidth,
    measure,
  })
  // 尺寸不取整：mm 数值一旦被四舍五入，折算回打印点就不再是整数，点对齐随之失效
  if (layout.size) {
    svg.setAttribute('width', `${layout.size.widthMm}mm`)
    svg.setAttribute('height', `${layout.size.heightMm}mm`)
  }

  svg.setAttribute('shape-rendering', 'crispEdges')
  return svg.outerHTML
}

/** 静区取非负整数模块数；未填或非法值回退缺省档，0 是合法档（码面即整张图） */
function qrQuietModules(value?: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : QR_DEFAULT_QUIET_MODULES
}

/** 二维码：QRCode.create 同步取模块矩阵，拼接 SVG（静区按 qrQuietZone，缺省 0 模块＝铺满） */
function renderQrSvg(value: string, opts: CodeRenderOptions): string {
  const level = (opts.qrCodeLevel ?? 'M').toUpperCase()
  const qr = QRCode.create(value, {
    errorCorrectionLevel: (['L', 'M', 'Q', 'H'].includes(level) ? level : 'M') as 'L' | 'M' | 'Q' | 'H',
  })
  const modules = qr.modules
  const size = modules.size
  const dot = 4
  const quiet = qrQuietModules(opts.qrQuietZone) * dot
  const dim = size * dot + quiet * 2
  let rects = ''
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (modules.get(x, y)) {
        rects += `<rect x="${quiet + x * dot}" y="${quiet + y * dot}" width="${dot}" height="${dot}" fill="#000"/>`
      }
    }
  }
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges">${rects}</svg>`
}

/** 码值 → SVG：浏览器渲染器与 DOM 执行器共用同一算法 */
export function renderCodeSvg(
  value: string,
  cellType: 'barcode' | 'qrcode',
  opts: CodeRenderOptions = {},
): string {
  if (!value) throw new Error('empty barcode value')
  return cellType === 'qrcode' ? renderQrSvg(value, opts) : renderBarcodeSvg(value, opts)
}

/** 浏览器条码/二维码渲染器；码值非法或为空时抛错，由渲染管线降级文本占位 */
export const browserCodeRenderer: CodeRenderer = {
  render(value: string, cellType: 'barcode' | 'qrcode', opts: CodeRenderOptions = {}): string {
    return renderCodeSvg(value, cellType, opts)
  },
}
