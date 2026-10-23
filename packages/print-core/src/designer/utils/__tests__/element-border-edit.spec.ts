import { describe, it, expect } from 'vitest'
import {
  applyElementBorderPreset, elementBorderEdgeOn, resolveElementBorderSpec, setElementBorderEdge,
  ELEMENT_BORDER_FALLBACK_WIDTH,
} from '../element-border-edit.js'
import type { ElementOptions } from '../../types.js'

const spec = { width: 2, style: 'dashed', color: '#ff0000' }
const opts = (over: Partial<ElementOptions> = {}): ElementOptions => ({
  left: 0, top: 0, width: 10, height: 10, ...over,
} as ElementOptions)

describe('resolveElementBorderSpec：属性台用元素现值当规格', () => {
  it('三项都有值时逐字取现值', () => {
    expect(resolveElementBorderSpec(opts({ borderWidth: 1.5, borderStyle: 'dotted', borderColor: '#123456' })))
      .toEqual({ width: 1.5, style: 'dotted', color: '#123456' })
  })

  it('宽度 ≤0／NaN／未设一律兜到缺省档，点预设才不会空转', () => {
    for (const w of [0, -1, Number.NaN, undefined]) {
      expect(resolveElementBorderSpec(opts(w === undefined ? {} : { borderWidth: w })).width)
        .toBe(ELEMENT_BORDER_FALLBACK_WIDTH)
    }
  })

  it('线型与颜色未设时兜实线深灰，与工具栏草稿缺省同值', () => {
    expect(resolveElementBorderSpec(opts())).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
  })
})

describe('applyElementBorderPreset：元素只有一圈边', () => {
  it('all 写整圈三字段并清掉分边残留', () => {
    const o = opts({ borders: { top: { width: 1 } } })
    applyElementBorderPreset(o, 'all', spec)
    expect([o.borderWidth, o.borderStyle, o.borderColor]).toEqual([2, 'dashed', '#ff0000'])
    expect(o.borders).toBeUndefined()
  })

  it('outer 与 all 同效（沿用工具栏既有口径）', () => {
    const a = opts()
    const b = opts()
    applyElementBorderPreset(a, 'all', spec)
    applyElementBorderPreset(b, 'outer', spec)
    expect(b).toEqual(a)
  })

  it('none 只把宽度归零：线型与颜色留着，改回宽度即恢复原样', () => {
    const o = opts({ borderWidth: 2, borderStyle: 'dotted', borderColor: '#0000ff', borders: { left: { width: 1 } } })
    applyElementBorderPreset(o, 'none', spec)
    expect(o.borderWidth).toBe(0)
    expect(o.borderStyle).toBe('dotted')
    expect(o.borderColor).toBe('#0000ff')
    expect(o.borders).toBeUndefined()
  })

  it('inner 对元素不改任何东西', () => {
    const before = opts({ borderWidth: 2, borders: { top: { width: 1, style: 'solid', color: '#000' } } })
    const snapshot = JSON.parse(JSON.stringify(before))
    applyElementBorderPreset(before, 'inner', spec)
    expect(JSON.parse(JSON.stringify(before))).toEqual(snapshot)
  })
})

describe('setElementBorderEdge / elementBorderEdgeOn：单条边独立开关', () => {
  it('写入一边不影响其余边与整圈三字段', () => {
    const o = opts({ borderWidth: 1, borders: { top: { width: 1, style: 'solid', color: '#000' } } })
    setElementBorderEdge(o, 'right', spec)
    expect(o.borders!.top).toEqual({ width: 1, style: 'solid', color: '#000' })
    expect(o.borders!.right).toEqual({ width: 2, style: 'dashed', color: '#ff0000' })
    expect(o.borderWidth).toBe(1)
    expect(elementBorderEdgeOn(o, 'right')).toBe(true)
    expect(elementBorderEdgeOn(o, 'bottom')).toBe(false)
  })

  it('撤掉一边只删那一条，其他边留着', () => {
    const o = opts({ borders: { top: { width: 1 }, bottom: { width: 1 } } })
    setElementBorderEdge(o, 'top', null)
    expect(o.borders!.top).toBeUndefined()
    expect(o.borders!.bottom).toBeTruthy()
    expect(elementBorderEdgeOn(o, 'top')).toBe(false)
  })
})
