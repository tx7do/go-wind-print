// @vitest-environment happy-dom
// 外壳画布的单元格字体口径：与出图端（core 的 matrixCellStyle）同序——
// 单元格自身 → 表格默认字体 → 交还 CSS 继承，且族名必须带全局兜底栈。
import { describe, it, expect } from 'vitest'
import type { TableRow } from '@worm-vue3-print/core/designer'
import { DEFAULT_PRINT_FONT_FAMILY } from '@worm-vue3-print/core'
import { DesignerStore } from '../../core/store'
import { h, render } from '../../core/h'
import { renderTable } from '../table'

function paintRow(cellOverrides: Record<string, unknown>, tableOverrides: Record<string, unknown>): string {
  const rows: TableRow[] = [{
    id: 'r1', type: 'header', height: 8,
    cells: [{ id: 'c1', formatter: '文本', ...cellOverrides } as never],
  }]
  const store = new DesignerStore()
  store.addElement('table', {
    left: 10, top: 10, width: 50, height: 8,
    tableColWidths: [50], tableRows: rows, ...tableOverrides,
  } as never)
  const el = store.elements.find(e => e.printElementType.type === 'table')!
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(h('div', { class: 'print-element' }, [renderTable(el, store, () => {})]), host)
  return (host.querySelector('td')?.getAttribute('style') ?? '').replace(/\s/g, '')
}

describe('外壳单元格字体', () => {
  it('新建表格自带黑体默认字体，单元格继承并补兜底栈', () => {
    const style = paintRow({}, {})
    expect(style).toContain(`font-family:${DEFAULT_PRINT_FONT_FAMILY},"MicrosoftYaHei"`)
  })

  it('单元格自己的字体优先于表格默认字体', () => {
    const style = paintRow({ fontFamily: 'SimSun' }, { tableDefaultFontFamily: 'KaiTi' })
    expect(style).toContain('font-family:SimSun,')
    expect(style).not.toContain('KaiTi')
  })

  it('两级都清空时交还 CSS 继承（与出图端「不输出 font-family」等价）', () => {
    expect(paintRow({ fontFamily: undefined }, { tableDefaultFontFamily: undefined }))
      .toContain('font-family:inherit')
  })
})
