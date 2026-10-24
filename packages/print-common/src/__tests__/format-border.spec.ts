// 顶部格式栏的边框落盘路由：元素上下文与单元格上下文各走哪条路，与 canvas 的 useFormatToolbar 同口径。
// canvas 侧只测了内层方法（applyCellBorderPreset / applyElementBorder），本文件锁住 common 这层「按上下文分流」。
import { describe, it, expect } from 'vitest'
import type { ElementType, RuntimeElement, TableCell } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../core/store'
import { FormatToolbar } from '../core/format'
import { render } from '../core/h'
import type { ShellCtx, ShellState } from '../shell/controls'
import { renderFormatBar } from '../shell/format-bar'

function makeCtx(store: DesignerStore, format: FormatToolbar): ShellCtx {
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  return {
    store, format, state, repaint: () => {}, fire: () => {},
    showHelp: true, isEdit: false, host: {},
  }
}

function elementHarness(type: ElementType = 'text', options: Record<string, any> = {}) {
  const store = new DesignerStore()
  store.addElement(type, { left: 10, top: 10, width: 40, height: 20, ...options })
  store.selectOne(store.elements[0]!.id)
  const format = new FormatToolbar(store)
  format.borderWidth = 2
  format.borderStyle = 'dashed'
  format.borderColor = '#333333'
  return { store, format, el: store.elements[0] as RuntimeElement, ctx: makeCtx(store, format) }
}

function cellHarness() {
  const store = new DesignerStore()
  store.addElement('table', { left: 10, top: 10, width: 60, height: 20 })
  const el = store.elements[0] as RuntimeElement
  el.options.tableColWidths = [30, 30]
  el.options.tableRows = [
    { id: 'r0', type: 'data', height: 10, cells: [{ id: 'c0' }, { id: 'c1' }] },
    { id: 'r1', type: 'data', height: 10, cells: [{ id: 'c2' }, { id: 'c3' }] },
  ] as never
  store.selectOne(el.id)
  store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 1, c2: 1 })
  const format = new FormatToolbar(store)
  format.borderWidth = 1
  format.borderStyle = 'solid'
  format.borderColor = '#000000'
  return { store, format, el, cell: () => el.options.tableRows![0]!.cells[0] as TableCell, ctx: makeCtx(store, format) }
}

const paintBar = (ctx: ShellCtx) => {
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  // 边框那一格在 dropdown 内，面板只在展开态进 DOM（与 canvas 同形）
  ctx.state.openDd = 'border'
  render(renderFormatBar(ctx), host)
  return host
}

describe('格式栏边框预设的路由', () => {
  it('元素上下文：「外侧」与「全部」同效，铺整圈三字段并清掉分边残留', () => {
    const { format, el } = elementHarness('text', { borderWidth: 0.5, borders: { top: { width: 0.5, style: 'solid', color: '#000' } } })
    expect(format.context).toBe('elements')
    format.applyBorderPreset('outer')
    expect(el.options.borderWidth).toBe(2)
    expect(el.options.borderStyle).toBe('dashed')
    expect(el.options.borderColor).toBe('#333333')
    expect(el.options.borders?.top).toBeUndefined()
  })

  it('元素上下文：「无」只把宽度归零，线型与颜色留着便于改回', () => {
    const { format, el } = elementHarness('text', { borderWidth: 3, borderStyle: 'dotted', borderColor: '#123456' })
    format.applyBorderPreset('none')
    expect(el.options.borderWidth).toBe(0)
    expect(el.options.borderStyle).toBe('dotted')
    expect(el.options.borderColor).toBe('#123456')
  })

  it('「内部」那一格只在单元格上下文可点（与 canvas 的 :disabled="!isCells" 同口径）', () => {
    // 元素只有一圈边，没有相邻格共用线；这里锁住「元素上下文点不到」这件事本身。
    // 非单元格分支把 inner 并到 all，两侧都是走不到的兜底，不作为契约。
    const elementBar = paintBar(elementHarness('text').ctx)
    const innerInElement = elementBar.querySelector<HTMLButtonElement>('[data-test="preset-inner"]')!
    expect(innerInElement.disabled).toBe(true)
    expect(innerInElement.dataset.tip).toBe('内部边框（仅表格单元格可用）')

    const cellBar = paintBar(cellHarness().ctx)
    const innerInCells = cellBar.querySelector<HTMLButtonElement>('[data-test="preset-inner"]')!
    expect(innerInCells.disabled).toBe(false)
    expect(innerInCells.dataset.tip).toBe('内部边框')
  })

  it('元素上下文单边：整圈未生效时勾/撤只动那条边（用面板草稿）；整圈生效时撤一边会展开其余三边', () => {
    const { format, el } = elementHarness('text', { borderWidth: 0, borderStyle: 'solid' })
    format.applyEdge('top')
    expect(el.options.borders?.top?.width).toBe(2)
    expect(el.options.borderWidth).toBe(0)
    expect(format.edgeOn('top')).toBe(true)
    format.applyEdge('top')
    expect(el.options.borders?.top).toBeUndefined()

    const on = elementHarness('text', { borderWidth: 1.5, borderStyle: 'solid', borderColor: '#333333' })
    expect(on.format.edgeOn('top'), '整圈 1.5pt ⇒ 四边都算有线').toBe(true)
    on.format.applyEdge('top')
    expect(on.el.options.borderWidth).toBe(0)
    expect(Object.keys(on.el.options.borders ?? {}).sort()).toEqual(['bottom', 'left', 'right'])
    expect(on.el.options.borders!.right).toEqual({ width: 1.5, style: 'solid', color: '#333333' })
  })

  it('单元格上下文：预设落进选区单元格边，元素整圈不接手，且 elementEdges 为 null', () => {
    const { format, el, cell } = cellHarness()
    expect(format.context).toBe('cells')
    format.applyBorderPreset('outer')
    const c = cell()
    expect(c.borders?.top).toBeTruthy()
    expect(c.borders?.left).toBeTruthy()
    // 2×2 选区的内部线不应由「外侧」写出
    expect(c.borders?.right).toBeUndefined()
    expect(c.borders?.bottom).toBeUndefined()
    expect(el.options.borderWidth).toBeUndefined()
    expect(format.elementEdges).toBeNull()
  })

  it('单元格上下文「内部」只铺相邻格共用线，不铺外圈', () => {
    const { format, el, cell } = cellHarness()
    format.applyBorderPreset('inner')
    const c = cell()
    expect(c.borders?.right).toBeTruthy()
    expect(c.borders?.bottom).toBeTruthy()
    expect(c.borders?.top).toBeUndefined()
    expect(c.borders?.left).toBeUndefined()
    expect(el.options.borderWidth).toBeUndefined()
  })
})

describe('格式栏线型可全不选中（线型＝无）', () => {
  it('再点已选中的线型＝取消；取消态下预设按「无」清边框', () => {
    const { format, el } = elementHarness('text', { borderWidth: 2, borderStyle: 'solid', borderColor: '#333333' })
    format.toggleBorderStyle('dashed')
    expect(format.borderStyle, '再点已选中的那一档＝取消').toBeNull()
    format.toggleBorderStyle('dotted')
    expect(format.borderStyle).toBe('dotted')
    format.toggleBorderStyle('dotted')
    expect(format.borderStyle).toBeNull()
    format.applyBorderPreset('all')
    expect(el.options.borderWidth, '线型无 ⇒ 预设等于清边框').toBe(0)
  })

  it('取消态下点单边＝撤掉那条边（整圈生效时其余三边展开）', () => {
    const { format, el } = elementHarness('text', { borderWidth: 1.5, borderStyle: 'solid', borderColor: '#333333' })
    format.toggleBorderStyle('dashed')
    expect(format.borderStyle).toBeNull()
    format.applyEdge('top')
    expect(el.options.borderWidth).toBe(0)
    expect(el.options.borders?.top).toBeUndefined()
    expect(Object.keys(el.options.borders ?? {}).sort()).toEqual(['bottom', 'left', 'right'])
  })
})
