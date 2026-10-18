// @vitest-environment happy-dom
// 顶部工具栏自适应收纳（print-common 侧）：与 print-canvas 的 useToolbarOverflow 同一判定、
// 同一优先级链、同一落位形态，验收口径逐条对照 canvas 的 ToolbarOverflowWiring.spec.ts。
import { describe, it, expect } from 'vitest'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderToolbar } from '../toolbar'
import { renderFormatBar } from '../format-bar'
import { applyToolbarOverflow, TOOLBAR_UNITS } from '../toolbar-overflow'

const GAP = 2
const UNIT_W = 80
const OWN_W = 60

function makeState(): ShellState {
  return {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
}

/** happy-dom 无排版引擎：按「逐子项自然宽累加」口径给容器与子项打桩 */
function stubLayout(tb: HTMLElement, available: number) {
  Object.defineProperty(tb, 'clientWidth', { value: available, configurable: true })
  for (const child of Array.from(tb.children) as HTMLElement[]) {
    if (child.classList.contains('tb-spacer') || child.classList.contains('tb-more-group')) continue
    const inner = Array.from(child.querySelectorAll('.tb-ou')) as HTMLElement[]
    for (const u of inner) {
      Object.defineProperty(u, 'offsetWidth', { value: UNIT_W, configurable: true })
      Object.defineProperty(u, 'scrollWidth', { value: UNIT_W, configurable: true })
    }
    const isUnit = child.classList.contains('tb-ou')
    const w = isUnit ? UNIT_W : OWN_W + inner.length * (UNIT_W + GAP)
    Object.defineProperty(child, 'offsetWidth', { value: w, configurable: true })
    Object.defineProperty(child, 'scrollWidth', { value: w, configurable: true })
  }
}

function paint(available: number | null) {
  const store = new DesignerStore()
  store.addElement('text', { left: 10, top: 10, width: 40, height: 10 })
  store.selectOne(store.elements[0]!.id)
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state: makeState(),
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false,
    host: { fonts: ['SimSun'] },
  }
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(renderToolbar(ctx, renderFormatBar(ctx as ShellCtx & { format: FormatToolbar })), host)
  const tb = host.querySelector<HTMLElement>('.designer-toolbar')!
  if (available !== null) stubLayout(tb, available)
  const result = applyToolbarOverflow(host)
  return { host, tb, result }
}

const movedIdsNow = (host: ParentNode) => Array
  .from(host.querySelectorAll('.tb-more-slot > .tb-ou'))
  .map(e => (e as HTMLElement).dataset.unit ?? '')

describe('print-common 工具栏收纳：单元与落位槽声明齐备', () => {
  it('9 个收纳单元按声明注册，且面板为每个单元预留落位槽', () => {
    const { host } = paint(null)
    const ids = Array.from(host.querySelectorAll('.tb-ou[data-unit]'))
      .map(e => (e as HTMLElement).dataset.unit)
    expect(ids.sort()).toEqual(TOOLBAR_UNITS.map(u => u.id).sort())
    const slots = Array.from(host.querySelectorAll('.tb-more-slot[data-unit]'))
      .map(e => (e as HTMLElement).dataset.unit)
    expect(slots.sort()).toEqual(TOOLBAR_UNITS.map(u => u.id).sort())
  })
})

describe('print-common 工具栏收纳：度量未就绪', () => {
  it('宽度未打桩时不搬运任何单元', () => {
    const { host, tb } = paint(null)
    expect(movedIdsNow(host)).toEqual([])
    expect(tb.classList.contains('is-tight')).toBe(false)
  })
})

describe('print-common 工具栏收纳：窄屏按链序搬运', () => {
  it('轻度不足时只把链首单元搬进各自的落位槽', () => {
    const { host } = paint(800)
    const moved = movedIdsNow(host)
    expect(moved).toContain('clipboard')
    expect(moved).not.toContain('font')
  })

  it('被搬运的单元带分组标题落在面板内，触发钮随收纳出现', () => {
    const { host } = paint(800)
    const item = host.querySelector('.tb-more-item[data-unit="clipboard"]')
    expect(item?.querySelector('.tb-menu-label')?.textContent).toBe('剪贴板')
    expect(item?.querySelector('.tb-more-slot .tb-ou')).toBeTruthy()
    const more = host.querySelector<HTMLElement>('.tb-more-group')!
    expect(more.style.display).not.toBe('none')
  })

  it('极端不足时链上单元全部搬运并标记 tight', () => {
    const { host, tb } = paint(200)
    expect(movedIdsNow(host).sort()).toEqual(TOOLBAR_UNITS.map(u => u.id).sort())
    expect(tb.classList.contains('is-tight')).toBe(true)
  })
})

describe('print-common 工具栏收纳：容器变宽后需复位', () => {
  it('同一批节点再次后置遍时，已从落位槽回到原父级', () => {
    const { host, tb } = paint(800)
    expect(movedIdsNow(host).length).toBeGreaterThan(0)
    // 容器变宽（resize 不重绘，只能靠后置遍自己复位）
    stubLayout(tb, 1200)
    applyToolbarOverflow(host)
    expect(movedIdsNow(host)).toEqual([])
    const clip = host.querySelector<HTMLElement>('.tb-ou[data-unit="clipboard"]')
    expect(clip?.parentElement?.classList.contains('tb-more-slot')).toBe(false)
    expect(host.querySelector<HTMLElement>('.tb-more-group')?.style.display).toBe('none')
  })
})

describe('print-common 工具栏收纳：「更多」与内层下拉可并存', () => {
  it('打开「更多」后仍能展开面板内的对齐下拉（canvas 是每个实例独立 open）', () => {
    const store = new DesignerStore()
    store.addElement('text', { left: 10, top: 10, width: 40, height: 10 })
    store.selectOne(store.elements[0]!.id)
    const ctx: ShellCtx = {
      store, format: new FormatToolbar(store),
      state: { ...makeState(), openMore: true, openDd: 'align' },
      repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false,
      host: { fonts: ['SimSun'] },
    }
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    render(renderToolbar(ctx, renderFormatBar(ctx as ShellCtx & { format: FormatToolbar })), host)

    const panel = host.querySelector<HTMLElement>('.tb-more-panel')
    expect(panel?.classList.contains('is-hidden')).toBe(false)
    expect(host.querySelector('.ft-align-panel')).toBeTruthy()
  })
})

describe('print-common 工具栏收纳：宽屏不收纳', () => {
  it('放得下时单元留在原位，收纳触发钮隐藏', () => {
    const { host } = paint(1200)
    expect(movedIdsNow(host)).toEqual([])
    const more = host.querySelector<HTMLElement>('.tb-more-group')!
    expect(more.style.display).toBe('none')
  })
})
