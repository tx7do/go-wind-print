// print-core/src/render/__tests__/reset-default-parity.test.ts
// 「恢复默认值」落纸契约：把属性恢复到该元素类型的出厂值之后，落纸必须与全新建出来
// 的出厂模板逐字节相同。
//
// 每条正向断言都必须配一条反面对照（不恢复时落纸要不同），否则正向会假绿。
// 实测三类属性在 generateHtml 这一层没有鉴别力，已按层拆开，不假装覆盖：
//   · barcode / qrcode —— html-generator 在无 codeRenderer 时直接走 fallback
//     （见 html-generator.ts 的 codeImgHtml：`if (!value || !io.codeRenderer) return io.fallback`），
//     条宽/静区/条高/纠错级别根本不进 HTML。它们的落纸一致性由 render 服务回归与浏览器实看覆盖。
//   · table —— 无数据上下文时表格不出 <td>，matrixCellStyle 的表级默认字号/颜色/内边距不进 HTML。
//     这里改为断言"恢复动作产出的 options 等于出厂 options"，落纸一致性同样交上层验。
import { describe, it, expect } from 'vitest'
import { generateHtml } from '../html-generator.js'
import { createDefaultOptions } from '../../designer/utils/element-factory.js'
import { barcodeQuietZoneModules, BARCODE_QUIET_ZONE_MODULES } from '../barcode-dot.js'
import type { ElementType, PageLayout, TemplateData } from '../types.js'

function renderOne(type: ElementType, options: Record<string, any>): string {
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{ id: 'el-1', type, options: { left: 0, top: 0, width: 60, height: 20, ...options } } as any],
  }
  const layouts: PageLayout[] = [{ pageIndex: 0, sections: [{ elementId: 'el-1', type: 'element' }] }]
  return generateHtml(template, layouts, {})
}

/** 复刻 ResetButton 的写回动作：dirty 里每个键都恢复成该类型的出厂值（含恢复成 undefined） */
function restoredOptions(type: ElementType, dirty: Record<string, any>): Record<string, any> {
  const factory = createDefaultOptions(type) as Record<string, any>
  const out: Record<string, any> = { ...factory, ...dirty }
  for (const key of Object.keys(dirty)) out[key] = factory[key]
  return out
}

/** generateHtml 真正消费这些键的元素类型 */
const HTML_CASES: Array<[ElementType, Record<string, any>]> = [
  ['text', { fontSize: 18, lineHeight: 2, letterSpacing: 1, textAlign: 'center', color: '#ff0000' }],
  ['longText', { lineHeight: 30, longTextIndent: 2, fontSize: 20 }],
  ['image', { fit: 'cover', fitScale: 250, objectPosition: '30% 70%' }],
  ['rect', { borderWidth: 3, borderColor: '#00ff00' }],
  ['hline', { borderWidth: 2, borderColor: '#0000ff' }],
]

describe('落纸一致性（generateHtml 层，带反面对照）', () => {
  for (const [type, dirty] of HTML_CASES) {
    it(`${type}：恢复到出厂值后与出厂模板逐字节相同`, () => {
      expect(renderOne(type, restoredOptions(type, dirty))).toBe(renderOne(type, createDefaultOptions(type) as any))
    })
    it(`${type}：反面对照——不恢复时落纸必须不同（证明上一条有鉴别力）`, () => {
      const factory = createDefaultOptions(type) as Record<string, any>
      expect(renderOne(type, { ...factory, ...dirty })).not.toBe(renderOne(type, factory))
    })
  }
})

describe('恢复动作本身（options 层）——覆盖 generateHtml 看不见的三类', () => {
  it('barcode：条宽/静区/条高/文本字号全部恢复成出厂的"未设"', () => {
    const out = restoredOptions('barcode', { barWidth: 4, barQuietZone: 0, barHeight: 60, fontSize: 20 })
    const factory = createDefaultOptions('barcode') as Record<string, any>
    expect(out.barWidth).toBe(factory.barWidth)
    expect(out.barQuietZone).toBeUndefined()
    expect(out.barHeight).toBeUndefined()
  })

  it('barcode 结算层：静区恢复后与出厂算得同一模块数，脏值 0 则不同', () => {
    const dirty = barcodeQuietZoneModules(0)
    const out = restoredOptions('barcode', { barQuietZone: 0 })
    expect(barcodeQuietZoneModules(out.barQuietZone)).toBe(BARCODE_QUIET_ZONE_MODULES)
    expect(barcodeQuietZoneModules(out.barQuietZone)).not.toBe(dirty)
  })

  it('qrcode：静区与纠错级别恢复成出厂的"未设"', () => {
    const out = restoredOptions('qrcode', { qrQuietZone: 4, qrCodeLevel: 'H' })
    expect(out.qrQuietZone).toBeUndefined()
    expect(out.qrCodeLevel).toBeUndefined()
  })

  it('table：表级默认字号/颜色/内边距恢复成 factory 的字面值而非 undefined', () => {
    const out = restoredOptions('table', { tableDefaultFontSize: 14, tableDefaultColor: '#ff0000', tableDefaultPadding: 3 })
    expect(out.tableDefaultFontSize).toBe(10)
    expect(out.tableDefaultColor).toBe('#333333')
    expect(out.tableDefaultPadding).toBe(1)
    // 反面对照：恢复前确实带着脏值
    const factory = createDefaultOptions('table') as Record<string, any>
    expect({ ...factory, tableDefaultFontSize: 14 }.tableDefaultFontSize).not.toBe(factory.tableDefaultFontSize)
  })
})

describe('出厂值即重置落点（element-factory 升格为契约真源的钉桩）', () => {
  it('这些键被「恢复默认值」直接引用，改它们等于改重置落点，必须同步设计说明', () => {
    expect(createDefaultOptions('text')).toMatchObject({ fontSize: 12, textAlign: 'left' })
    expect(createDefaultOptions('longText')).toMatchObject({ fontSize: 12, lineHeight: 18 })
    expect(createDefaultOptions('image')).toMatchObject({ fit: 'contain' })
    expect(createDefaultOptions('table')).toMatchObject({
      tableDefaultFontSize: 10, tableDefaultColor: '#333333', tableDefaultPadding: 1,
    })
    expect(createDefaultOptions('rect')).toMatchObject({ borderWidth: 1, borderColor: '#333' })
    expect(createDefaultOptions('hline')).toMatchObject({ borderWidth: 0.75 })
  })

  /** 刻意不断言 fontFamily：该键正被一份在途改动改写（HEAD 给黑体、在途版本删掉）。
   *  派生规则对两种基线都成立，钉住它只会造成无关红灯。见设计说明第九节第 9 条。 */
})
