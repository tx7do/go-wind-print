// @vitest-environment happy-dom
// 单元格台边框草稿：线型/宽度/颜色只暂存，点预设或勾单边才落盘。
// 说明文案取自 core（与 canvas 的 TableCellGroup 同一条），本文件锁住 DOM 位置与「点了才写」的行为。
import { describe, it, expect } from 'vitest'
import type { RuntimeElement, TableCell } from '@go-wind/print-core/designer'
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

  it('无边框格回显「无 / 0」；选实线自动补缺省宽度，改宽度后点「全部」才落盘', () => {
    const { host, cell } = cellHarness()
    const sel = host.querySelector<HTMLSelectElement>('.border-style-row select')!
    expect(sel.value, '四边都没有边框 ⇒ 线型无').toBe('none')
    const width0 = host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!
    expect(width0.value, '四边都没有边框 ⇒ 宽度 0').toBe('0')

    sel.value = 'solid'
    sel.dispatchEvent(new Event('change'))
    const input = host.querySelector<HTMLInputElement>('.border-style-row input[type="number"]')!
    expect(input.value, '选实线自动补缺省宽度').toBe('0.75')
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
    const sel = host.querySelector<HTMLSelectElement>('.border-style-row select')!
    sel.value = 'solid'
    sel.dispatchEvent(new Event('change'))
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

  it('多选不取单格边位：不半选，点下去按批写补齐全部', () => {
    const a: Partial<TableCell> = { borders: { top: border(), left: border() } }
    const b: Partial<TableCell> = { borders: { left: border() } }
    const { ctx, boxes } = harness([a, b], 1)
    expect(checked(boxes()), '多选不取任何一格的边位').toEqual([false, false, false, false])
    expect(indeterminate(boxes())).toEqual([false, false, false, false])

    const top = boxes()[0]!
    top.checked = true
    top.dispatchEvent(new Event('change'))
    ctx.repaint()
    expect(Object.keys(a.borders!).sort()).toEqual(['left', 'top'])
    expect(Object.keys(b.borders!).sort()).toEqual(['left', 'top'])
    expect(checked(boxes()), '批写过的边在本选区回显为勾选').toEqual([true, false, false, false])
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

  it('一条边都没画 ⇒ 线型「无」、宽度 0，颜色仍按缺省草稿', () => {
    expect(harness([{ borders: undefined }]).rows()).toEqual({ style: 'none', width: '0', color: '#333333' })
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

describe('单元格台单选回显 / 多选批写', () => {
  const border = (w = 0.75, style: 'solid' | 'dashed' | 'dotted' = 'solid', color = '#333333') => ({ width: w, style, color })

  /** 多行多格夹具：rowCells 原样进矩阵，选区可跨行（用于合并格判单选） */
  function harness(
    rowCells: Array<Array<Partial<TableCell>>>,
    sel: { r1: number; c1: number; r2: number; c2: number },
  ) {
    const store = new DesignerStore()
    store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
    const el: RuntimeElement = store.elements[0]!
    el.options.tableColWidths = rowCells[0]!.map(() => 50)
    el.options.tableRows = rowCells.map((cells, ri) => ({
      id: `r${ri}`, type: 'data', height: 10, cells: cells.map((c, ci) => ({ id: `c${ri}-${ci}`, ...c })),
    })) as never
    store.setTableSelection({ elementId: el.id, ...sel })
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
    const cell = (r: number, c: number) => (el.options.tableRows as any[])[r].cells[c] as TableCell
    const row = (label: string) => rowOf(host, label)
    const move = (s: { r1: number; c1: number; r2: number; c2: number }) => {
      store.setTableSelection({ elementId: el.id, ...s })
      ctx.repaint()
    }
    return { host, ctx, store, cell, row, move }
  }

  it('多选：不显示任何一格的配置值，控件留空并给出「多选」占位', () => {
    const { host, row, ctx } = harness([[
      { formatter: 'A', fontSize: 12, align: 'left', fontWeight: 'bold' },
      { formatter: 'B', fontSize: 16, align: 'center' },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })

    expect(host.textContent).toContain('已选 2 格 · 批量设置')
    const content = row('内容')!.querySelector<HTMLInputElement>('input.pd-input')!
    expect(content.value).toBe('')
    expect(content.placeholder).toContain('多选')
    const size = row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!
    expect(size.value).toBe('')
    expect(size.placeholder).toBe('多选')
    expect(Array.from(row('水平对齐')!.querySelectorAll<HTMLInputElement>('input[type="radio"]')).map(i => i.checked))
      .toEqual([false, false, false, false])
    expect(row('加粗')!.querySelector<HTMLInputElement>('input.pd-switch')!.checked).toBe(false)
    expect(row('字体')!.querySelector<HTMLInputElement>('.font-select-input')!.placeholder).toBe('多选')
    expect(host.querySelector<HTMLSelectElement>('.border-style-row select')!.value).toBe('solid')
    const boxes = Array.from(host.querySelectorAll<HTMLInputElement>('.pd-checkbox-group input'))
    expect(boxes.map(b => b.checked)).toEqual([false, false, false, false])
    expect(boxes.map(b => b.indeterminate)).toEqual([false, false, false, false])
    expect(host.textContent).toContain('多选时不回显单格边框')
    void ctx
  })

  it('多选批写：改字号写到全部选中格，控件显示本次批写值', () => {
    const { cell, row, ctx } = harness([[
      { fontSize: 12 }, { fontSize: 16 },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })

    const size = row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!
    size.value = '14'
    size.dispatchEvent(new Event('change'))
    ctx.repaint()
    expect(cell(0, 0).fontSize).toBe(14)
    expect(cell(0, 1).fontSize).toBe(14)
    expect(row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('14')
  })

  it('换选区即清批写草稿；切回来也不复活', () => {
    const { row, move, cell } = harness([[
      { fontSize: 12 }, { fontSize: 16 },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })
    const size = () => row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!

    size().value = '14'
    size().dispatchEvent(new Event('change'))
    move({ r1: 0, c1: 1, r2: 0, c2: 1 })
    expect(size().value, '单选取该格真实值（批写后两格都是 14）').toBe('14')
    move({ r1: 0, c1: 0, r2: 0, c2: 1 })
    expect(size().value, '换回多选不残留上次批写值').toBe('')
    expect(cell(0, 0).fontSize).toBe(14)
  })

  it('合并格虽然 rect 跨两行，只有一个可写主格 ⇒ 仍按单选回显', () => {
    const { host, row } = harness([
      [{ rowspan: 2, formatter: '合并标题', fontSize: 20 }],
      [{ merged: true }],
    ], { r1: 0, c1: 0, r2: 1, c2: 0 })

    expect(host.textContent).not.toContain('批量设置')
    expect(row('内容')!.querySelector<HTMLInputElement>('input.pd-input')!.value).toBe('合并标题')
    expect(row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe('20')
  })

  it('多选的类型专属行按共有类型出现：全条码才有码制，混合类型不显示', () => {
    const allBarcode = harness([[
      { cellType: 'barcode' }, { cellType: 'barcode' },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })
    expect(allBarcode.row('码制')).toBeTruthy()
    expect(allBarcode.row('码制')!.querySelector<HTMLSelectElement>('select')!.value).toBe('__multi__')

    const mixed = harness([[
      { cellType: 'barcode' }, { cellType: 'qrcode' },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })
    expect(mixed.row('码制')).toBeUndefined()
    expect(mixed.row('纠错级别')).toBeUndefined()
    expect(mixed.row('文字溢出')).toBeUndefined()
  })

  it('单格四边规格不一致：三行显示「混合」，未改项按缺省档批写', () => {
    const { host, ctx, cell } = harness([[
      { borders: { top: border(2, 'dashed', '#ff0000'), right: border() } },
    ]], { r1: 0, c1: 0, r2: 0, c2: 0 })

    const sel = host.querySelector<HTMLSelectElement>('.border-style-row select')!
    expect(sel.value).toBe('__mixed__')
    expect(Array.from(sel.options).some(o => o.textContent === '混合' && o.disabled)).toBe(true)
    const width = host.querySelector<HTMLInputElement>('.border-style-row input[type=number]')!
    expect(width.value).toBe('')
    expect(width.placeholder).toBe('混合')
    expect(host.querySelector<HTMLElement>('.border-style-row .preset-color-swatch')!.style.background).toBe('transparent')
    expect(host.textContent).toContain('四边边框规格不一致')

    Array.from(host.querySelectorAll<HTMLElement>('.border-presets button'))
      .find(b => b.textContent === '全部')!.dispatchEvent(new Event('click'))
    ctx.repaint()
    expect(cell(0, 0).borders!.top).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    expect(host.querySelector<HTMLSelectElement>('.border-style-row select')!.value).toBe('solid')
    expect(host.textContent).not.toContain('四边边框规格不一致')
  })

  it('多选边框：预置按缺省档批写，不沿用某格已有的款式', () => {
    const { host, cell, ctx } = harness([[
      { borders: { top: border(2, 'dashed') } },
      { borders: { top: border(3, 'dotted') } },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })

    expect(host.querySelector<HTMLSelectElement>('.border-style-row select')!.value).toBe('solid')
    Array.from(host.querySelectorAll<HTMLElement>('.border-presets button'))
      .find(b => b.textContent === '全部')!.dispatchEvent(new Event('click'))
    ctx.repaint()
    expect(cell(0, 0).borders!.top).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    expect(cell(0, 1).borders!.top).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    const boxes = Array.from(host.querySelectorAll<HTMLInputElement>('.pd-checkbox-group input'))
    expect(boxes.every(b => !b.checked && !b.indeterminate)).toBe(true)
  })

  it('多选的重置按钮恒可点且不显示单格脏点，点击写 undefined 到全部', () => {
    const { cell, row, ctx } = harness([[
      { fontSize: 12 }, { fontSize: 16 },
    ]], { r1: 0, c1: 0, r2: 0, c2: 1 })

    const reset = row('字号 (pt)')!.querySelector<HTMLElement>('.pd-reset-btn')!
    expect(reset.classList.contains('is-dirty')).toBe(false)
    reset.dispatchEvent(new Event('click'))
    ctx.repaint()
    expect(cell(0, 0).fontSize).toBeUndefined()
    expect(cell(0, 1).fontSize).toBeUndefined()
    expect(row('字号 (pt)')!.querySelector<HTMLInputElement>('input[type="number"]')!.value, '重置后清掉批写草稿')
      .toBe('')
  })
})
