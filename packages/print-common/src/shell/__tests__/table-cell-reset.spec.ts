// @vitest-environment happy-dom
// common 侧单元格组「恢复默认值」验收：证明图标真的渲染出来了、提示不带数字、
// 且写回作用在整个选区而不是当前展示的那一格。
import { describe, it, expect } from 'vitest'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { tableCellGroup } from '../table-props'
import type { TableCell } from '@worm-vue3-print/core/designer'

function makeCtx(cellPatches: Partial<TableCell>[]) {
  const store = new DesignerStore()
  store.addElement('table', {
    left: 10, top: 10, width: 150, height: 30,
    tableColWidths: [50, 50, 50],
    tableRows: [{
      id: 'r2', type: 'data', height: 8,
      cells: cellPatches.map((c, i) => ({ id: `c${i + 1}`, formatter: `{f${i}}`, ...c })),
    }],
  })
  const el = store.elements[0]!
  store.selectOne(el.id)
  store.tableSelection = { elementId: el.id, r1: 0, c1: 0, r2: 0, c2: cellPatches.length - 1 }
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state,
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  return { store, ctx, el }
}

function paint(node: unknown): HTMLElement {
  const host = document.createElement('div')
  render(node, host)
  return host
}

/** 按标签文本找属性行；已接入的行标签文字在 .pd-label-t 内 */
function rowOf(host: HTMLElement, text: string) {
  const row = [...host.querySelectorAll<HTMLElement>('.pd-field')]
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

describe('common 单元格组「恢复默认值」', () => {
  it('字号行渲染出图标，提示固定「跟随表格默认」且不带数字', () => {
    const { ctx, el } = makeCtx([{ fontSize: 14 }])
    const host = paint(tableCellGroup(ctx, el))
    const b = rowOf(host, '字号').querySelector<HTMLElement>('.pd-reset-btn')!
    expect(b).toBeTruthy()
    expect(b.dataset.tip).toBe('恢复默认值（跟随表格默认）')
    expect(b.classList.contains('is-dirty')).toBe(true)
    expect(b.textContent).toBe('')
  })

  it('未设过的格 ⇒ 灰态', () => {
    const { ctx, el } = makeCtx([{}])
    const host = paint(tableCellGroup(ctx, el))
    expect(rowOf(host, '字号').querySelector('.pd-reset-btn')!.classList.contains('is-dirty')).toBe(false)
  })

  it('点击走整选区写回：三格字号一起回到未设', () => {
    const { store, ctx, el } = makeCtx([{ fontSize: 14 }, { fontSize: 14 }, { fontSize: 9 }])
    const host = paint(tableCellGroup(ctx, el))
    rowOf(host, '字号').querySelector<HTMLButtonElement>('.pd-reset-btn')!.click()
    const cells = (store.elements[0]!.options.tableRows as any)[0].cells
    expect(cells.map((c: any) => c.fontSize)).toEqual([undefined, undefined, undefined])
  })

  it('0 与未设是两个状态：内边距设成 0 仍判已偏离，点击回未设', () => {
    const { store, ctx, el } = makeCtx([{ padding: 0 }])
    const host = paint(tableCellGroup(ctx, el))
    const b = rowOf(host, '内边距').querySelector<HTMLButtonElement>('.pd-reset-btn')!
    expect(b.classList.contains('is-dirty')).toBe(true)
    b.click()
    expect((store.elements[0]!.options.tableRows as any)[0].cells[0].padding).toBeUndefined()
  })

  it('单元格类型 / 内容 / 码制三行不挂图标', () => {
    const { ctx, el } = makeCtx([{ cellType: 'barcode', barcodeType: 'CODE128' }])
    const host = paint(tableCellGroup(ctx, el))
    for (const t of ['单元格类型', '内容', '码制']) {
      expect(rowOf(host, t).querySelector('.pd-reset-btn')).toBeNull()
    }
  })

  /** 标签结构改造（文字包进 .pd-label-t）必须保住 .pd-label 的 textContent，
   *  否则属性搜索与宿主按文本匹配的验收会失配。
   *  注：switchRow 的 title 属性是否随结构改造保留，由 table-row 组的
   *  「表头每页重复」行承载，本文件不涉及，不在此声称已验。 */
  it('全部标签 textContent 不含"默认"二字', () => {
    const { ctx, el } = makeCtx([{ fontSize: 14 }])
    const host = paint(tableCellGroup(ctx, el))
    for (const l of host.querySelectorAll<HTMLElement>('.pd-label')) {
      expect(l.textContent).not.toContain('默认')
    }
  })
})
