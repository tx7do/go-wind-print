// print-core/src/render/flow-list.ts
// 流式列表元素（flowList）的排布纯逻辑：单元宽度估算、跨列档位、按每行列数占位换行。
//
// 无 DOM 依赖：三端出纸、属性台提示与设计器画布共用同一份算法。
// 「内容过长」的判据只能靠估算——出纸侧管线虽有测量趟，但它测的是元素整体高度，
// 单元逐个宽度不在测量产物里；引 DOM 测量会让三端与画布出现两套结果，故不引。
// 估算只决定「占几个列位」，不参与字号与坐标的最终结算，偏差一档不会互相放大。

/** 每行列数下限 */
export const FLOW_MIN_COLUMNS = 1
/** 每行列数上限：超过这个栏数在常见标签/单据纸宽上已无可读单元 */
export const FLOW_MAX_COLUMNS = 12
/** 行高下限（mm），与表格行高同一档位口径 */
export const FLOW_MIN_ROW_HEIGHT_MM = 3
/** 行高上限（mm） */
export const FLOW_MAX_ROW_HEIGHT_MM = 100
/** 单元横向间距上下限（mm），与标签拼版的格间距同口径 */
export const FLOW_MIN_GAP_X_MM = 0
export const FLOW_MAX_GAP_X_MM = 50

/** 一个 pt 字号对应的毫米数（1pt = 25.4/72 mm） */
const PT_TO_MM = 25.4 / 72

export interface FlowLayoutConfig {
  /** 元素框可用宽度（mm，已扣内边距） */
  width: number
  /** 每行列数 */
  columns: number
  /** 单元横向间距（mm） */
  gapX: number
  /** 字号（pt），跨列判定的估算宽度按它折算 */
  fontSizePt: number
  /** 是否允许内容过长时跨列 */
  autoSpan: boolean
  /** 最多跨几列（会被钳到 columns） */
  maxSpan: number
}

export interface FlowCell {
  text: string
  /** 占用的列位数：1 即不跨列 */
  span: number
}

export interface FlowRow {
  cells: FlowCell[]
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

/** 每行列数：非法或缺省回落到 4，并钳到 1~12 */
export function resolveFlowColumns(value: number | undefined): number {
  return clampInt(value, FLOW_MIN_COLUMNS, FLOW_MAX_COLUMNS, 4)
}

/** 单元横向间距：非法回落到 4mm，钳到 0~50mm */
export function resolveFlowGapX(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 4
  return Math.min(FLOW_MAX_GAP_X_MM, Math.max(FLOW_MIN_GAP_X_MM, value))
}

/** 行高：非法回落到 8mm（与表格缺省行高一致），钳到 3~100mm */
export function resolveFlowRowHeight(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 8
  return Math.min(FLOW_MAX_ROW_HEIGHT_MM, Math.max(FLOW_MIN_ROW_HEIGHT_MM, value))
}

/**
 * 最多跨几列：钳到「每行列数」。这是本元素唯一会改用户填值的行为——
 * 「跨 6 列但每行只有 4 列」是物理上不可实现的值，留着等于让属性台显示一个不生效的数。
 */
export function resolveFlowMaxSpan(value: number | undefined, columns: number): number {
  const cols = resolveFlowColumns(columns)
  const fallback = Math.min(2, cols)
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(cols, Math.max(1, Math.round(value)))
}

/** 单列宽度（mm）：N 列均分元素框宽，扣掉 N-1 个间距 */
export function flowColumnWidthMm(width: number, columns: number, gapX: number): number {
  const cols = resolveFlowColumns(columns)
  const gap = resolveFlowGapX(gapX)
  const avail = width - gap * (cols - 1)
  if (avail <= 0) return 0
  return avail / cols
}

/** 跨 k 列的单元可用宽度（mm）：k 个列宽 + k-1 个间距 */
export function flowSpanWidthMm(colUnitMm: number, gapX: number, span: number): number {
  const k = Math.max(1, Math.floor(span))
  return colUnitMm * k + gapX * (k - 1)
}

/**
 * 文本宽度估算（mm）。按字符类别累加 em advance：
 * 汉字/全角标点 1em、大写与数字 0.6em、小写 0.5em、半角标点 0.4em、空格 0.28em、
 * 其余（含变音字母、西里尔、emoji）0.75em。等宽感强的中文场景偏差最小。
 */
export function estimateTextWidthMm(text: string, fontSizePt: number): number {
  if (!text) return 0
  const em = typeof fontSizePt === 'number' && Number.isFinite(fontSizePt) && fontSizePt > 0
    ? fontSizePt * PT_TO_MM
    : 12 * PT_TO_MM
  let units = 0
  for (const ch of text) {
    if (ch === ' ') { units += 0.28; continue }
    const c = ch.codePointAt(0) ?? 0
    if (
      (c >= 0x3000 && c <= 0x303f)   // CJK 标点
      || (c >= 0x3400 && c <= 0x4dbf) // 扩展 A
      || (c >= 0x4e00 && c <= 0x9fff) // 基本汉字
      || (c >= 0xf900 && c <= 0xfaff) // 兼容汉字
      || (c >= 0xff00 && c <= 0xff60) // 全角字符
      || (c >= 0xffe0 && c <= 0xffe6)
      || c >= 0x20000                  // 扩展 B 及以上
    ) units += 1
    else if (/^[0-9A-Z]$/.test(ch)) units += 0.6
    else if (/^[a-z]$/.test(ch)) units += 0.5
    else if (/^[\u0020-\u007f]$/.test(ch)) units += 0.4
    else units += 0.75
  }
  return units * em
}

/** 一个单元该占几个列位：跨到放得下为止，最多不超过 maxSpan（已钳到列数） */
export function spanForText(
  text: string,
  cfg: Pick<FlowLayoutConfig, 'fontSizePt' | 'gapX' | 'maxSpan' | 'columns' | 'autoSpan'> & { colUnitMm: number },
): number {
  if (!cfg.autoSpan) return 1
  const ceiling = resolveFlowMaxSpan(cfg.maxSpan, cfg.columns)
  if (ceiling <= 1 || cfg.colUnitMm <= 0) return 1
  const need = estimateTextWidthMm(text, cfg.fontSizePt)
  for (let k = 1; k <= ceiling; k++) {
    if (need <= flowSpanWidthMm(cfg.colUnitMm, cfg.gapX, k)) return k
  }
  return ceiling
}

/**
 * 占位式排布：单元按顺序吃列位，当前行剩不够放该单元时**整个单元**挪到下一行行首
 * （不拆词、不把单元切成两半）。
 */
export function layoutFlowList(items: string[], cfg: FlowLayoutConfig): FlowRow[] {
  const columns = resolveFlowColumns(cfg.columns)
  const gapX = resolveFlowGapX(cfg.gapX)
  const colUnitMm = flowColumnWidthMm(cfg.width, columns, gapX)
  const maxSpan = resolveFlowMaxSpan(cfg.maxSpan, columns)
  const rows: FlowRow[] = []
  let current: FlowCell[] = []
  let used = 0

  for (const raw of items) {
    const text = String(raw ?? '')
    const span = spanForText(text, { ...cfg, columns, gapX, maxSpan, colUnitMm })
    if (current.length > 0 && used + span > columns) {
      rows.push({ cells: current })
      current = []
      used = 0
    }
    current.push({ text, span })
    used += span
  }
  if (current.length > 0) rows.push({ cells: current })
  return rows
}

/**
 * 从单元模板里检出列表源：表达式中出现某个顶层数组字段（`drugs.name` 或直接 `drugs`）
 * 就以它为列表。属性台不再单独配「列表数据源」，模板自己就是数据契约的声明处。
 * 检不出来时交回调用方按「顶层第一个数组」兜底（与表格同一口径）。
 */
export function detectFlowListKey(expr: unknown, data: Record<string, any> | undefined): string | undefined {
  if (typeof expr !== 'string' || !expr.includes('{') || !data) return undefined
  const roots = new Set<string>()
  for (const token of expr.matchAll(/\{([^{}]*)\}/g)) {
    for (const piece of (token[1] ?? '').split(/[^A-Za-z0-9_\u4e00-\u9fa5.]/)) {
      const root = piece.split('.')[0]
      if (root && !/^\d/.test(root)) roots.add(root)
    }
  }
  for (const root of roots) {
    if (Array.isArray(data[root])) return root
  }
  return undefined
}

/**
 * 属性台提示用：按当前字号与间距，元素框宽最多能放下几列「一个汉字都放得下」的单元。
 * 只用于提示，不回写用户填的列数（specs 第八节第 3 项）。
 */
export function suggestFlowColumns(width: number, gapX: number, fontSizePt: number): number {
  const gap = resolveFlowGapX(gapX)
  const minCol = estimateTextWidthMm('一', fontSizePt)
  if (minCol <= 0 || width <= 0) return FLOW_MIN_COLUMNS
  const fit = Math.floor((width + gap) / (minCol + gap))
  return Math.min(FLOW_MAX_COLUMNS, Math.max(FLOW_MIN_COLUMNS, fit))
}

/** 行高（mm）随配置一起传入，避免样式与排布两处取不同口径 */
export interface FlowRenderConfig extends FlowLayoutConfig {
  /** 行高（mm，最小高语义） */
  rowHeight: number
}

const mmNum = (v: number): string => `${Math.round(v * 1000) / 1000}mm`

/** 网格 CSS：列均分、行最小高、纵向不留缝（行距由行高承担） */
export function flowGridStyle(cfg: FlowRenderConfig): string {
  const columns = resolveFlowColumns(cfg.columns)
  const gapX = resolveFlowGapX(cfg.gapX)
  const rowHeight = resolveFlowRowHeight(cfg.rowHeight)
  return [
    `display:grid`,
    `grid-template-columns:repeat(${columns},minmax(0,1fr))`,
    `column-gap:${mmNum(gapX)}`,
    `grid-auto-rows:minmax(${mmNum(rowHeight)},auto)`,
  ].join(';')
}
