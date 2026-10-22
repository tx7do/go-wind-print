// print-canvas/src/composables/usePreviewZoom.ts
// 打印预览的「查看缩放」，只作用于屏幕，不参与出纸。
//
// 为什么要点阵档：CSS 的 mm 恒按 96px/in 换算（与打印机物理 DPI 无关）。95mm 纸在屏幕上只有
// 359px，本模板 SN 条码 297 模块压在 281px 上＝每模块 0.94 像素，纸面 2 个打印点的信息塞不进
// 1 个屏幕像素，条与条必然塌缩粘连（实测 1x 屏幕只能分辨 147 段，纸面是 297 模块）。
// 把缩放比取到 dpi/96，即「1 屏幕像素 = 1 打印点」，塌缩消失：实测该档下条宽恰好落在
// 2/4/6/8 像素上、逐位均匀且零灰阶——预览与纸面成同一张点阵。
// 自适应档用整数倍而非任意倍：非整数倍会重采样出半像素边，正是「抗锯齿」观感的来源。

/** CSS 绝对单位：1in = 96px */
export const MM_TO_PX = 96 / 25.4
/** 缩放上下限：下限 1 倍不缩小纸面，上限防止长模板把容器撑到不可用 */
export const ZOOM_MIN = 1
export const ZOOM_MAX = 8
/** 拿不到纸型时的兜底宽度（A4 竖版 210mm） */
const FALLBACK_PAPER_WIDTH_MM = 210

export interface ZoomPreset {
  key: string
  /** 实际写进 CSS zoom 的倍率 */
  value: number
  label: string
  /** 悬停说明：点阵档要说清它和纸面的关系 */
  tip: string
}

/** 收集模板里出现过的打印机分辨率：元素与表格单元格都可能有，多页模板要翻 pages */
function collectDpi(node: unknown, out: Set<number>): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) collectDpi(item, out)
    return
  }
  const record = node as Record<string, any>
  if (typeof record.printerDpi === 'number' && record.printerDpi > 0) out.add(record.printerDpi)
  for (const key of Object.keys(record)) {
    if (key === 'printerDpi') continue
    const value = record[key]
    if (value && typeof value === 'object') collectDpi(value, out)
  }
}

/**
 * 取模板的打印机分辨率；同时存在多档时取最大（点距最细，放大倍数最高）。
 * 未填 DPI 的模板不做点对齐，也就没有「点阵档」可言，返回 null。
 */
export function resolvePrinterDpi(templateJson?: Record<string, any> | null): number | null {
  if (!templateJson) return null
  const found = new Set<number>()
  collectDpi(templateJson, found)
  return found.size ? Math.max(...found) : null
}

/** 纸张宽度（CSS px）：兼容单页与多页结构，缺纸型时按 A4 竖版兜底 */
export function paperWidthPx(templateJson?: Record<string, any> | null): number {
  const page = templateJson?.pages?.[0] ?? templateJson ?? {}
  const widthMm = page.customWidth ?? page.width
  if (typeof widthMm === 'number' && widthMm > 0) return widthMm * MM_TO_PX
  // 预设纸型只认 paperSize 常见值，其余按兜底宽，避免为了查表再拉一份 PAPER_PRESETS 进预览
  const presetMm: Record<string, number> = { A3: 297, A4: 210, A5: 148, B5: 176 }
  const named = presetMm[String(page.paperSize ?? '')]
  if (named) {
    const landscape = page.orientation === 'landscape'
    return (landscape ? (named === 210 ? 297 : named) : named) * MM_TO_PX
  }
  return FALLBACK_PAPER_WIDTH_MM * MM_TO_PX
}

/** 适配档：容器宽放得下整页的最大整数倍，非整数一律向下取整（不产生亚像素重采样） */
export function fitZoom(containerPx: number, paperPx: number): number {
  if (containerPx <= 0 || paperPx <= 0) return ZOOM_MIN
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.floor(containerPx / paperPx)))
}

/**
 * 缩放档位表。点阵档放在最前：它是唯一能保证「预览所见 = 纸面所打」的档，
 * 默认也应落到它，否则用户仍会看到条粘连。
 */
export function zoomPresets(dpi: number | null, containerPx: number, paperPx: number): ZoomPreset[] {
  const list: ZoomPreset[] = []
  if (dpi) {
    list.push({
      key: 'dots',
      value: dpi / 96,
      label: `点阵 ${dpi}dpi`,
      tip: `1 屏幕像素 = 1 个打印点（${dpi}dpi ÷ 96dpi）。条与间隙按纸面逐点显示，不会在屏幕上糊成一片`,
    })
  }
  list.push(
    { key: 'fit', value: fitZoom(containerPx, paperPx), label: '适配', tip: '按容器宽放大到放得下整页的最大整数倍' },
    { key: '100', value: 1, label: '100%', tip: '按 CSS 真实尺寸显示（1mm = 3.78 屏幕像素），热敏点距在此档不可分辨' },
    { key: '200', value: 2, label: '200%', tip: '整数倍放大，避免非整数缩放带来的半像素边' },
    { key: '400', value: 4, label: '400%', tip: '整数倍放大，避免非整数缩放带来的半像素边' },
  )
  return list
}

/** 默认档：能点对齐就给点阵，否则给适配 */
export function defaultZoomKey(dpi: number | null): string {
  return dpi ? 'dots' : 'fit'
}
