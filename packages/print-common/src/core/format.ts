// 格式工具栏业务逻辑：从 canvas 的 useFormatToolbar / useFormatPainter 语义移植，零 Vue 依赖。
// computed 改为普通 getter（每次现算，天然反映最新 store 状态）；
// Vue 版在函数内 recordHistory 的时机原样保留，并在同一处补 store.emit() 驱动视图重渲染。
import type {
  RuntimeElement, ElementOptions, TableSelection, TableCell,
  TextAlign, VerticalAlign, TableCellBorder, ElementBorderSide,
} from '@go-wind/print-core/designer'
import {
  applyBorderPreset, acceptsElementBorder, ELEMENT_BORDER_SIDES, type BorderPreset,
  applyElementBorderPreset, setCellBorderEdge, setElementBorderEdgeVisible, elementVisibleBorders,
  resolveBorderEdgeStates, resolveCellGroupMode, resolveCellBorderDisplay,
  type BorderEdgeState, type ElementBorderSpec,
} from '@go-wind/print-core/designer'
import type { DesignerStore } from './store'

/** 多选目标间字段值不一致的哨兵 */
export const MIXED: unique symbol = Symbol('mixed')
export type MixedOr<T> = T | typeof MIXED

/** 支持字体/对齐等文本样式的元素类型（与 AppearanceGroup 的 isTextType 口径一致） */
export const TEXT_TYPES = new Set(['text', 'longText'])

export interface FormatStylePatch {
  fontFamily?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  textAlign?: TextAlign
  verticalAlign?: VerticalAlign
}

/** 元素边框规格：类型与写入口径都在 core，本包不再自造一份 */
export type { ElementBorderSpec }

type BorderSide = 'top' | 'right' | 'bottom' | 'left'
const BORDER_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left']

/** core 的三态（on/off/mixed）→ 按钮按下态：mixed 用 MIXED 哨兵，界面按「未按下但可补齐」处理。
 *  边位状态一律由 core 从目标集合派生，属性台勾选框与工具栏按钮共用同一判据。 */
const EDGE_FLAG: Record<BorderEdgeState, MixedOr<boolean>> = { on: true, off: false, mixed: MIXED }
function edgeFlags(
  borders: Array<Partial<Record<ElementBorderSide, unknown>> | undefined>,
): Record<BorderSide, MixedOr<boolean>> {
  const states = resolveBorderEdgeStates(borders)
  const out = {} as Record<BorderSide, MixedOr<boolean>>
  for (const side of BORDER_SIDES) out[side] = EDGE_FLAG[states[side]]
  return out
}

/** 随文本组一起复制的字段（与格式工具栏可写集一致；textFit/行距等属性面板字段不纳入） */
const TEXT_KEYS = [
  'fontFamily', 'fontSize', 'fontWeight', 'color', 'textAlign', 'verticalAlign', 'textDecoration',
] as const

type TextSnapshot = { [K in typeof TEXT_KEYS[number]]: ElementOptions[K] }
interface BorderSnapshot {
  borderWidth?: number
  borderStyle?: string
  borderColor?: string
  borders?: ElementOptions['borders']
}

interface FormatSnapshot {
  /** 源为文本类时才有：应用前还需按目标类型过滤 */
  text: TextSnapshot | null
  backgroundColor?: string
  /** 源类型可携带元素级边框时才有（rect/oval/线/表格排除，与出纸口径一致） */
  border: BorderSnapshot | null
}

export class FormatToolbar {
  // ─── 边框面板草稿（Vue 版为 FormatToolbar.vue 内的 ref，点预设/单边时整体落盘） ───
  /** 线型草稿：null = 一个格式都没选中（线型＝无，点预设/单边即按「无」落盘） */
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | null = 'solid'
  /** 多选/混合态允许留空；批写时按缺省档兜底 */
  borderWidth: number | undefined = 0.75
  borderColor: string | undefined = '#333333'
  /** 单元格四边规格不一致的字段：留空、不谎报；未选时批写按缺省档 */
  borderMixed = { style: false, width: false, color: false }
  /** 最近一次已回读的单元格选区标识：只在新选区回填，避免每次重绘冲掉用户草稿 */
  private borderDraftKey = ''

  get borderMixedAny(): boolean {
    return this.borderMixed.style || this.borderMixed.width || this.borderMixed.color
  }

  // ─── 格式刷状态（交互 UI 由 shell 实现，这里只提供状态与操作） ───
  painterActive = false
  painterLocked = false
  painterSource: string | null = null
  private painterSnapshot: FormatSnapshot | null = null

  constructor(private store: DesignerStore) {}

  // ─── 派生上下文 ───
  private get selectedElements(): RuntimeElement[] {
    return this.store.elements.filter(e => this.store.selectedIds.has(e.id) && !e.options.locked)
  }

  private get tableElement(): RuntimeElement | null {
    const s = this.store.tableSelection
    return s ? this.store.elements.find(e => e.id === s.elementId) ?? null : null
  }

  get context(): 'none' | 'cells' | 'elements' {
    if (this.store.tableSelection && this.tableElement) return 'cells'
    if (this.selectedElements.length > 0 || this.store.selectedIds.size > 0) return 'elements'
    return 'none'
  }

  /** 选区内的可写单元格（跳过被合并占位格） */
  private get targetCells(): TableCell[] {
    const s: TableSelection | null = this.store.tableSelection
    const rows = this.tableElement?.options.tableRows
    if (!s || !rows) return []
    const out: TableCell[] = []
    for (let r = s.r1; r <= s.r2; r++) {
      for (let c = s.c1; c <= s.c2; c++) {
        const cell = rows[r]?.cells[c]
        if (cell && !cell.merged) out.push(cell)
      }
    }
    return out
  }

  /** 字体/字号/颜色/对齐仅对文本类元素生效 */
  private get textTargets(): RuntimeElement[] {
    return this.selectedElements.filter(e => TEXT_TYPES.has(e.printElementType.type))
  }

  get fontEditable(): boolean {
    if (this.context === 'cells') return this.targetCells.length > 0
    if (this.context !== 'elements') return false
    return this.selectedElements.length > 0 && this.textTargets.length === this.selectedElements.length
  }

  /** 文本类写入目标：单元格上下文为选区单元格，元素上下文为文本类选中元素 */
  private get styleTargets(): Array<Record<string, any>> {
    return this.context === 'cells' ? this.targetCells as unknown as Array<Record<string, any>>
      : this.textTargets.map(e => e.options as unknown as Record<string, any>)
  }

  private pick<T>(vals: T[]): T | typeof MIXED | undefined {
    if (!vals.length) return undefined
    const first = vals[0]
    return vals.every(v => v === first) ? first : MIXED
  }

  private hasToken(decoration: string | undefined, token: string): boolean {
    return (decoration ?? '').split(/\s+/).includes(token)
  }

  get values(): {
    fontFamily?: MixedOr<string>
    fontSize?: MixedOr<number>
    color?: MixedOr<string>
    backgroundColor?: MixedOr<string>
    textAlign?: MixedOr<TextAlign>
    verticalAlign?: MixedOr<VerticalAlign>
    bold: MixedOr<boolean>
    underline: MixedOr<boolean>
    strike: MixedOr<boolean>
  } {
    const t = this.styleTargets
    if (!t.length) {
      return {
        fontFamily: undefined, fontSize: undefined, color: undefined, backgroundColor: undefined,
        textAlign: undefined, verticalAlign: undefined,
        bold: false, underline: false, strike: false,
      }
    }
    const boldFlags = t.map(x => x.fontWeight === 'bold' || x.fontWeight === 'bolder')
    const deco = t.map(x => x.textDecoration as string | undefined)
    return {
      fontFamily: this.pick(t.map(x => x.fontFamily)),
      fontSize: this.pick(t.map(x => x.fontSize)),
      color: this.pick(t.map(x => x.color)),
      backgroundColor: this.pick(t.map(x => x.backgroundColor)),
      textAlign: this.pick(t.map(x => this.context === 'cells' ? x.align : x.textAlign)),
      verticalAlign: this.pick(t.map(x => this.context === 'cells' ? x.valign : x.verticalAlign)),
      bold: boldFlags.every(Boolean) ? true : boldFlags.some(Boolean) ? MIXED : false,
      underline: deco.map(d => this.hasToken(d, 'underline')).every(Boolean) ? true : deco.some(d => this.hasToken(d, 'underline')) ? MIXED : false,
      strike: deco.map(d => this.hasToken(d, 'line-through')).every(Boolean) ? true : deco.some(d => this.hasToken(d, 'line-through')) ? MIXED : false,
    }
  }

  // ─── 写入 ───
  /** 落历史并通知视图（时机与 Vue 版 recordHistory 调用点一一对应） */
  private commit() {
    this.store.recordHistory()
    this.store.emit()
  }

  private writeCells(fn: (c: TableCell) => void) {
    const t = this.targetCells
    if (!t.length) return
    t.forEach(fn)
    this.commit()
  }

  applyStyle(patch: FormatStylePatch) {
    if (this.context === 'cells') {
      this.writeCells(c => {
        if ('fontFamily' in patch) c.fontFamily = patch.fontFamily
        if ('fontSize' in patch) c.fontSize = patch.fontSize
        if ('color' in patch) c.color = patch.color
        if ('backgroundColor' in patch) c.backgroundColor = patch.backgroundColor
        if ('textAlign' in patch) c.align = patch.textAlign
        if ('verticalAlign' in patch) c.valign = patch.verticalAlign
      })
      return
    }
    const texts = this.textTargets
    const all = this.selectedElements
    const textKeys = ['fontFamily', 'fontSize', 'color', 'textAlign', 'verticalAlign'] as const
    const hasTextPatch = textKeys.some(k => k in patch)
    const hasBgPatch = 'backgroundColor' in patch
    // 无支持目标就不记历史（如仅选中图片时改字号）
    if (!(texts.length && hasTextPatch) && !(all.length && hasBgPatch)) return
    texts.forEach(e => {
      const o = e.options
      if ('fontFamily' in patch) o.fontFamily = patch.fontFamily
      if ('fontSize' in patch) o.fontSize = patch.fontSize
      if ('color' in patch) o.color = patch.color
      if ('textAlign' in patch) o.textAlign = patch.textAlign
      if ('verticalAlign' in patch) o.verticalAlign = patch.verticalAlign
    })
    if (hasBgPatch) {
      all.forEach(e => { e.options.backgroundColor = patch.backgroundColor })
    }
    this.commit()
  }

  toggleBold() {
    if (this.context === 'cells') {
      const on = !(this.values.bold === true)
      this.writeCells(c => { c.fontWeight = on ? 'bold' : undefined })
      return
    }
    const on = !(this.values.bold === true)
    const targets = this.textTargets
    if (!targets.length) return
    targets.forEach(e => { e.options.fontWeight = on ? 'bold' : 'normal' })
    this.commit()
  }

  private toggleDecoration(token: 'underline' | 'line-through') {
    if (this.context === 'cells') return // 单元格模型无装饰线字段
    const els = this.textTargets
    if (!els.length) return
    const on = !(this.values[token === 'underline' ? 'underline' : 'strike'] === true)
    els.forEach(e => {
      const tokens = (e.options.textDecoration ?? '').split(/\s+/).filter(Boolean)
      const i = tokens.indexOf(token)
      if (on && i < 0) tokens.push(token)
      if (!on && i >= 0) tokens.splice(i, 1)
      e.options.textDecoration = tokens.length ? tokens.join(' ') : undefined
    })
    this.commit()
  }

  toggleUnderline() { this.toggleDecoration('underline') }
  toggleStrike() { this.toggleDecoration('line-through') }

  // ─── 边框 ───
  /**
   * 单元格上下文的三行回读：单格取该格真实规格（四边不一致的字段留空并标 mixed）；
   * 多选按上一轮口径不取单格，落缺省档作批写源。只在选区变化时回填，用户改草稿不会被打断。
   */
  syncBorderDraft(): void {
    if (this.context !== 'cells') {
      if (this.borderDraftKey) {
        // 离开单元格上下文：回缺省草稿，避免把单元格的值带进元素面板
        this.borderDraftKey = ''
        this.borderStyle = 'solid'
        this.borderWidth = 0.75
        this.borderColor = '#333333'
        this.borderMixed = { style: false, width: false, color: false }
      }
      return
    }
    const s = this.store.tableSelection
    const rows = this.tableElement?.options.tableRows
    if (!s || !rows) return
    const key = `cells:${s.elementId}:${s.r1}:${s.c1}:${s.r2}:${s.c2}`
    if (key === this.borderDraftKey) return
    this.borderDraftKey = key
    if (resolveCellGroupMode(rows, s).mode === 'multi') {
      this.borderStyle = 'solid'
      this.borderWidth = 0.75
      this.borderColor = '#333333'
      this.borderMixed = { style: false, width: false, color: false }
      return
    }
    const d = resolveCellBorderDisplay(rows, s)
    const noEdges = d.style === undefined && d.width === undefined && d.color === undefined
    if (noEdges) {
      // 单格四边都没有边框：线型显示「无」、宽度 0（不是缺省实线）
      this.borderMixed = { style: false, width: false, color: false }
      this.borderStyle = null
      this.borderWidth = 0
      this.borderColor = '#333333'
      return
    }
    this.borderMixed = { style: d.style === 'mixed', width: d.width === 'mixed', color: d.color === 'mixed' }
    if (this.borderMixed.style) this.borderStyle = null
    else if (d.style === undefined) this.borderStyle = 'solid'
    else if (d.style === 'none') this.borderStyle = null
    else this.borderStyle = d.style as 'solid' | 'dashed' | 'dotted' | 'double'
    this.borderWidth = this.borderMixed.width ? undefined : (typeof d.width === 'number' ? d.width : 0.75)
    this.borderColor = this.borderMixed.color ? undefined : (typeof d.color === 'string' ? d.color : '#333333')
  }

  /** 当前面板草稿对应的边框规格（Vue 版组件内 borderSpec()）；混合/留空项按缺省档兜底 */
  borderSpec(): TableCellBorder {
    const style = this.borderStyle ?? (this.borderMixed.style ? 'solid' : 'none')
    return {
      width: this.borderWidth ?? 0.75,
      style,
      color: this.borderColor ?? '#333333',
    }
  }

  setBorderWidth(v: number | undefined): void {
    this.borderWidth = v
    this.borderMixed.width = false
  }

  setBorderColor(v: string | undefined): void {
    this.borderColor = v
    this.borderMixed.color = false
  }

  /** 单元格批写落盘后本次规格已统一：混合标记与留空项落定为实际写入值 */
  private settleBorderDraft(): void {
    if (this.context !== 'cells') return
    if (this.borderMixed.style) { this.borderStyle = 'solid'; this.borderMixed.style = false }
    if (this.borderMixed.width) { this.borderWidth = 0.75; this.borderMixed.width = false }
    if (this.borderMixed.color) { this.borderColor = '#333333'; this.borderMixed.color = false }
  }

  /** 再点已选中的线型＝取消该格式（图标全不亮＝线型无） */
  toggleBorderStyle(key: 'solid' | 'dashed' | 'dotted' | 'double') {
    // 只改草稿，不动模板：不产生历史条目（与工具栏其它草稿控件一致，重绘由 shell 负责）
    const next = this.borderStyle === key ? null : key
    this.borderMixed.style = false
    this.borderStyle = next
    // 无边框格（回读为 0）选线型时补缺省宽度；取消线型则宽度归零
    if (next === null) this.borderWidth = 0
    else if (this.borderWidth === 0) this.borderWidth = 0.75
  }

  private applyElementBorder(mode: 'all' | 'none', border: ElementBorderSpec) {
    const targets = this.selectedElements
    if (!targets.length) return
    targets.forEach(e => {
      // 整圈预设统一边框形态：分边残留一并清除（「所有边框」=四边一致，「无边框」=全清）
      applyElementBorderPreset(e.options, mode, border)
    })
    this.commit()
  }

  private applyCellBorderPreset(preset: BorderPreset, border: TableCellBorder) {
    const s = this.store.tableSelection
    const rows = this.tableElement?.options.tableRows
    if (!s || !rows) return
    applyBorderPreset(rows, { r1: s.r1, c1: s.c1, r2: s.r2, c2: s.c2 }, preset, border)
    this.commit()
  }

  private applyCellBorderEdges(
    sides: Array<'top' | 'right' | 'bottom' | 'left'>, border: TableCellBorder, on: boolean,
  ) {
    this.writeCells(c => {
      for (const side of sides) setCellBorderEdge(c, side, on ? border : null)
    })
  }

  /** 单元格选区四边激活态（WPS 式单边按钮的按下态）；非单元格上下文或选区为空为 null */
  get cellEdges(): Record<BorderSide, MixedOr<boolean>> | null {
    if (this.context !== 'cells') return null
    const t = this.targetCells
    if (!t.length) return null
    return edgeFlags(t.map(c => c.borders))
  }

  /** 单边切换：未全有则补齐该边，全有再点则移除该边（与 Word/WPS 一致） */
  private toggleCellEdge(side: BorderSide, border: TableCellBorder) {
    const on = this.cellEdges?.[side] !== true
    this.applyCellBorderEdges([side], border, on)
  }

  /** 元素选中集的分边激活态：看「这条边到底有没有线」（整圈生效＝四边都有），与属性台勾选框同一判据 */
  get elementEdges(): Record<BorderSide, MixedOr<boolean>> | null {
    if (this.context !== 'elements') return null
    const t = this.selectedElements
    if (!t.length) return null
    return edgeFlags(t.map(e => elementVisibleBorders(e.options)))
  }

  /** 元素分边切换：勾上用面板草稿；整圈生效时撤一边会把其余三边展开成分边 */
  private toggleElementEdge(side: ElementBorderSide, border: ElementBorderSpec) {
    const targets = this.selectedElements
    if (!targets.length) return
    const on = this.elementEdges?.[side] !== true
    targets.forEach(e => setElementBorderEdgeVisible(e.options, side, on, border))
    this.commit()
  }

  /** 边框预设（Vue 版组件 onPreset 的路由口径）：单元格上下文走表格预设，否则走元素整圈 */
  applyBorderPreset(preset: BorderPreset) {
    // 线型＝无时预设等于清边框（单元格/元素同口径）；混合态未选线型不能当成「无」
    const withNone = this.borderStyle === null
    if (this.context === 'cells') {
      const clear = withNone && !this.borderMixed.style
      this.applyCellBorderPreset(clear ? 'none' : preset, this.borderSpec())
      this.settleBorderDraft()
    } else {
      this.applyElementBorder(withNone || preset === 'none' ? 'none' : 'all', this.borderSpec())
    }
  }

  /** 单边按钮（Vue 版组件 onEdge 的路由口径）：按上下文落到单元格边或元素分边 */
  applyEdge(side: BorderSide) {
    // 线型＝无时点某条边＝撤掉那条边；混合态未选线型不能当成「无」，按实线补
    if (this.borderStyle === null && !this.borderMixed.style) {
      if (this.context === 'cells') {
        this.applyCellBorderEdges([side], this.borderSpec(), false)
        this.settleBorderDraft()
      } else this.clearElementEdge(side)
      return
    }
    if (this.context === 'cells') {
      this.toggleCellEdge(side, this.borderSpec())
      this.settleBorderDraft()
    } else this.toggleElementEdge(side, this.borderSpec())
  }

  /** 撤掉一条边（线型＝无时工具栏的单边走这条）：整圈生效时其余三边展开成单边 */
  private clearElementEdge(side: ElementBorderSide) {
    const targets = this.selectedElements
    if (!targets.length) return
    targets.forEach(e => setElementBorderEdgeVisible(e.options, side, false))
    this.commit()
  }

  /** 单边按下态（Vue 版组件 edgeOn 口径） */
  edgeOn(side: BorderSide): boolean {
    const edges = this.context === 'cells' ? this.cellEdges : this.elementEdges
    return edges?.[side] === true
  }

  // ─── 格式刷（状态 + 操作；单击/双击/Esc 的交互绑定由 shell 负责） ───
  /** 仅选中单个未锁定元素时可作为格式源 */
  get painterCapturable(): boolean { return this.selectedElements.length === 1 }

  private clonePainterBorders(borders: ElementOptions['borders']): BorderSnapshot['borders'] {
    if (!borders) return undefined
    const out: NonNullable<BorderSnapshot['borders']> = {}
    for (const side of ELEMENT_BORDER_SIDES) {
      const edge = borders[side]
      if (edge) out[side] = { ...edge }
    }
    return out
  }

  /** 从当前唯一选中元素捕获格式并进入刷取模式；locked=true 为双击连续刷 */
  pickPainterSource(nextLocked = false): boolean {
    const src = this.selectedElements[0]
    if (!src) return false
    const o = src.options
    const type = src.printElementType.type
    this.painterSnapshot = {
      text: TEXT_TYPES.has(type)
        ? Object.fromEntries(TEXT_KEYS.map(k => [k, o[k]])) as TextSnapshot
        : null,
      backgroundColor: o.backgroundColor,
      border: acceptsElementBorder(type)
        ? { borderWidth: o.borderWidth, borderStyle: o.borderStyle, borderColor: o.borderColor, borders: this.clonePainterBorders(o.borders) }
        : null,
    }
    this.painterSource = src.id
    this.painterActive = true
    this.painterLocked = nextLocked
    return true
  }

  cancelPainter() {
    this.painterActive = false
    this.painterLocked = false
    this.painterSource = null
    this.painterSnapshot = null
  }

  /** 按目标类型过滤写入；backgroundColor 全类型通用，与格式工具栏口径一致 */
  applyPainter(el: RuntimeElement): boolean {
    const s = this.painterSnapshot
    if (!s || el.options.locked || el.id === this.painterSource) return false
    const o = el.options
    const type = el.printElementType.type
    if (s.text && TEXT_TYPES.has(type)) Object.assign(o, s.text)
    o.backgroundColor = s.backgroundColor
    if (s.border && acceptsElementBorder(type)) {
      o.borderWidth = s.border.borderWidth
      o.borderStyle = s.border.borderStyle
      o.borderColor = s.border.borderColor
      o.borders = this.clonePainterBorders(s.border.borders)
    }
    return true
  }

  /** Vue 版 watch(selectedIds) 的等价入口：shell 在选中集变化后调用；单击模式刷一次即退出 */
  painterSyncSelection() {
    if (!this.painterActive || !this.painterSnapshot) return
    const targets = this.selectedElements
    if (!targets.length) { this.cancelPainter(); return }
    let applied = false
    targets.forEach(el => { applied = this.applyPainter(el) || applied })
    if (!applied) return
    this.commit()
    if (!this.painterLocked) this.cancelPainter()
  }

  /** Esc 退出连续刷：shell 绑定 keydown 后转发（输入控件聚焦时忽略，与 Vue 版一致） */
  handlePainterKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !this.painterActive) return
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    this.cancelPainter()
  }
}
