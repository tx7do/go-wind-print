// 格式工具栏状态：从选中元素/表格单元格选区派生上下文与当前值，提供批量写入入口
import { computed, type Ref } from 'vue'
import type {
  RuntimeElement, TableSelection, TableCell, TextAlign, VerticalAlign, TableCellBorder,
  ElementBorderSide,
} from '@worm-vue3-print/core/designer'
import {
  applyBorderPreset, setCellBorderEdge, type BorderPreset,
  applyElementBorderPreset, setElementBorderEdgeVisible, elementVisibleBorders, resolveBorderEdgeStates,
  resolveCellGroupMode, resolveCellBorderDisplay,
  type BorderEdgeState, type ElementBorderSpec,
} from '@worm-vue3-print/core/designer'

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

/** 工具栏边框面板的单元格回读结果：mixed 字段由界面留空，批写时按缺省档兜底 */
export interface CellBorderDraft {
  /** 选区标识（元素 + 矩形）；变化时把草稿重置为该选区真实规格 */
  key: string
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none'
  width: number
  color: string
  mixed: { style: boolean; width: boolean; color: boolean }
}

export interface FormatToolbarDeps {
  elements: Ref<RuntimeElement[]>
  selectedIds: Ref<Set<string>>
  tableSelection: Ref<TableSelection | null>
  recordHistory: () => void
}

export function useFormatToolbar(deps: FormatToolbarDeps) {
  const { elements, selectedIds, tableSelection, recordHistory } = deps

  const selectedElements = computed(() =>
    elements.value.filter(e => selectedIds.value.has(e.id) && !e.options.locked))

  const tableElement = computed(() => {
    const s = tableSelection.value
    return s ? elements.value.find(e => e.id === s.elementId) ?? null : null
  })

  const context = computed<'none' | 'cells' | 'elements'>(() => {
    if (tableSelection.value && tableElement.value) return 'cells'
    if (selectedElements.value.length > 0 || selectedIds.value.size > 0) return 'elements'
    return 'none'
  })

  /** 选区内的可写单元格（跳过被合并占位格） */
  const targetCells = computed<TableCell[]>(() => {
    const s = tableSelection.value
    const rows = tableElement.value?.options.tableRows
    if (!s || !rows) return []
    const out: TableCell[] = []
    for (let r = s.r1; r <= s.r2; r++) {
      for (let c = s.c1; c <= s.c2; c++) {
        const cell = rows[r]?.cells[c]
        if (cell && !cell.merged) out.push(cell)
      }
    }
    return out
  })

  /** 字体/字号/颜色/对齐仅对文本类元素生效 */
  const textTargets = computed(() =>
    selectedElements.value.filter(e => TEXT_TYPES.has(e.printElementType.type)))

  const fontEditable = computed(() => {
    if (context.value === 'cells') return targetCells.value.length > 0
    if (context.value !== 'elements') return false
    return selectedElements.value.length > 0 && textTargets.value.length === selectedElements.value.length
  })

  /** 文本类写入目标：单元格上下文为选区单元格，元素上下文为文本类选中元素 */
  const styleTargets = computed<Array<Record<string, any>>>(() =>
    context.value === 'cells' ? targetCells.value as any : textTargets.value.map(e => e.options))

  function pick<T>(values: T[]): T | typeof MIXED | undefined {
    if (!values.length) return undefined
    const first = values[0]
    return values.every(v => v === first) ? first : MIXED
  }

  const hasToken = (decoration: string | undefined, token: string) =>
    (decoration ?? '').split(/\s+/).includes(token)

  const values = computed(() => {
    const t = styleTargets.value
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
      fontFamily: pick(t.map(x => x.fontFamily)),
      fontSize: pick(t.map(x => x.fontSize)),
      color: pick(t.map(x => x.color)),
      backgroundColor: pick(t.map(x => x.backgroundColor)),
      textAlign: pick(t.map(x => context.value === 'cells' ? x.align : x.textAlign)),
      verticalAlign: pick(t.map(x => context.value === 'cells' ? x.valign : x.verticalAlign)),
      bold: boldFlags.every(Boolean) ? true : boldFlags.some(Boolean) ? MIXED : false,
      underline: deco.map(d => hasToken(d, 'underline')).every(Boolean) ? true : deco.some(d => hasToken(d, 'underline')) ? MIXED : false,
      strike: deco.map(d => hasToken(d, 'line-through')).every(Boolean) ? true : deco.some(d => hasToken(d, 'line-through')) ? MIXED : false,
    }
  })

  function writeCells(fn: (c: TableCell) => void) {
    const t = targetCells.value
    if (!t.length) return
    t.forEach(fn)
    recordHistory()
  }

  function applyStyle(patch: FormatStylePatch) {
    if (context.value === 'cells') {
      writeCells(c => {
        if ('fontFamily' in patch) c.fontFamily = patch.fontFamily
        if ('fontSize' in patch) c.fontSize = patch.fontSize
        if ('color' in patch) c.color = patch.color
        if ('backgroundColor' in patch) c.backgroundColor = patch.backgroundColor
        if ('textAlign' in patch) c.align = patch.textAlign
        if ('verticalAlign' in patch) c.valign = patch.verticalAlign
      })
      return
    }
    const texts = textTargets.value
    const all = selectedElements.value
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
    recordHistory()
  }

  function toggleBold() {
    if (context.value === 'cells') {
      const on = !(values.value.bold === true)
      writeCells(c => { c.fontWeight = on ? 'bold' : undefined })
      return
    }
    const on = !(values.value.bold === true)
    const targets = textTargets.value
    if (!targets.length) return
    targets.forEach(e => { e.options.fontWeight = on ? 'bold' : 'normal' })
    recordHistory()
  }

  function toggleDecoration(token: 'underline' | 'line-through') {
    if (context.value === 'cells') return // 单元格模型无装饰线字段
    const els = textTargets.value
    if (!els.length) return
    const on = !(values.value[token === 'underline' ? 'underline' : 'strike'] === true)
    els.forEach(e => {
      const tokens = (e.options.textDecoration ?? '').split(/\s+/).filter(Boolean)
      const i = tokens.indexOf(token)
      if (on && i < 0) tokens.push(token)
      if (!on && i >= 0) tokens.splice(i, 1)
      e.options.textDecoration = tokens.length ? tokens.join(' ') : undefined
    })
    recordHistory()
  }

  const toggleUnderline = () => toggleDecoration('underline')
  const toggleStrike = () => toggleDecoration('line-through')

  function applyElementBorder(mode: 'all' | 'none', border: ElementBorderSpec) {
    const targets = selectedElements.value
    if (!targets.length) return
    targets.forEach(e => {
      // 整圈预设统一边框形态：分边残留一并清除（「所有边框」=四边一致，「无边框」=全清）
      applyElementBorderPreset(e.options, mode, border)
    })
    recordHistory()
  }

  function applyCellBorderPreset(preset: BorderPreset, border: TableCellBorder) {
    const s = tableSelection.value
    const rows = tableElement.value?.options.tableRows
    if (!s || !rows) return
    applyBorderPreset(rows, { r1: s.r1, c1: s.c1, r2: s.r2, c2: s.c2 }, preset, border)
    recordHistory()
  }

  function applyCellBorderEdges(
    sides: Array<'top' | 'right' | 'bottom' | 'left'>, border: TableCellBorder, on: boolean,
  ) {
    writeCells(c => {
      for (const side of sides) setCellBorderEdge(c, side, on ? border : null)
    })
  }

  /** 工具栏边框面板的单元格回读：单格取该格规格（四边不一致的字段标 mixed 并留空）；多选按缺省档作批写源 */
  const cellBorderDraft = computed<CellBorderDraft | null>(() => {
    if (context.value !== 'cells') return null
    const s = tableSelection.value
    const rows = tableElement.value?.options.tableRows
    if (!s || !rows) return null
    const key = `cells:${s.elementId}:${s.r1}:${s.c1}:${s.r2}:${s.c2}`
    if (resolveCellGroupMode(rows, s).mode === 'multi') {
      return { key, style: 'solid', width: 0.75, color: '#333333', mixed: { style: false, width: false, color: false } }
    }
    const d = resolveCellBorderDisplay(rows, s)
    const noEdges = d.style === undefined && d.width === undefined && d.color === undefined
    return {
      key,
      style: (noEdges ? 'none' : (typeof d.style === 'string' && d.style !== 'mixed' ? d.style : 'solid')) as CellBorderDraft['style'],
      width: noEdges ? 0 : (typeof d.width === 'number' ? d.width : 0.75),
      color: typeof d.color === 'string' && d.color !== 'mixed' ? d.color : '#333333',
      mixed: { style: d.style === 'mixed', width: d.width === 'mixed', color: d.color === 'mixed' },
    }
  })

  type BorderSide = 'top' | 'right' | 'bottom' | 'left'
  const BORDER_SIDES: BorderSide[] = ['top', 'right', 'bottom', 'left']

  /** core 的三态（on/off/mixed）翻成按钮按下态：mixed 用 MIXED 哨兵，界面按"未按下但可补齐"处理 */
  const EDGE_FLAG: Record<BorderEdgeState, boolean | typeof MIXED> = { on: true, off: false, mixed: MIXED }
  function edgeFlags(
    borders: Array<Partial<Record<ElementBorderSide, unknown>> | undefined>,
  ): Record<BorderSide, boolean | typeof MIXED> {
    const states = resolveBorderEdgeStates(borders)
    const out = {} as Record<BorderSide, boolean | typeof MIXED>
    for (const side of BORDER_SIDES) out[side] = EDGE_FLAG[states[side]]
    return out
  }

  /** 单元格选区四边激活态（WPS 式单边按钮的按下态）；非单元格上下文或选区为空为 null */
  const cellEdges = computed<Record<BorderSide, boolean | typeof MIXED> | null>(() => {
    if (context.value !== 'cells') return null
    const t = targetCells.value
    if (!t.length) return null
    return edgeFlags(t.map(c => c.borders))
  })

  /** 单边切换：未全有则补齐该边，全有再点则移除该边（与 Word/WPS 一致） */
  function toggleCellEdge(side: BorderSide, border: TableCellBorder) {
    const on = cellEdges.value?.[side] !== true
    applyCellBorderEdges([side], border, on)
  }

  /** 元素选中集的分边激活态：看「这条边到底有没有线」（整圈生效＝四边都有），与属性台勾选框同一判据 */
  const elementEdges = computed<Record<BorderSide, boolean | typeof MIXED> | null>(() => {
    if (context.value !== 'elements') return null
    const t = selectedElements.value
    if (!t.length) return null
    return edgeFlags(t.map(e => elementVisibleBorders(e.options)))
  })

  /** 元素分边切换：勾上用面板草稿，整圈生效时撤一边会把其余三边展开成分边 */
  function toggleElementEdge(side: ElementBorderSide, border: ElementBorderSpec) {
    const targets = selectedElements.value
    if (!targets.length) return
    const on = elementEdges.value?.[side] !== true
    targets.forEach(e => setElementBorderEdgeVisible(e.options, side, on, border))
    recordHistory()
  }

  /** 撤掉一条边（线型＝无时工具栏的「上/右/下/左」走这条）：整圈生效时其余三边展开成单边 */
  function clearElementEdge(side: ElementBorderSide) {
    const t = selectedElements.value
    if (!t.length) return
    t.forEach(e => setElementBorderEdgeVisible(e.options, side, false))
    recordHistory()
  }

  return {
    context, fontEditable, values,
    applyStyle, toggleBold, toggleUnderline, toggleStrike,
    applyElementBorder, applyCellBorderPreset, applyCellBorderEdges,
    cellEdges, toggleCellEdge, elementEdges, toggleElementEdge, clearElementEdge,
    cellBorderDraft,
  }
}

export type FormatToolbar = ReturnType<typeof useFormatToolbar>
