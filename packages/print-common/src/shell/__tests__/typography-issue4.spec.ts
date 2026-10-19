// GitHub issue #4 Common 端契约：与 canvas/core 同口径（缩进 em、justify 纵向主轴、image 锚点）
import { describe, it, expect } from 'vitest'
import { imageStyle, textLikeStyle } from '../elements.js'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { tableCellGroup } from '../table-props'
import { renderTable } from '../table'

function el(type: string, options: Partial<RuntimeElement['options']> = {}): RuntimeElement {
  return {
    id: 'x',
    options: { left: 0, top: 0, width: 40, height: 10, ...options },
    printElementType: { type: type as any, title: type },
  } as RuntimeElement
}

describe('textLikeStyle 与画布/出纸同源', () => {
  it('longTextIndent → textIndent 以 em 输出', () => {
    expect(textLikeStyle(el('longText', { longTextIndent: 2 })).style.textIndent).toBe('2em')
  })

  it('未设 longTextIndent 时缩进为 0', () => {
    expect(textLikeStyle(el('longText')).style.textIndent).toBe('0')
  })

  it('justify × verticalAlign → 主轴转纵向，交叉轴 stretch 让行盒取满宽', () => {
    const s = textLikeStyle(el('text', { textAlign: 'justify', verticalAlign: 'middle' })).style
    expect(s.display).toBe('flex')
    expect(s.flexDirection).toBe('column')
    expect(s.justifyContent).toBe('center')
    expect(s.alignItems).toBeUndefined()
    expect(s.textAlign).toBe('justify')
  })

  it('存量 left/center/right × verticalAlign 仍走横向 flex', () => {
    const s = textLikeStyle(el('text', { textAlign: 'center', verticalAlign: 'top' })).style
    expect(s.alignItems).toBe('flex-start')
    expect(s.justifyContent).toBe('center')
    expect(s.flexDirection).toBeUndefined()
  })

  it('justify 补 textAlignLast，单行才会撑满行宽（与画布/出纸同策）', () => {
    expect(textLikeStyle(el('text', { textAlign: 'justify' })).style.textAlignLast).toBe('justify')
    expect(textLikeStyle(el('longText', { textAlign: 'justify', verticalAlign: 'middle' })).style.textAlignLast).toBe('justify')
  })

  it('存量三档不输出 textAlignLast', () => {
    for (const textAlign of ['left', 'center', 'right'] as const) {
      expect(textLikeStyle(el('text', { textAlign, verticalAlign: 'middle' })).style.textAlignLast).toBeUndefined()
    }
  })
})

describe('imageStyle 与画布/出纸同源', () => {
  it('fit 与 objectPosition 都被消费', () => {
    const s = imageStyle(el('image', { src: 'a', fit: 'cover', objectPosition: 'center 20%' }))
    expect(s.objectFit).toBe('cover')
    expect(s.objectPosition).toBe('center 20%')
  })

  it('缺省 fit=contain 且不输出锚点', () => {
    const s = imageStyle(el('image', { src: 'a' }))
    expect(s.objectFit).toBe('contain')
    expect(s.objectPosition).toBeUndefined()
  })
})

describe('表格单元格两端对齐（与 canvas/core 同策）', () => {
  function mountCell(align?: string) {
    const store = new DesignerStore()
    store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
    const el = store.elements[0]!
    el.options.tableColWidths = [60]
    el.options.tableRows = [{
      id: 'r1', type: 'data', height: 8,
      cells: [{ id: 'c1', formatter: '收货人张先生', ...(align ? { align: align as never } : {}) }],
    } as never]
    store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2: 0 })
    const state: ShellState = {
      leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
      openDd: null, collapsedGroups: new Set(), renamingPage: null,
    }
    const ctx: ShellCtx = {
      store, format: new FormatToolbar(store), state, repaint: () => {}, fire: () => {},
      showHelp: true, isEdit: false, host: {},
    }
    const panel = document.createElement('div')
    render(tableCellGroup(ctx, el), panel)
    const canvas = document.createElement('div')
    render(renderTable(el, store, () => {}), canvas)
    return { panel, td: canvas.querySelector('td') as HTMLTableCellElement, cell: el.options.tableRows![0].cells[0] }
  }

  it('属性台水平对齐给出 左/中/右/两端 四档，选「两端」写入 justify', () => {
    const { panel, cell } = mountCell()
    const inputs = Array.from(panel.querySelectorAll<HTMLInputElement>('input[name="cell-align"]'))
    expect(inputs.map(i => i.value)).toEqual(['left', 'center', 'right', 'justify'])
    expect(inputs.map(i => i.parentElement?.textContent?.trim())).toEqual(['左', '中', '右', '两端'])
    const justify = inputs[3]!
    justify.checked = true
    justify.dispatchEvent(new Event('change'))
    expect(cell.align).toBe('justify')
  })

  it('渲染出的 td 带 textAlignLast=justify；存量档位不带', () => {
    expect(mountCell('justify').td.style.textAlignLast).toBe('justify')
    expect(mountCell('center').td.style.textAlignLast).toBe('')
  })
})
