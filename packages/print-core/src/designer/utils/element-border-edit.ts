// 设计态元素边框写入：整圈三字段（borderWidth / borderStyle / borderColor）+ 分边 borders。
// 字段口径与出纸端 resolveElementBorder 同源（pt）；本文件只管「怎么写」，渲染判定仍归 render/element-border.ts。
// 元素只有一圈边，没有单元格那种「相邻格共用边」，故内部档对元素无意义（入口一律置灰）。

import type { ElementBorderEdge, ElementBorderSide, ElementOptions } from '../types.js'
import type { BorderPreset } from './table-matrix.js'

/** 一次写入所用的元素边框规格（pt 口径，与整圈三字段及单元格边框统一） */
export interface ElementBorderSpec {
  width: number
  style: string
  color: string
}

/** 整圈宽度 ≤0 / 非法时的兜底档：点预设要真的出框，不能把 0 原样铺上去 */
export const ELEMENT_BORDER_FALLBACK_WIDTH = 0.75

/** 元素台边框操作说明：三行显示当前生效规格，改一行就是按新规格重铺四边（与单元格的草稿口径不同） */
export const ELEMENT_BORDER_APPLY_HINT
  = '线型 / 宽度 / 颜色即时生效，这三行显示的就是当前生效规格：已有边框时任改一行都会按新规格铺满四边并清掉单边覆盖；上、下、左、右只给选中的边加框，撤掉一边会把它其余三边落成单边；「无」清除边框，「内部」仅表格单元格可用'

type BorderFields = Pick<ElementOptions, 'borderWidth' | 'borderStyle' | 'borderColor' | 'borders'>

/** 边框四边的固定顺序：状态派生、属性台勾选框、工具栏单边按钮共用，避免各处各写一份 */
export const BORDER_EDGE_SIDES: readonly ElementBorderSide[] = ['top', 'right', 'bottom', 'left']

/**
 * 一条边在一组目标（选区单元格 / 多选元素）上的激活态：
 * 全有＝on（按下）、全无＝off、只有部分有＝mixed（界面用半选/第三态表达，点击按补齐处理）。
 * 判定只看「这条边有没有」，与工具栏既有口径一致；存量 `style: 'none'` 的边也算有，改它才走覆盖。
 */
export type BorderEdgeState = 'on' | 'off' | 'mixed'

export function resolveBorderEdgeStates(
  borders: Array<Partial<Record<ElementBorderSide, unknown>> | undefined>,
): Record<ElementBorderSide, BorderEdgeState> {
  const out = {} as Record<ElementBorderSide, BorderEdgeState>
  for (const side of BORDER_EDGE_SIDES) {
    const flags = borders.map(b => !!b?.[side])
    out[side] = flags.length > 0 && flags.every(Boolean)
      ? 'on'
      : flags.some(Boolean) ? 'mixed' : 'off'
  }
  return out
}

/** 线型档位（含「无」）：属性台下拉与工具栏图标共用，避免各处各写一份 */
export type BorderLineStyle = 'none' | 'solid' | 'dashed' | 'dotted' | 'double'
export const BORDER_LINE_STYLES: readonly { value: BorderLineStyle; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
  { value: 'double', label: '双线' },
]

const VALID_BORDER_STYLES: ReadonlySet<string> = new Set(['solid', 'dashed', 'dotted', 'double'])
/** 线型「无」= 这一圈不画：与单元格 TableCellBorder.style='none' 同口径 */
const NO_STYLE = 'none'

/**
 * 元素某条边在画布与出纸上「到底有没有线」：分边自己给过正宽度，或整圈宽度生效（整圈就是四边）。
 * 判据与 render/element-border.ts 的解析一致——分边宽度 ≤0 会被跳过、整圈照样盖住那条边。
 */
export function elementBorderEdgeVisible(opts: BorderFields, side: ElementBorderSide): boolean {
  const edge = opts.borders?.[side]
  // 分边的线型为 none 时出纸会跳过它、回落到整圈（见 render/element-border 的 parseBorder）
  if (edge && edge.style !== NO_STYLE
    && typeof edge.width === 'number' && Number.isFinite(edge.width) && edge.width > 0) return true
  const w = opts.borderWidth
  return opts.borderStyle !== NO_STYLE
    && typeof w === 'number' && Number.isFinite(w) && w > 0
}

/** 元素的可见边集合（供多选时派生四边按下态，与属性台勾选框同一判据） */
export function elementVisibleBorders(opts: BorderFields): Partial<Record<ElementBorderSide, ElementBorderEdge>> {
  const out: Partial<Record<ElementBorderSide, ElementBorderEdge>> = {}
  for (const side of BORDER_EDGE_SIDES) {
    if (elementBorderEdgeVisible(opts, side)) out[side] = opts.borders?.[side] ?? { width: opts.borderWidth as number }
  }
  return out
}

/** 用元素当前整圈三字段拼出待应用规格：属性台没有草稿态，规格就是元素自身现值 */
export function resolveElementBorderSpec(opts: BorderFields): ElementBorderSpec {
  const w = opts.borderWidth
  const width = typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : ELEMENT_BORDER_FALLBACK_WIDTH
  return { width, style: opts.borderStyle || 'solid', color: opts.borderColor || '#333333' }
}

/**
 * 整圈预设：`all` 与 `outer` 同效（元素只有一圈边，沿用工具栏既有口径），写整圈三字段；
 * `none` 只把宽度归零（出纸端 ≤0 即无边框），线型与颜色留着不动，便于改回宽度就恢复原样；
 * 两者都清掉分边残留，`inner` 对元素不改。
 */
export function applyElementBorderPreset(opts: BorderFields, preset: BorderPreset, spec: ElementBorderSpec): void {
  if (preset === 'inner') return
  opts.borders = undefined
  if (preset === 'none') {
    opts.borderWidth = 0
    return
  }
  opts.borderWidth = spec.width
  opts.borderStyle = spec.style
  opts.borderColor = spec.color
}

/** 该元素是否已有任何可见边框（整圈生效，或至少一条分边宽度 >0） */
function hasVisibleElementBorder(opts: BorderFields): boolean {
  return BORDER_EDGE_SIDES.some(s => elementBorderEdgeVisible(opts, s))
}

/** 属性台三行要显示的「当前生效规格」：undefined＝未设，'mixed'＝各边不一（界面留空并报「混合」） */
export interface BorderSpecDisplay {
  width: number | 'mixed' | undefined
  style: string | 'mixed' | undefined
  color: string | 'mixed' | undefined
}

type EdgeLike = { width?: unknown; style?: unknown; color?: unknown }

/** 逐字段取一致值：全等给该值，不一致给 mixed，空集合给 undefined */
function pickField<K extends keyof EdgeLike>(edges: EdgeLike[], key: K): EdgeLike[K] | 'mixed' | undefined {
  if (!edges.length) return undefined
  const first = edges[0]?.[key]
  return edges.every(e => e[key] === first) ? first as EdgeLike[K] : 'mixed'
}

/** 把分边的线型归一到出纸档位再比（未写 style 出纸就是实线，不能算成"另一种线型"） */
function normalizeEdge(edge: ElementBorderEdge | undefined): EdgeLike | undefined {
  if (!edge) return undefined
  const style = typeof edge.style === 'string' && VALID_BORDER_STYLES.has(edge.style) ? edge.style : 'solid'
  return { width: edge.width, style: edge.style === undefined ? undefined : style, color: edge.color }
}

/** 可见分边的一致规格（无可见边返回 undefined）：线型未写按出纸档算实线 */
function displayOfVisibleEdges(opts: BorderFields): BorderSpecDisplay | undefined {
  const visible = BORDER_EDGE_SIDES
    .map(s => opts.borders?.[s])
    .filter((e): e is ElementBorderEdge => typeof e?.width === 'number' && Number.isFinite(e.width) && e.width > 0)
    .map(e => normalizeEdge(e)!)
  if (!visible.length) return undefined
  const style = pickField(visible, 'style')
  return {
    width: pickField(visible, 'width') as number | 'mixed' | undefined,
    style: style === undefined ? 'solid' : style as string | 'mixed',
    color: pickField(visible, 'color') as string | 'mixed' | undefined,
  }
}

/**
 * 元素台显示用规格（方案 B）：整圈宽度生效（>0）时整圈就是四边的规格；
 * 整圈未设或已归零时，实际画出来的是可见分边 ⇒ 显示分边的一致值（不一致给 mixed）；
 * 两者都没有 ⇒ 未设（宽度留空，线型按出纸兜底档显示实线，与存量口径一致）。
 */
export function resolveElementBorderDisplay(opts: BorderFields): BorderSpecDisplay {
  const w = opts.borderWidth
  const declared = typeof w === 'number' && Number.isFinite(w)
  const fromEdges = displayOfVisibleEdges(opts)
  const allVisible = declared && (w as number) > 0
  if (fromEdges && !allVisible) return fromEdges
  // 没有任何可见边框 ⇒ 线型报「无」（线型就是"有没有框 + 什么线"的开关）；有框时未设线型按出纸档显示实线
  const style = allVisible ? (opts.borderStyle || 'solid') : NO_STYLE
  if (declared) return { width: w, style, color: opts.borderColor }
  return { width: undefined, style, color: undefined }
}

/** 勾/撤单边、整圈化时取用的规格：显示派生的三值里取数，mixed／未设落到缺省档 */
export function effectiveElementBorderSpec(opts: BorderFields): ElementBorderSpec {
  const d = resolveElementBorderDisplay(opts)
  return {
    width: typeof d.width === 'number' && d.width > 0 ? d.width : ELEMENT_BORDER_FALLBACK_WIDTH,
    // 「无」不是可复制的线型：勾一条边要出线，落到实线
    style: typeof d.style === 'string' && d.style !== NO_STYLE ? d.style : 'solid',
    color: typeof d.color === 'string' ? d.color : '#333333',
  }
}

/** 整圈三字段一次写入并清掉分边覆盖（= 把该规格铺满四边；预设与属性台改行共用） */
function applyElementBorderAll(opts: BorderFields, spec: ElementBorderSpec): void {
  opts.borderWidth = spec.width
  opts.borderStyle = spec.style
  opts.borderColor = spec.color
  opts.borders = undefined
}

/** 元素台整圈三行的键名（改任一行都走 setElementBorderField 的整圈化落盘） */
export type ElementBorderFieldKey = 'borderWidth' | 'borderStyle' | 'borderColor'

/**
 * 属性台改整圈三行中的一行（方案 B）。
 * 已有可见边框时不能只写那一键：出纸是「先整圈后逐边覆盖」，留着分边改整圈就等于「改了没反应」，
 * 所以一次铺满四边并清掉分边覆盖。元素本来就一条线都没有时，只写用户改的那一键——
 * 改个线型不该凭空长出一条 0.75pt 的框，颜色也不替作者发明一个值。
 */
export function setElementBorderField(
  opts: BorderFields, key: ElementBorderFieldKey, value: number | string | undefined,
): void {
  if (key === 'borderStyle' && value === NO_STYLE) {
    // 线型选「无」＝这个元素不要边框：宽度归零、分边清掉，线型记成 none（与「无边框」预设同效）。
    // 先取可见态再写线型——写完 none 之后"可见"就恒为 false 了，会漏掉清宽度
    const hadBorder = hasVisibleElementBorder(opts)
    opts.borderStyle = NO_STYLE
    if (hadBorder) {
      opts.borderWidth = 0
      opts.borders = undefined
    }
    return
  }
  if (!hasVisibleElementBorder(opts)) {
    if (key === 'borderStyle') {
      // 选一个非「无」的线型＝给这个元素开一条框（缺省宽度），否则选了等于没反应
      opts.borderStyle = value as string
      opts.borderWidth = ELEMENT_BORDER_FALLBACK_WIDTH
      return
    }
    Object.assign(opts, { [key]: value })
    return
  }
  if (key === 'borderWidth' && (typeof value !== 'number' || !(value > 0))) {
    // 宽度归零／清空＝消框，不能被缺省档顶回去
    opts.borderWidth = typeof value === 'number' && value < 0 ? 0 : value as number
    opts.borders = undefined
    return
  }
  applyElementBorderAll(opts, resolveElementBorderSpec({ ...opts, [key]: value } as BorderFields))
}

/**
 * 勾或撤一条边（方案 B 的可见态口径）。
 * 撤边时若整圈正生效，四边都是整圈画的，删不掉「单独一条」——只能把其余三条展开成分边、
 * 再把整圈宽度归零；展开保留各边自己的原值（未设的仍留未设，出纸兜底档不变）。
 */
export function setElementBorderEdgeVisible(
  opts: BorderFields, side: ElementBorderSide, visible: boolean, spec?: ElementBorderSpec,
): void {
  if (visible === elementBorderEdgeVisible(opts, side)) return
  if (!visible) {
    const allWidth = opts.borderWidth
    if (typeof allWidth !== 'number' || !(allWidth > 0)) {
      setElementBorderEdge(opts, side, null)
      return
    }
    const next: Partial<Record<ElementBorderSide, ElementBorderEdge>> = {}
    for (const s of BORDER_EDGE_SIDES) {
      if (s === side) continue
      const own = opts.borders?.[s]
      next[s] = {
        width: own?.width ?? allWidth,
        ...(own?.style !== undefined ? { style: own.style } : opts.borderStyle !== undefined ? { style: opts.borderStyle } : {}),
        ...(own?.color !== undefined ? { color: own.color } : opts.borderColor !== undefined ? { color: opts.borderColor } : {}),
      }
    }
    opts.borders = next
    opts.borderWidth = 0
    return
  }
  setElementBorderEdge(opts, side, spec ?? effectiveElementBorderSpec(opts))
}


/** 写或撤单条分边，不碰整圈三字段；spec 传 null 即撤掉该边 */
export function setElementBorderEdge(opts: BorderFields, side: ElementBorderSide, spec: ElementBorderSpec | null): void {
  const nb = { ...(opts.borders ?? {}) }
  if (spec) nb[side] = { width: spec.width, style: spec.style, color: spec.color }
  else delete nb[side]
  opts.borders = nb
}
