// 新建元素的默认字体：全部落在黑体上，且可被显式值覆盖或被清空。
// 背景：兜底栈头部的微软雅黑/苹方是屏幕优化字体，203dpi 热敏出纸笔画发虚（见 print/fonts.ts）。
import { describe, it, expect } from 'vitest'
import { DEFAULT_PRINT_FONT_FAMILY } from '../../../print/fonts.js'
import { createDefaultOptions, createRuntimeElement } from '../element-factory.js'
import type { ElementType } from '../../types.js'

const ALL_TYPES: ElementType[] = [
  'text', 'longText', 'table', 'image', 'hline', 'vline', 'rect', 'oval',
  'barcode', 'qrcode', 'html', 'pageNumber',
]

describe('createDefaultOptions 默认字体', () => {
  it('每种新元素都带黑体默认族名', () => {
    for (const type of ALL_TYPES) {
      expect(createDefaultOptions(type).fontFamily, type).toBe(DEFAULT_PRINT_FONT_FAMILY)
    }
  })

  it('表格额外带单元格继承基线 tableDefaultFontFamily', () => {
    expect(createDefaultOptions('table').tableDefaultFontFamily).toBe(DEFAULT_PRINT_FONT_FAMILY)
    // 其余类型不该出现这个字段（避免把表格专属配置写满所有元素）
    expect(createDefaultOptions('text').tableDefaultFontFamily).toBeUndefined()
  })

  it('既有几何默认值零变化', () => {
    expect(createDefaultOptions('text')).toMatchObject({
      left: 7, top: 17.6, width: 42.3, height: 5.3, fontSize: 12, formatter: '文本',
    })
  })
})

describe('createRuntimeElement 覆盖语义', () => {
  it('显式族名覆盖默认黑体', () => {
    const el = createRuntimeElement('text', { fontFamily: 'SimSun' })
    expect(el.options.fontFamily).toBe('SimSun')
  })

  it('面板清成「默认」时显式 undefined 生效，交还 CSS 继承', () => {
    const el = createRuntimeElement('text', { fontFamily: undefined })
    expect('fontFamily' in el.options).toBe(true)
    expect(el.options.fontFamily).toBeUndefined()
  })
})
