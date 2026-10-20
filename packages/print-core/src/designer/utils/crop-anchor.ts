/**
 * 裁剪锚点（图片剪裁模式）的结构化读写与可动轴判定。
 * canvas 与 common 两套宿主共用，避免两端各写一遍判据而漂移。
 */
import { evaluateTemplate } from './expression-eval.js'
import { DEFAULT_DEMO_DATA } from './demo-data.js'

export type CropAxisName = 'vertical' | 'horizontal' | 'none' | 'unknown'

export interface CropBox {
  /** 元素框宽（mm） */
  widthMm: number
  /** 元素框高（mm） */
  heightMm: number
  /** 图片自然宽（px）；动态字段图在设计态可能拿不到 */
  naturalWidth?: number
  naturalHeight?: number
}

export type CropAnchorParsed =
  | { kind: 'empty' }
  | { kind: 'axes'; x: number; y: number }
  | { kind: 'custom'; raw: string }

const AXIS_X: Record<string, number> = { left: 0, center: 50, right: 100 }
const AXIS_Y: Record<string, number> = { top: 0, center: 50, bottom: 100 }

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 50
  return Math.round(Math.min(100, Math.max(0, v)))
}

function roundMm(v: number): number {
  return Math.round(v * 100) / 100
}

/** 生成落纸值；两轴都居中即缺省态，返回 undefined 让调用方不落声明（空串会覆盖默认居中） */
export function buildCropAnchor(x: number, y: number): string | undefined {
  const cx = clampPct(x)
  const cy = clampPct(y)
  if (cx === 50 && cy === 50) return undefined
  return `${cx}% ${cy}%`
}

function asPct(token: string): number | undefined {
  return /^\d+(?:\.\d+)?%$/.test(token) ? parseFloat(token) : undefined
}

/**
 * 回显存量值。CSS 两值形式第一个值属水平轴，故首 token 先按水平解释、次 token 先按垂直解释，
 * 覆盖 `50% 20%` / `center 20%` / `left top` / `top left` / 单值 `20%`。
 * 表达不了的写法（mm 偏移、四值语法、calc）不猜，原样交「自定义」承载。
 */
export function parseCropAnchor(value?: string): CropAnchorParsed {
  const raw = (value ?? '').trim()
  if (!raw) return { kind: 'empty' }
  const tokens = raw.toLowerCase().split(/\s+/)
  let x: number | undefined
  let y: number | undefined
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const pct = asPct(t)
    if (i === 0) {
      if (t in AXIS_X) x = AXIS_X[t]
      else if (pct !== undefined) x = pct
      else if (t in AXIS_Y) y = AXIS_Y[t]
      else return { kind: 'custom', raw: value as string }
    } else {
      if (t in AXIS_Y && y === undefined) y = AXIS_Y[t]
      else if (pct !== undefined && x === undefined) x = pct
      else if (pct !== undefined && y === undefined) y = pct
      else if (t in AXIS_X && x === undefined) x = AXIS_X[t]
      else return { kind: 'custom', raw: value as string }
    }
  }
  return { kind: 'axes', x: clampPct(x ?? 50), y: clampPct(y ?? 50) }
}

/** 等比铺满只会让一轴溢出，另一轴恰好贴满——据此判定哪个轴真的能挪 */
export function resolveCropAxis(box: CropBox): { axis: CropAxisName; travelMm: number } {
  const { widthMm, heightMm, naturalWidth, naturalHeight } = box
  if (!naturalWidth || !naturalHeight || !widthMm || !heightMm) return { axis: 'unknown', travelMm: 0 }
  const scale = Math.max(widthMm / naturalWidth, heightMm / naturalHeight)
  const travelX = roundMm(naturalWidth * scale - widthMm)
  const travelY = roundMm(naturalHeight * scale - heightMm)
  if (travelY > 0 && travelX <= 0) return { axis: 'vertical', travelMm: travelY }
  if (travelX > 0 && travelY <= 0) return { axis: 'horizontal', travelMm: travelX }
  return { axis: 'none', travelMm: 0 }
}

/** 属性台示意图：可视窗在原图上的位置（百分比，与原图渲染尺寸无关） */
export function cropWindow(
  box: CropBox,
  x: number,
  y: number,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } | null {
  const { widthMm, heightMm, naturalWidth, naturalHeight } = box
  if (!naturalWidth || !naturalHeight || !widthMm || !heightMm) return null
  const k = widthMm / naturalWidth
  const l = heightMm / naturalHeight
  const s = Math.max(k, l)
  return {
    leftPct: (s - k) / s * clampPct(x),
    topPct: (s - l) / s * clampPct(y),
    widthPct: k / s * 100,
    heightPct: l / s * 100,
  }
}

/**
 * 设计态图片地址：`{字段}` 表达式按 demo 数据求值，其余原样。
 * 属性台的示意图与画布元素渲染必须拿到同一个地址，否则控件里看到的图与画布上的图不是一张。
 */
export function resolveDesignImageSrc(raw?: string): string {
  const value = String(raw ?? '')
  if (!value) return ''
  return value.includes('{') ? String(evaluateTemplate(value, DEFAULT_DEMO_DATA)) : value
}

/** 可动轴下拉项：值即该轴的百分比 */
export const CROP_AXIS_OPTIONS: Record<'vertical' | 'horizontal', Array<{ value: number; label: string }>> = {
  vertical: [
    { value: 0, label: '顶部' },
    { value: 50, label: '居中' },
    { value: 100, label: '底部' },
  ],
  horizontal: [
    { value: 0, label: '左侧' },
    { value: 50, label: '居中' },
    { value: 100, label: '右侧' },
  ],
}

/** 判不出可动轴时的降级档位：两轴九宫格，「上中」= 水平居中 + 垂直贴顶 */
export const CROP_GRID_OPTIONS: Array<{ x: number; y: number; label: string }> = [
  { x: 0, y: 0, label: '左上' },
  { x: 50, y: 0, label: '上中' },
  { x: 100, y: 0, label: '右上' },
  { x: 0, y: 50, label: '左中' },
  { x: 50, y: 50, label: '居中' },
  { x: 100, y: 50, label: '右中' },
  { x: 0, y: 100, label: '左下' },
  { x: 50, y: 100, label: '下中' },
  { x: 100, y: 100, label: '右下' },
]

/**
 * 缩放模式档位表：value 仍是 CSS object-fit 原值（模板 JSON 不变），
 * 只有 cover 对用户改称「剪裁」——它正是裁剪锚点生效的那一档。
 * 画布、单元格台、码值台、common 三处都取这一份，改名不再需要六处同步。
 */
export const IMAGE_FIT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'contain', label: '包含（保持比例）' },
  { value: 'cover', label: '剪裁（等比铺满后裁边）' },
  { value: 'fill', label: '拉伸填满' },
  { value: 'none', label: '原始尺寸' },
  { value: 'scale-down', label: '缩小（保持比例）' },
]

/** 可动轴数字框的行标签 */
export function cropAxisLabel(axis: 'horizontal' | 'vertical'): string {
  return axis === 'vertical' ? '垂直位置 (%)' : '水平位置 (%)'
}

/** 一句话讲清这个框到底能挪多少；判不出轴时不瞎猜。keepRaw 表示模板里存的是表达不了的写法 */
export function cropAxisNote(axis: CropAxisName, travelMm: number, keepRaw = false): string {
  if (keepRaw) return '已保留模板里的原值；改动下面任一项就整体替换成新的取位'
  if (axis === 'vertical') return `这个框内可以上下挪动 ${travelMm}mm：0 贴顶，100 贴底`
  if (axis === 'horizontal') return `这个框内可以左右挪动 ${travelMm}mm：0 贴左，100 贴右`
  if (axis === 'none') return '图与框同比例，剪裁后正好铺满，框内没有可挪动的余量'
  return ''
}

/** 数字框行：判得出可动轴只给一行，判不出先水平后垂直，同比例一行都不给 */
export function cropAxisFields(axis: CropAxisName, x: number, y: number): Array<{ name: 'horizontal' | 'vertical'; label: string; value: number }> {
  if (axis === 'vertical') return [{ name: 'vertical', label: cropAxisLabel('vertical'), value: y }]
  if (axis === 'horizontal') return [{ name: 'horizontal', label: cropAxisLabel('horizontal'), value: x }]
  if (axis === 'unknown') {
    return [
      { name: 'horizontal', label: cropAxisLabel('horizontal'), value: x },
      { name: 'vertical', label: cropAxisLabel('vertical'), value: y },
    ]
  }
  return []
}

/** 位置档下拉：判得出可动轴就三档（值仍带上不动轴，换图后另一轴接手），判不出给九宫格 */
export function cropPresetOptions(axis: CropAxisName, x: number, y: number): Array<{ value: string; label: string }> {
  if (axis === 'vertical') {
    return CROP_AXIS_OPTIONS.vertical.map(o => ({ value: `${x},${o.value}`, label: o.label }))
  }
  if (axis === 'horizontal') {
    return CROP_AXIS_OPTIONS.horizontal.map(o => ({ value: `${o.value},${y}`, label: o.label }))
  }
  return CROP_GRID_OPTIONS.map(o => ({ value: `${o.x},${o.y}`, label: o.label }))
}
