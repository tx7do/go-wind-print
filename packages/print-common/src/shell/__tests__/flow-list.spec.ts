// @vitest-environment happy-dom
// 零框架外壳的流式列表验收：对照 canvas 的 FlowListElement.vue + FlowListGroup.vue，
// 并核对与出纸同源的三条口径（列数与行高同源、只提示不写值、跨列上限钳到列数）。
import { describe, it, expect } from 'vitest'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderPropertyPanel } from '../property-panel'
import { renderDesignElement } from '../elements'
import { ELEMENT_TYPES } from '../panels'

function makeState(propSearch = ''): ShellState {
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
    host: { fonts: ['SimSun', 'SimHei'] },
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
    .find(g => g.querySelector('.group-title') === label || g.querySelector('.group-title')?.textContent === title)
  const row = Array.from(group?.querySelectorAll<HTMLElement>('.pd-field') ?? [])
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(label))
  const input = row?.querySelector('input.pd-step-input') as HTMLInputElement | null
  if (!input) throw new Error(`未找到属性行：${label}`)
  input.value = value
  input.dispatchEvent(new Event('change'))
  return input
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
})
