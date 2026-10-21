// print-core/src/render/__tests__/crop-style.test.ts
// 剪裁取位与放大的声明单点：画布、预览、出纸三端都从这里取，谁都不再自己拼 CSS。
// 判据要点：只有「剪裁」（cover）消费放大比例；放大用 transform:scale，且 transform-origin
// 必须与 object-position 同一个值——锚点是画面的钉住点，也是放大的不动点，两者错位就会跑偏。
import { describe, it, expect } from 'vitest'
import { sanitizeObjectPosition, cropScalePct, cropStyleDeclarations, CROP_SCALE_MAX } from '../crop-style.js'

describe('sanitizeObjectPosition 锚点值净化', () => {
  it('合法两值/关键字原样给出，首尾空白去掉', () => {
    expect(sanitizeObjectPosition('50% 0%')).toBe('50% 0%')
    expect(sanitizeObjectPosition('  top left ')).toBe('top left')
  })
  it('非法字符与超长整条丢弃，缺省给空串', () => {
    expect(sanitizeObjectPosition('50%;color:red')).toBe('')
    expect(sanitizeObjectPosition('url(a.png)')).toBe('')
    expect(sanitizeObjectPosition('x'.repeat(65))).toBe('')
    expect(sanitizeObjectPosition(undefined)).toBe('')
  })
})

describe('cropScalePct 放大比例归一', () => {
  it('只有剪裁档消费，其余档一律不放大', () => {
    expect(cropScalePct('cover', 135)).toBe(135)
    for (const fit of [undefined, 'contain', 'fill', 'none', 'scale-down']) {
      expect(cropScalePct(fit, 135)).toBeUndefined()
    }
  })
  it('100 即现状，不给声明；非法值同样按不放大处理', () => {
    for (const scale of [undefined, 100, 99, 0, -50, NaN, Infinity]) {
      expect(cropScalePct('cover', scale)).toBeUndefined()
    }
  })
  it('超出上限收到上限，小数取整', () => {
    expect(cropScalePct('cover', CROP_SCALE_MAX + 100)).toBe(CROP_SCALE_MAX)
    expect(cropScalePct('cover', 137.4)).toBe(137)
  })
})

describe('cropStyleDeclarations 三端共用声明', () => {
  it('剪裁 + 放大：transform 与 object-position 共用同一个锚点值', () => {
    expect(cropStyleDeclarations('cover', 135, '50% 0%')).toEqual({
      objectPosition: '50% 0%',
      transform: 'scale(1.35)',
      transformOrigin: '50% 0%',
    })
  })
  it('放大但没写锚点：钉住点按缺省居中，两边口径一致', () => {
    expect(cropStyleDeclarations('cover', 400, undefined)).toEqual({
      transform: 'scale(4)',
      transformOrigin: '50% 50%',
    })
  })
  it('锚点非法：整条取位丢弃，放大仍按缺省居中放大（与净化前的存量模板同形）', () => {
    expect(cropStyleDeclarations('cover', 135, '50%;color:red')).toEqual({
      transform: 'scale(1.35)',
      transformOrigin: '50% 50%',
    })
  })
  it('非剪裁档或 100：只保留取位，不出 transform', () => {
    expect(cropStyleDeclarations('contain', 135, '50% 0%')).toEqual({ objectPosition: '50% 0%' })
    expect(cropStyleDeclarations('cover', 100, '50% 0%')).toEqual({ objectPosition: '50% 0%' })
    expect(cropStyleDeclarations('contain', undefined, undefined)).toEqual({})
  })
})
