// @vitest-environment happy-dom
// 单元格台边框草稿：线型/宽度/颜色只暂存，点预设或勾单边才落盘。
// 说明文案取自 core（与 canvas 的 TableCellGroup 同一条），本文件锁住 DOM 位置与「点了才写」的行为。
import { describe, it, expect } from 'vitest'
import type { RuntimeElement, TableCell } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { tableCellGroup } from '../table-props'

const rowOf = (host: HTMLElement, text: string) =>
  Array.from(host.querySelectorAll<HTMLElement>('.pd-field'))
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))

function cellHarness() {
  const store = new DesignerStore()
  store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
  const el: RuntimeElement = store.elements[0]!
  el.options.tableColWidths = [50]
  el.options.tableRows = [{
    id: 'r1', type: 'data', height: 10, cells: [{ id: 'c1', formatter: '文本' }],
  } as never]
  store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2: 0 })
  const host = document.createElement('div')
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state,
    repaint: () => { host.replaceChildren(); render(tableCellGroup(ctx, el), host) },
    fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  ctx.repaint()
  document.body.replaceChildren(host)
  return { host, cell: el.options.tableRows![0]!.cells[0] as TableCell }
}

describe('单元格台边框草稿提示', () => {
  it('说明常驻在预设与单边之下，文案点明要点哪个才落盘', () => {
    const { host } = cellHarness()
    const hints = Array.from(host.querySelectorAll<HTMLElement>('.pd-hint'))
    const hint = hints.find(p => (p.textContent ?? '').includes('才会写入选中的单元格'))
    expect(hint, '单元格台应有边框草稿说明').toBeTruthy()
    expect(hint!.textContent).toContain('全部 / 外侧 / 内部')
    expect(hint!.textContent).toContain('「无」是清除边框')
    const kids = Array.from(host.querySelector('.pd-form')!.children)
    expect(kids.indexOf(hint!)).toBeGreaterThan(kids.indexOf(host.querySelector('.pd-checkbox-group')!))
  })

  it('只改宽度不写边框，点「全部」才按新宽度落盘', () => {
    const { host, cell } = cellHarness()
    const input = host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!
    input.value = '2'
    input.dispatchEvent(new Event('change'))
    expect(cell.borders, '仅改宽度不应落盘').toBeUndefined()

    const all = Array.from(host.querySelectorAll<HTMLElement>('.border-presets button'))
      .find(b => b.textContent === '全部')!
    all.dispatchEvent(new Event('click'))
    const borders = cell.borders!
    expect(['top', 'right', 'bottom', 'left'].map(s => (borders as never as Record<string, { width: number }>)[s].width))
      .toEqual([2, 2, 2, 2])
  })

  it('点「无」清空所选单元格的边框', () => {
    const { host, cell } = cellHarness()
    const click = (label: string) => Array.from(host.querySelectorAll<HTMLElement>('.border-presets button'))
      .find(b => b.textContent === label)!.dispatchEvent(new Event('click'))
    click('全部')
    expect(cell.borders).toBeTruthy()
    click('无')
    expect(cell.borders).toBeUndefined()
  })

  it('说明不抢字段行的位置：内边距行仍紧随其后', () => {
    const { host } = cellHarness()
    expect(rowOf(host, '内边距')).toBeTruthy()
  })
})
