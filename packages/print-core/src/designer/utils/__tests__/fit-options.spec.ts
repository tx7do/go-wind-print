// print-core/src/designer/utils/__tests__/fit-options.spec.ts
// 缩放模式档位表与说明文案的唯一来源：canvas 三处 + common 三处曾各抄一份，改名必漏。
import { describe, it, expect } from 'vitest'
import { IMAGE_FIT_OPTIONS } from '../crop-anchor.js'
import { propertyTip } from '../property-search.js'

describe('IMAGE_FIT_OPTIONS 单一档位表', () => {
  it('值仍是 CSS object-fit 五档且顺序不变（不动模板 JSON 契约）', () => {
    expect(IMAGE_FIT_OPTIONS.map(o => o.value)).toEqual(['contain', 'cover', 'fill', 'none', 'scale-down'])
  })
  it('cover 对用户叫「剪裁」，把裁剪锚点的入口语义带出来', () => {
    expect(IMAGE_FIT_OPTIONS.find(o => o.value === 'cover')?.label).toBe('剪裁（等比铺满后裁边）')
  })
  it('其余档名不动', () => {
    expect(IMAGE_FIT_OPTIONS.find(o => o.value === 'contain')?.label).toBe('包含（保持比例）')
    expect(IMAGE_FIT_OPTIONS.find(o => o.value === 'fill')?.label).toBe('拉伸填满')
  })
})

describe('外观组说明文案', () => {
  it('缩放模式说明改用「剪裁」口径', () => {
    const tip = propertyTip('ap-img-fit')
    expect(tip).toContain('剪裁')
    expect(tip).not.toContain('覆盖')
  })
  it('裁剪锚点说明不出现 CSS 属性名等口径，且写明只有剪裁档生效', () => {
    const tip = propertyTip('ap-img-object-position')
    expect(tip).not.toContain('object-position')
    expect(tip).toContain('剪裁')
  })
})
