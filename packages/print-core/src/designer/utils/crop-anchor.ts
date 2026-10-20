/**
 * 裁剪锚点（图片剪裁）的结构化读写与逐轴可挪余量判定。
 * canvas 与 common 两套宿主共用，避免两端各写一遍判据而漂移。
 */
import { evaluateTemplate } from './expression-eval.js'
import { DEFAULT_DEMO_DATA } from './demo-data.js'

export interface CropBox {
  /** 元素框宽（mm） */
  widthMm: number
  /** 元素框高（mm） */
  heightMm: number
  /** 图片自然宽（px）；动态字段图在设计态可能拿不到 */
  naturalWidth?: number
  naturalHeight?: number
  /** 缩放模式（CSS object-fit 原值，缺省 contain）：余量按它逐轴结算 */
  fit?: string
}

/** 逐轴可挪余量（mm）。null＝拿不到图片尺寸，余量未知；0＝该轴贴满，挪不动 */
export interface CropTravel {
  x: number | null
  y: number | null
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

/** 1 CSS px 在此长多少 mm：`none`/`scale-down` 按图片内在尺寸绘制时要用（出纸与画布都按 96dpi 排版） */
const MM_PER_PX = 25.4 / 96

/**
 * 图按该缩放模式画进框后有多大（mm）。等比铺满会溢出、包含会留空、原始尺寸两轴都可能留空——
 * 溢出与空位都算「可挪余量」，因为锚点在两种情形下都能改变画面/图在框内的落点。
 */
function contentMm(box: CropBox): { w: number; h: number } | null {
  const { widthMm, heightMm, naturalWidth, naturalHeight } = box
  if (!naturalWidth || !naturalHeight || !widthMm || !heightMm) return null
  const k = widthMm / naturalWidth
  const l = heightMm / naturalHeight
  switch (box.fit || 'contain') {
    // 拉伸填满：图被钉成框，两轴都挪不动
    case 'fill': return { w: widthMm, h: heightMm }
    case 'cover': {
      const s = Math.max(k, l)
      return { w: naturalWidth * s, h: naturalHeight * s }
    }
    // 原始尺寸不缩放：按图片内在像素尺寸绘制
    case 'none': return { w: naturalWidth * MM_PER_PX, h: naturalHeight * MM_PER_PX }
    case 'scale-down': {
      const s = Math.min(1, Math.min(k, l))
      return { w: naturalWidth * s, h: naturalHeight * s }
    }
    default: {
      const s = Math.min(k, l)
      return { w: naturalWidth * s, h: naturalHeight * s }
    }
  }
}

/** 逐轴可挪余量：拿不到图片尺寸时两轴都是 null（未知），不能糊成 0 说「挪不动」 */
export function resolveCropTravel(box: CropBox): CropTravel {
  const c = contentMm(box)
  if (!c) return { x: null, y: null }
  return {
    x: roundMm(Math.abs(box.widthMm - c.w)),
    y: roundMm(Math.abs(box.heightMm - c.h)),
  }
}

/** 属性台示意图：可视窗在原图上的位置（百分比，与原图渲染尺寸无关） */
export function cropWindow(
  box: CropBox,
  x: number,
  y: number,
): { leftPct: number; topPct: number; widthPct: number; heightPct: number } | null {
  const c = contentMm(box)
  if (!c) return null
  // 该轴可见比例 = 框 / 画出来的图；≥1 说明整轴都在画面里（窗占满原图）
  const fx = Math.min(1, box.widthMm / c.w)
  const fy = Math.min(1, box.heightMm / c.h)
  return {
    leftPct: (1 - fx) * clampPct(x),
    topPct: (1 - fy) * clampPct(y),
    widthPct: fx * 100,
    heightPct: fy * 100,
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

/** 两轴组合档位（九宫格）：「上中」= 水平居中 + 垂直贴顶 */
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
 * 只有 cover 对用户改称「剪裁」——它是最常用的取位档，但锚点并非它独有：
 * cover 挪的是溢出部分，contain／原始尺寸／缩小 挪的是框内的空位，只有 fill 把图钉死在框上才没有取位可言。
 * 画布、单元格台、码值台、common 三处都取这一份，改名不再需要六处同步。
 */
export const IMAGE_FIT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'contain', label: '包含（保持比例）' },
  { value: 'cover', label: '剪裁（等比铺满后裁边）' },
  { value: 'fill', label: '拉伸填满' },
  { value: 'none', label: '原始尺寸' },
  { value: 'scale-down', label: '缩小（保持比例）' },
]

/**
 * 剪裁示意专用的内置示例图（120×120 正方形，3×3 九宫格）：中心靶心，四条边中点各一色
 * （顶红／底蓝／左绿／右橙），四角小灰点。方形是为了让水平与垂直两轴都能演示取位：
 * cover 进竖框裁的是左右、cover 进横框裁的是上下，contain／原始尺寸则两轴都可能留空位。
 * 它只服务于属性台的「原图可视窗示意」：画布与出纸上的空图片仍是虚线「图片」占位，不会变成这张图。
 */
export const CROP_SAMPLE_IMAGE =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNmZmZmZmYiLz48cGF0aCBkPSJNNDAgMFYxMjBNODAgMFYxMjBNMCA0MEgxMjBNMCA4MEgxMjAiIHN0cm9rZT0iI2VlZjFmNiIgc3Ryb2tlLXdpZHRoPSIxIi8+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMy41IiBmaWxsPSIjOGI5NWE1Ii8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMjAiIHI9IjMuNSIgZmlsbD0iIzhiOTVhNSIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMTAwIiByPSIzLjUiIGZpbGw9IiM4Yjk1YTUiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjMuNSIgZmlsbD0iIzhiOTVhNSIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iMjAiIHI9IjciIGZpbGw9IiNjMDM5MmIiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjEwMCIgcj0iNyIgZmlsbD0iIzFmNGZhMyIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iNjAiIHI9IjciIGZpbGw9IiMyYzdhNGEiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI2MCIgcj0iNyIgZmlsbD0iI2UwN2EyMCIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjE0IiBmaWxsPSJub25lIiBzdHJva2U9IiMyZjNhNGEiIHN0cm9rZS13aWR0aD0iNCIvPjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYiIGZpbGw9IiMyZjNhNGEiLz48L3N2Zz4='

/** 示意图来自内置示例图时必须说破，否则用户会把演示图当成自己的业务图来判断取位（两端共用这一串） */
export const CROP_SAMPLE_NOTE = '图片还没设置，上面按内置示例图演示取位；换上真图后档位与可挪量按真图重算'

/**
 * 属性台的示意图该画哪张图：传入已求值的业务图片地址，取不到即回落示例图。
 * isSample 给宿主用来标「示例图，非你的图片」，避免把演示图误认成业务图。
 */
export function resolveCropPreview(resolvedSrc?: string): { src: string; isSample: boolean } {
  const value = String(resolvedSrc ?? '')
  return value ? { src: value, isSample: false } : { src: CROP_SAMPLE_IMAGE, isSample: true }
}

/** 可动轴数字框的行标签 */
export function cropAxisLabel(axis: 'horizontal' | 'vertical'): string {
  return axis === 'vertical' ? '垂直位置 (%)' : '水平位置 (%)'
}

/** 一句话逐轴报数：两轴都能挪就把两个数都写出来；挪不动的那一轴直说，不含糊。keepRaw 表示模板里存的是表达不了的写法 */
export function cropAxisNote(travel: CropTravel, keepRaw = false): string {
  if (keepRaw) return '已保留模板里的原值；改动下面任一项就整体替换成新的取位'
  const { x, y } = travel
  if (x === null || y === null) return ''
  if (x > 0 && y > 0) return `水平可挪 ${x}mm、垂直可挪 ${y}mm：0 贴左／贴顶，100 贴右／贴底`
  if (x > 0) return `水平可挪 ${x}mm；垂直这一轴已贴满，挪不动`
  if (y > 0) return `垂直可挪 ${y}mm；水平这一轴已贴满，挪不动`
  return '这个缩放下图与框正好一样大，两轴都没有可挪的余量'
}

/** 数字框行：两轴常驻（各带本轴余量，未知给 null），宿主只管渲染两行 */
export function cropAxisFields(travel: CropTravel, x: number, y: number): Array<{ name: 'horizontal' | 'vertical'; label: string; value: number; travelMm: number | null }> {
  return [
    { name: 'horizontal', label: cropAxisLabel('horizontal'), value: x, travelMm: travel.x },
    { name: 'vertical', label: cropAxisLabel('vertical'), value: y, travelMm: travel.y },
  ]
}

/**
 * 位置档下拉：两轴都有余量给九宫格；只一轴有余量给该轴三档（另一轴带上现值，换图后接手）；
 * 余量未知或全无也兜底九宫格——让用户能挑，比不给档诚实。
 */
export function cropPresetOptions(travel: CropTravel, x: number, y: number): Array<{ value: string; label: string }> {
  const movX = travel.x !== null && travel.x > 0
  const movY = travel.y !== null && travel.y > 0
  if (movY && !movX) {
    return CROP_AXIS_OPTIONS.vertical.map(o => ({ value: `${x},${o.value}`, label: o.label }))
  }
  if (movX && !movY) {
    return CROP_AXIS_OPTIONS.horizontal.map(o => ({ value: `${o.value},${y}`, label: o.label }))
  }
  return CROP_GRID_OPTIONS.map(o => ({ value: `${o.x},${o.y}`, label: o.label }))
}
