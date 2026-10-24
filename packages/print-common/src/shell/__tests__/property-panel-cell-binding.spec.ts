// @vitest-environment happy-dom
// 多选单元格时「内容」绑定组让位：它按 r1,c1 单格读写，多选下会只回显/只写第一格。
import { describe, it, expect } from 'vitest'
import type { TableSelection } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderPropertyPanel } from '../property-panel'

function paint(rowCells: Array<Array<Record<string, any>>>, sel: Omit<TableSelection, 'elementId'>) {
  const store = new DesignerStore()
  store.addElement('table', { left: 10, top: 10, width: 100, height: 20 })
  const el = store.elements[0]!
  el.options.tableColWidths = rowCells[0]!.map(() => 50)
  el.options.tableRows = rowCells.map((cells, ri) => ({
    id: `r${ri}`, type: 'data', height: 10,
    cells: cells.map((c, ci) => ({ id: `c${ri}-${ci}`, ...c })),
  })) as never
  store.selectOne(el.id)
  store.setTableSelection({ elementId: el.id, ...sel })
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state,
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: { fonts: [] },
  }
  const host = document.createElement('div')
  render(renderPropertyPanel(ctx), host)
  return host
}

const titles = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>('.group-title')].map(t => t.textContent ?? '')

describe('common 属性台单元格「内容」绑定组的单选门控', () => {
  it('单选单元格：出「内容」绑定组', () => {
    const host = paint([[{ formatter: 'A' }, { formatter: 'B' }]], { r1: 0, c1: 0, r2: 0, c2: 0 })
    expect(titles(host)).toContain('内容')
  })

  it('多选单元格：整组让位，避免只回显/只写第一格', () => {
    const host = paint([[{ formatter: 'A' }, { formatter: 'B' }]], { r1: 0, c1: 0, r2: 0, c2: 1 })
    expect(titles(host)).not.toContain('内容')
    expect(titles(host)).toContain('单元格')
  })

  it('跨行合并格只有一个可写主格：仍算单选，保留「内容」组', () => {
    const host = paint([[{ rowspan: 2, formatter: '合并' }], [{ merged: true }]], { r1: 0, c1: 0, r2: 1, c2: 0 })
    expect(titles(host)).toContain('内容')
  })
})
