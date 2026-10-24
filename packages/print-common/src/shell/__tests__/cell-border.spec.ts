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

describe('单元格台边框回显：勾选框反映选区真实边位', () => {
  const border = (w = 0.75) => ({ width: w, style: 'solid' as const, color: '#333333' })

  /** 可指定多格与选区右端；每次写盘后需手动 repaint（真实壳层由 store 触发） */
  function harness(cells: Array<Partial<TableCell>>, c2 = 0) {
    const store = new DesignerStore()
    store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
    const el: RuntimeElement = store.elements[0]!
    el.options.tableColWidths = cells.map(() => 50)
    el.options.tableRows = [{ id: 'r1', type: 'data', height: 10, cells } as never]
    store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2 })
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
    return { host, ctx, boxes: () => Array.from(host.querySelectorAll<HTMLInputElement>('.pd-checkbox-group input[type="checkbox"]')) }
  }

  const checked = (boxes: HTMLInputElement[]) => boxes.map(b => b.checked)
  const indeterminate = (boxes: HTMLInputElement[]) => boxes.map(b => b.indeterminate)

  it('四边都有边框 ⇒ 四个勾选框全亮；只上边 ⇒ 只「上」亮；无边框 ⇒ 全不亮', () => {
    const full = harness([{ borders: { top: border(), right: border(), bottom: border(), left: border() } }])
    expect(checked(full.boxes())).toEqual([true, true, true, true])
    const topOnly = harness([{ borders: { top: border() } }])
    expect(checked(topOnly.boxes())).toEqual([true, false, false, false])
    const none = harness([{ borders: undefined }])
    expect(checked(none.boxes())).toEqual([false, false, false, false])
  })

  it('勾一条边只动那一条：其余三边不得被整组覆盖删掉', () => {
    const cell: Partial<TableCell> = { borders: { right: border(), bottom: border(), left: border() } }
    const { ctx, boxes } = harness([cell])
    expect(checked(boxes())).toEqual([false, true, true, true])
    const top = boxes()[0]!
    top.checked = true
    top.dispatchEvent(new Event('change'))
    expect(Object.keys(cell.borders!).sort()).toEqual(['bottom', 'left', 'right', 'top'])
    ctx.repaint()
    expect(checked(boxes())).toEqual([true, true, true, true])
  })

  it('选区里只有一格有上边 ⇒ 半选；点它是补齐两边，不动其它边位', () => {
    const a: Partial<TableCell> = { borders: { top: border(), left: border() } }
    const b: Partial<TableCell> = { borders: { left: border() } }
    const { ctx, boxes } = harness([a, b], 1)
    expect(checked(boxes())).toEqual([false, false, false, true])
    expect(indeterminate(boxes())).toEqual([true, false, false, false])

    const top = boxes()[0]!
    top.checked = true
    top.dispatchEvent(new Event('change'))
    ctx.repaint()
    expect(Object.keys(a.borders!).sort()).toEqual(['left', 'top'])
    expect(Object.keys(b.borders!).sort()).toEqual(['left', 'top'])
    expect(checked(boxes())).toEqual([true, false, false, true])
    expect(indeterminate(boxes())).toEqual([false, false, false, false])
  })
})

describe('单元格台三行待应用规格取自选区（方案 B）', () => {
  const b = (w: number, style: 'solid' | 'dashed' | 'dotted' = 'solid', color = '#333333') => ({ width: w, style, color })

  function harness(cells: Array<Partial<TableCell>>, c2 = 0) {
    const store = new DesignerStore()
    store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
    const el: RuntimeElement = store.elements[0]!
    el.options.tableColWidths = cells.map(() => 50)
    el.options.tableRows = [{ id: 'r1', type: 'data', height: 10, cells } as never]
    store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2 })
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
    const rows = () => ({
      style: host.querySelector<HTMLSelectElement>('.border-style-row select')!.value,
      width: host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!.value,
      color: (host.querySelector('.border-style-row .preset-color-swatch') as HTMLElement).style.background,
    })
    const move = (c1: number, c2: number) => {
      store.setTableSelection({ elementId: el.id, r1: 0, c1, r2: 0, c2 })
      ctx.repaint()
    }
    return { host, ctx, store, rows, move }
  }

  it('选区里边的规格一致 ⇒ 线型 / 宽度 / 颜色回显该规格', () => {
    const { rows } = harness([{ borders: { top: b(2, 'dashed', '#123456'), left: b(2, 'dashed', '#123456') } }])
    expect(rows()).toEqual({ style: 'dashed', width: '2', color: '#123456' })
  })

  it('一条边都没画 ⇒ 回到缺省档（实线 0.75），点预设照样出框', () => {
    expect(harness([{ borders: undefined }]).rows()).toEqual({ style: 'solid', width: '0.75', color: '#333333' })
  })

  it('选区里边规格不一 ⇒ 不谎报，整组回到缺省档', () => {
    const { rows } = harness([{ borders: { top: b(2, 'dashed') } }, { borders: { top: b(3, 'dotted') } }], 1)
    expect(rows()).toEqual({ style: 'solid', width: '0.75', color: '#333333' })
  })

  it('改宽度只暂存不落盘；换选区即作废，切回来也不复活', () => {
    const a: Partial<TableCell> = { borders: { top: b(2, 'dashed', '#123456') } }
    const c: Partial<TableCell> = { borders: { top: b(1) } }
    const { host, rows, move } = harness([a, c])
    const input = host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!
    input.value = '4'
    input.dispatchEvent(new Event('change'))
    expect(host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!.value).toBe('4')
    expect(a.borders!.top?.width, '仅改值不落盘').toBe(2)

    move(1, 1)
    expect(rows().width, '换选区给的是该格自己的 1').toBe('1')
    move(0, 0)
    expect(rows().width, '切回来重新派生，不残留敲过的 4').toBe('2')
  })
})

describe('单元格台线型可设为「无」', () => {
  const b = (w: number, style: 'solid' | 'dashed' = 'solid', color = '#333333') => ({ width: w, style, color })

  function harness(cells: Array<Partial<TableCell>>) {
    const store = new DesignerStore()
    store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
    const el: RuntimeElement = store.elements[0]!
    el.options.tableColWidths = [50]
    el.options.tableRows = [{ id: 'r1', type: 'data', height: 10, cells } as never]
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
    return { host, ctx }
  }

  it('选项含「无」；区里边全写着 none 就回显「无」', () => {
    const solid = harness([{ borders: { top: b(1, 'solid') } }])
    const sel = solid.host.querySelector<HTMLSelectElement>('.border-style-row select')!
    expect(Array.from(sel.options).map(o => o.textContent)).toEqual(['无', '实线', '虚线', '点线', '双线'])
    expect(sel.value, '实线边照实回显').toBe('solid')
    const none = harness([{ borders: { top: { width: 1, style: 'none', color: '#333333' }, left: { width: 1, style: 'none', color: '#333333' } } }])
    expect(none.host.querySelector<HTMLSelectElement>('.border-style-row select')!.value).toBe('none')
  })

  it('线型＝无时勾一条边不会出线（按没有这条边处理）', () => {
    const cell: Partial<TableCell> = { borders: { top: b(1, 'solid') } }
    const { host } = harness([cell])
    const sel = host.querySelector<HTMLSelectElement>('.border-style-row select')!
    sel.value = 'none'
    sel.dispatchEvent(new Event('change'))
    const boxes = Array.from(host.querySelectorAll<HTMLInputElement>('.pd-checkbox-group input'))
    boxes[1]!.checked = true
    boxes[1]!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(cell.borders?.right).toBeUndefined()
  })

  it('选「无」后点「全部」＝清掉边框（不写一条隐形的 none 边）', () => {
    const cell: Partial<TableCell> = { borders: { top: b(2, 'dashed') } }
    const { host } = harness([cell])
    const sel = host.querySelector<HTMLSelectElement>('.border-style-row select')!
    sel.value = 'none'
    sel.dispatchEvent(new Event('change'))
    Array.from(host.querySelectorAll<HTMLElement>('.border-presets button')).find(b => b.textContent === '全部')!
      .dispatchEvent(new Event('click'))
    expect(cell.borders).toBeUndefined()
  })
})
