// 重置落点契约：把「出厂值 ⇒ 重置动作」的分界钉在单一出口（createDefaultOptions）上。
// 两种相反的正确行为都由同一张表派生——表里写 `undefined` 的键，重置必须「删键」；
// 写了字面值的键，重置必须「写回该字面值」。任何一方漂移都会让这里变红。
import { describe, it, expect } from 'vitest'
import { createDefaultOptions } from '../element-factory'
import type { ElementType } from '../../types'

/** 纳入「恢复默认值」清单、且出厂值非空的键：重置写回字面值 */
const WRITE_BACK: Partial<Record<ElementType, Record<string, unknown>>> = {
  text: { fontSize: 12, textAlign: 'left' },
  longText: { fontSize: 12, lineHeight: 18 },
  image: { fit: 'contain' },
  rect: { borderWidth: 1, borderColor: '#333' },
  oval: { borderWidth: 1, borderColor: '#333' },
  hline: { borderWidth: 0.75 },
  vline: { borderWidth: 0.75 },
  table: { tableDefaultFontSize: 10, tableDefaultColor: '#333333', tableDefaultPadding: 1 },
}

/** 纳入清单、但出厂即「未设」的键：重置删键，让渲染端用自己的缺省 */
const DELETE_KEY: Partial<Record<ElementType, string[]>> = {
  text: ['fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing', 'verticalAlign', 'color', 'backgroundColor', 'wordWrap', 'textFit', 'shrinkMinFontSize', 'longTextIndent', 'borderWidth', 'borderColor', 'borderStyle'],
  image: ['fitScale', 'objectPosition', 'borderWidth', 'borderColor', 'backgroundColor'],
  hline: ['borderColor', 'backgroundColor', 'borderStyle'],
  table: ['tableDefaultFontFamily'],
  barcode: ['barWidth', 'barQuietZone', 'barHeight', 'barFontSize', 'printerDpi', 'showBarcodeText', 'backgroundColor'],
  qrcode: ['qrQuietZone', 'qrCodeLevel', 'backgroundColor'],
}

describe('出厂值即重置落点', () => {
  for (const [type, table] of Object.entries(WRITE_BACK) as [ElementType, Record<string, unknown>][]) {
    it(`${type}：出厂字面值的键，重置写回同一个值`, () => {
      const factory = createDefaultOptions(type) as Record<string, unknown>
      for (const [key, value] of Object.entries(table)) {
        expect(factory[key], `${type}.${key} 的出厂值变了`).toEqual(value)
      }
    })
  }

  for (const [type, keys] of Object.entries(DELETE_KEY) as [ElementType, string[]][]) {
    it(`${type}：未预置的键必须保持 undefined（重置语义为删键）`, () => {
      const factory = createDefaultOptions(type) as Record<string, unknown>
      for (const key of keys) {
        expect(factory[key], `${type}.${key} 不该有出厂值，否则重置会写回字面值`).toBeUndefined()
      }
    })
  }

  it('反面对照：文本的行高必须未设，长文本的行高必须是 18——同一判定式在两种类型上给出相反动作', () => {
    expect((createDefaultOptions('text') as Record<string, unknown>).lineHeight).toBeUndefined()
    expect((createDefaultOptions('longText') as Record<string, unknown>).lineHeight).toBe(18)
  })

  it('反面对照：表格级默认三项必须写回字面值（删键会改变出纸），而单元格出厂态不含它们', () => {
    const t = createDefaultOptions('table') as Record<string, unknown>
    expect([t.tableDefaultFontSize, t.tableDefaultColor, t.tableDefaultPadding]).toEqual([10, '#333333', 1])
    expect(t.tableDefaultFontFamily).toBeUndefined()
  })
})
