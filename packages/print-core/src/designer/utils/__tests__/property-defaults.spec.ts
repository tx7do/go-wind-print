import { describe, it, expect } from 'vitest'
import { PROPERTY_REGISTRY, propertyDefault } from '../property-search.js'
import { BARCODE_BAR_HEIGHT_MODULES, BARCODE_QUIET_ZONE_MODULES, BARCODE_TEXT_FONT_SIZE_MODULES, QR_DEFAULT_QUIET_MODULES } from '../../../render/barcode-dot.js'
import { DEFAULT_SHRINK_MIN_FONT_SIZE_PT } from '../../../render/text-fit.js'
import { CROP_SCALE_MIN } from '../../../render/crop-style.js'

const items = PROPERTY_REGISTRY.flatMap(g => g.items)
const itemOf = (key: string) => items.find(i => i.key === key)

describe('注册表 default 字段：只能是渲染端常量的引用', () => {
  it('声明了 default 的六项，数值必须等于渲染端常量本身（防止抄字面量后漂移）', () => {
    expect(itemOf('cd-bar-quiet-zone')?.default).toBe(BARCODE_QUIET_ZONE_MODULES)
    expect(itemOf('cd-bar-height')?.default).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(itemOf('cd-font-size')?.default).toBe(BARCODE_TEXT_FONT_SIZE_MODULES)
    expect(itemOf('cd-quiet-zone')?.default).toBe(QR_DEFAULT_QUIET_MODULES)
    expect(itemOf('ap-shrink-min')?.default).toBe(DEFAULT_SHRINK_MIN_FONT_SIZE_PT)
    expect(itemOf('ap-img-fit-scale')?.default).toBe(CROP_SCALE_MIN)
  })

  it('defaultUnit 只依附于已声明 default 的项', () => {
    for (const it of items) {
      if (it.defaultUnit) expect(it.default, `仅带单位却无 default：${it.key}`).toBeDefined()
    }
  })

  it('首行缩进与自动换行不声明 default——渲染端没有具名常量，宁可提示不带数字', () => {
    expect(itemOf('ap-long-text-indent')?.default).toBeUndefined()
    expect(itemOf('ap-word-wrap')?.default).toBeUndefined()
  })
})

describe('propertyDefault 助手', () => {
  it('未声明的键返回 undefined，接入点据此退化为「恢复默认值」', () => {
    expect(propertyDefault('no-such-key')).toBeUndefined()
    expect(propertyDefault('ap-font-size')).toBeUndefined()
  })

  it('声明了的键返回 value 与 unit', () => {
    expect(propertyDefault('cd-bar-quiet-zone')).toEqual({ value: BARCODE_QUIET_ZONE_MODULES, unit: '模块' })
    expect(propertyDefault('ap-shrink-min')?.value).toBe(DEFAULT_SHRINK_MIN_FONT_SIZE_PT)
  })

  /** 二维码静区缺省是 0，而 0 是合法档：助手必须能把它与"未声明"区分开 */
  it('default 为 0 时不得被当成未声明', () => {
    expect(QR_DEFAULT_QUIET_MODULES).toBe(0)
    expect(propertyDefault('cd-quiet-zone')).toEqual({ value: 0, unit: '模块' })
  })
})
