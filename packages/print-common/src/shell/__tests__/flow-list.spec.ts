// @vitest-environment happy-dom
// 零框架外壳的流式列表验收：对照 canvas 的 FlowListElement.vue + FlowListGroup.vue，
// 并核对与出纸同源的三条口径（列数与行高同源、只提示不写值、跨列上限钳到列数）。
import { describe, it, expect } from 'vitest'
import { resolveFlowGapX, suggestFlowColumns } from '@go-wind/print-core/designer'
import type { ElementType } from '@go-wind/print-core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderPropertyPanel } from '../property-panel'
import { renderDesignElement } from '../elements'
import { ELEMENT_TYPES, renderLeftPanel } from '../panels'

function makeState(): ShellState {
  return {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
}

function makeCtx(options: Record<string, any> = {}, propSearch = ''): ShellCtx {
  const store = new DesignerStore()
  store.addElement('flowList', {
    left: 10, top: 10, width: 190, height: 24, fontSize: 10.5,
    formatter: '{name} {spec}', dataSource: 'drugs',
    flowColumns: 4, flowRowHeight: 8, flowGapX: 6,
    ...options,
  })
  store.selectOne(store.elements[0]!.id)
  return {
    store, format: new FormatToolbar(store), state: { ...makeState(), propSearch },
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false,
    host: { fonts: [] },
  }
}

function paintPanel(ctx: ShellCtx): HTMLElement {
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(renderPropertyPanel(ctx), host)
  return host
}

function paintElement(ctx: ShellCtx): HTMLElement {
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(renderDesignElement(ctx, ctx.store.elements[0]!), host)
  return host
}

const groupTitles = (host: ParentNode) => Array.from(host.querySelectorAll('.group-title'))
  .map(n => n.textContent ?? '')

const fieldLabels = (host: ParentNode, title: string) => {
  const group = Array.from(host.querySelectorAll<HTMLElement>('.property-group'))
    .find(g => g.querySelector('.group-title')?.textContent === title)
  return Array.from(group?.querySelectorAll('.pd-label') ?? []).map(n => n.textContent ?? '')
}

const visibleFieldLabels = (host: ParentNode, title: string) => {
  const group = Array.from(host.querySelectorAll<HTMLElement>('.property-group'))
    .find(g => g.querySelector('.group-title')?.textContent === title)
  return Array.from(group?.querySelectorAll<HTMLElement>('.pd-field') ?? [])
    .filter(f => f.style.display !== 'none')
    .map(f => f.querySelector('.pd-label')?.textContent ?? '')
}

const setColumns = (host: ParentNode, title: string, label: string, value: string) => {
  const group = Array.from(host.querySelectorAll<HTMLElement>('.property-group'))
    .find(g => g.querySelector('.group-title')?.textContent === title)
  const row = Array.from(group?.querySelectorAll<HTMLElement>('.pd-field') ?? [])
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(label))
  const input = row?.querySelector('input.pd-step-input') as HTMLInputElement | null
  if (!input) throw new Error(`未找到属性行：${label}`)
  input.value = value
  input.dispatchEvent(new Event('change'))
  return input
}

const flowGroup = (host: ParentNode) => Array.from(host.querySelectorAll<HTMLElement>('.property-group'))
  .find(g => g.querySelector('.group-title')?.textContent === '流式列表')

const fieldByLabel = (host: ParentNode, label: string) => Array.from(flowGroup(host)?.querySelectorAll<HTMLElement>('.pd-field') ?? [])
  .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(label))

const inputValue = (field?: HTMLElement) => (field?.querySelector('input.pd-step-input') as HTMLInputElement | null)?.value

/** happy-dom 该版本未实现 Storage：分组折叠态读写需要 localStorage（同 __tests__/adsorb-drag.spec.ts） */
function stubStorage() {
  const map = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => { map.set(k, String(v)) },
      removeItem: (k: string) => { map.delete(k) },
      clear: () => map.clear(),
    },
  })
}

describe('工具箱与元素层', () => {
  it('工具箱含「流式列表」，且紧跟在表格之后（与 canvas 同序）', () => {
    const order = ELEMENT_TYPES.map(t => t.type)
    expect(order).toContain('flowList')
    expect(order.indexOf('flowList')).toBe(order.indexOf('table') + 1)
    expect(ELEMENT_TYPES.find(t => t.type === 'flowList')?.label).toBe('流式列表')
  })

  it('元素层按指定列数铺网格，单元一格一个', () => {
    const ctx = makeCtx()
    const host = paintElement(ctx)
    const grid = host.querySelector('.print-flowlist') as HTMLElement
    expect(grid.getAttribute('style')).toContain('repeat(4,')
    expect(grid.getAttribute('style')).toContain('minmax(8mm,auto)')
    expect(host.querySelectorAll('.print-flow-cell').length).toBeGreaterThan(0)
  })

  it('设计态不预演跨列：元素层里不出现跨列声明', () => {
    const ctx = makeCtx({ flowAutoSpan: true, flowMaxSpan: 2 })
    const host = paintElement(ctx)
    expect(host.innerHTML).not.toContain('grid-column:span')
  })
})

describe('属性台', () => {
  it('选中流式列表时出现「流式列表」分组，列数/行高/间距/跨列开关逐项齐备', () => {
    const host = paintPanel(makeCtx())
    expect(groupTitles(host)).toContain('流式列表')
    const labels = fieldLabels(host, '流式列表')
    expect(labels).toContain('每行列数')
    expect(labels.some(l => l.includes('行高')))
    expect(labels.some(l => l.includes('行高 (mm)'))).toBe(true)
    expect(labels.some(l => l.includes('单元横向间距'))).toBe(true)
    expect(labels.some(l => l.includes('内容过长时跨列'))).toBe(true)
    // 开关缺省关：不出现「最多跨几列」这一行
    expect(labels.some(l => l.includes('最多跨几列'))).toBe(false)
  })

  it('打开跨列开关后补出「最多跨几列」，并按每行列数收敛到合法值', () => {
    const ctx = makeCtx({ flowAutoSpan: true })
    const host = paintPanel(ctx)
    expect(fieldLabels(host, '流式列表').some(l => l.includes('最多跨几列'))).toBe(true)
    expect(ctx.store.elements[0]!.options.flowMaxSpan).toBeLessThanOrEqual(4)
    expect(ctx.store.elements[0]!.options.flowMaxSpan).toBeGreaterThanOrEqual(1)
  })

  it('列数改小时「最多跨几列」被一并顶回（全案唯一改用户值处）', () => {
    const ctx = makeCtx({ flowColumns: 4, flowAutoSpan: true, flowMaxSpan: 4 })
    const host = paintPanel(ctx)
    setColumns(host, '流式列表', '每行列数', '2')
    const o = ctx.store.elements[0]!.options
    expect(o.flowColumns).toBe(2)
    expect(o.flowMaxSpan).toBe(2)
  })

  it('列数挤不下时只给提示，不回写用户填的数', () => {
    // 框宽 20mm、字号 10.5pt 放不下 8 列，但属性台必须保留 8
    const ctx = makeCtx({ flowColumns: 8, width: 20 })
    const host = paintPanel(ctx)
    const hint = Array.from(host.querySelectorAll('.pd-hint')).map(n => n.textContent ?? '').join('|')
    expect(hint).toContain('偏挤')
    expect(hint).toContain('数值保持不变')
    expect(ctx.store.elements[0]!.options.flowColumns).toBe(8)
  })

  it('搜「跨列」只剩跨列相关的两行（与 canvas 的搜索门控同口径）', () => {
    const host = paintPanel(makeCtx({ flowAutoSpan: true }, '跨列'))
    expect(groupTitles(host)).toContain('流式列表')
    const shown = visibleFieldLabels(host, '流式列表')
    expect(shown.some(l => l.includes('内容过长时跨列'))).toBe(true)
    expect(shown.some(l => l.includes('最多跨几列'))).toBe(true)
    // 搜索时其余行仍在 DOM 里，只是被门控隐藏
    expect(fieldLabels(host, '流式列表').some(l => l.includes('每行列数'))).toBe(true)
    expect(shown.some(l => l.includes('每行列数'))).toBe(false)
  })

  it('步进框显示 core 解析出的出厂值：手写/存量模板缺字段时不留空（canvas FlowListGroup 同口径）', () => {
    const ctx = makeCtx({ flowColumns: undefined, flowRowHeight: undefined, flowGapX: undefined })
    const host = paintPanel(ctx)
    expect(inputValue(fieldByLabel(host, '每行列数'))).toBe('4')
    expect(inputValue(fieldByLabel(host, '行高'))).toBe('8')
    expect(inputValue(fieldByLabel(host, '单元横向间距'))).toBe('4')
  })

  it('关闭跨列开关不凭空写 flowMaxSpan（canvas 只在打开那一支补钳）', () => {
    const ctx = makeCtx({ flowAutoSpan: true, flowMaxSpan: undefined })
    const host = paintPanel(ctx)
    const sw = fieldByLabel(host, '内容过长时跨列')?.querySelector('input.pd-switch') as HTMLInputElement
    expect(sw.checked).toBe(true)
    sw.checked = false
    sw.dispatchEvent(new Event('change'))
    const o = ctx.store.elements[0]!.options
    expect(o.flowAutoSpan).toBe(false)
    // 出厂值里 flowMaxSpan 恒有键（element-factory 写 2），所以判据取「关开关后仍是 fixture 的 undefined」
    expect(o.flowMaxSpan).toBeUndefined()
  })

  it('「列数挤不下」提示行与 canvas 逐字同串（含句末句号）', () => {
    const ctx = makeCtx({ flowColumns: 8, width: 20 })
    const host = paintPanel(ctx)
    const suggest = suggestFlowColumns(20, resolveFlowGapX(ctx.store.elements[0]!.options.flowGapX), 10.5)
    expect(flowGroup(host)?.querySelector('.pd-hint')?.textContent)
      .toBe(`按当前字号与框宽，8 列偏挤（可放约 ${suggest} 列）。数值保持不变，出纸按 8 列排。`)
  })

  it('分组折叠偏好落在与 canvas 同一个 localStorage 键（property-group-flowList）', () => {
    stubStorage()
    window.localStorage.clear()
    const host = paintPanel(makeCtx())
    const header = flowGroup(host)!.querySelector('.group-header') as HTMLElement
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(window.localStorage.getItem('property-group-flowList')).toBe('false')
    expect(window.localStorage.getItem('property-group-flow-list')).toBeNull()
  })
})

/** 与 canvas 的 __tests__/LayerPanelIcon.spec.ts 断言同一张字面量表，任一侧改动即红 */
const LAYER_ICONS: Record<string, string> = {
  text: 'T', longText: '¶', table: '⊞', flowList: '⊟', image: '🖼', barcode: '≡', qrcode: '▣',
  hline: '—', vline: '|', rect: '□', oval: '○', html: '<>',
}

describe('图层面板类型图标', () => {
  it('12 类元素各有图标，flowList 是 ⊟ 而不是 ? 兜底（与 canvas 同表）', () => {
    const store = new DesignerStore()
    for (const type of Object.keys(LAYER_ICONS)) {
      store.addElement(type as ElementType, { left: 0, top: 0, width: 10, height: 10, title: type })
    }
    const ctx: ShellCtx = {
      store, format: new FormatToolbar(store), state: makeState(),
      repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: {},
    }
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    render(renderLeftPanel(ctx), host)
    // 图层行按 zIndex 排序，故按「类型 → 图标」建表比对，不依赖 DOM 顺序
    const byType: Record<string, string> = {}
    for (const row of Array.from(host.querySelectorAll('.layer-item'))) {
      byType[row.querySelector('.layer-name')?.textContent ?? ''] = row.querySelector('.layer-icon')?.textContent ?? ''
    }
    expect(byType).toEqual(LAYER_ICONS)
    expect(Object.values(byType)).not.toContain('?')
  })
})
