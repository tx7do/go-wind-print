import { describe, it, expect } from 'vitest'
import {
  applyElementBorderPreset, resolveElementBorderSpec, setElementBorderEdge,
  resolveBorderEdgeStates, resolveElementBorderDisplay, elementBorderEdgeVisible, elementVisibleBorders,
  setElementBorderEdgeVisible, setElementBorderField, BORDER_LINE_STYLES, ELEMENT_BORDER_FALLBACK_WIDTH,
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

describe('setElementBorderEdge：分边原语只写那一条（可见态另判据见下）', () => {
  it('写入一边不影响其余边与整圈三字段', () => {
    const o = opts({ borderWidth: 1, borders: { top: { width: 1, style: 'solid', color: '#000' } } })
    setElementBorderEdge(o, 'right', spec)
    expect(o.borders!.top).toEqual({ width: 1, style: 'solid', color: '#000' })
    expect(o.borders!.right).toEqual({ width: 2, style: 'dashed', color: '#ff0000' })
    expect(o.borderWidth).toBe(1)
  })

  it('撤掉一边只删那一条，其他边留着', () => {
    const o = opts({ borderWidth: 0, borders: { top: { width: 1 }, bottom: { width: 1 } } })
    setElementBorderEdge(o, 'top', null)
    expect(o.borders!.top).toBeUndefined()
    expect(o.borders!.bottom).toBeTruthy()
    expect(elementBorderEdgeVisible(o, 'top')).toBe(false)
    expect(elementBorderEdgeVisible(o, 'bottom')).toBe(true)
  })
})

describe('resolveBorderEdgeStates：四边激活态由目标集合派生（属性台与工具栏同一口径）', () => {
  it('单个目标四边都有 ⇒ 全 on；一边都没有 ⇒ 全 off', () => {
    const all = { top: { width: 1 }, right: { width: 1 }, bottom: { width: 1 }, left: { width: 1 } }
    expect(resolveBorderEdgeStates([all])).toEqual({ top: 'on', right: 'on', bottom: 'on', left: 'on' })
    expect(resolveBorderEdgeStates([{}])).toEqual({ top: 'off', right: 'off', bottom: 'off', left: 'off' })
  })

  it('只有上边 ⇒ 上 on、其余 off（属性台勾选框要能反映这一状态）', () => {
    expect(resolveBorderEdgeStates([{ top: { width: 1 } }]))
      .toEqual({ top: 'on', right: 'off', bottom: 'off', left: 'off' })
  })

  it('多目标部分有该边 ⇒ mixed；borders 缺省(undefined) 也算一个"无框目标"', () => {
    const withGhost = [{ top: { width: 1 }, left: { width: 1 } }, { left: { width: 1 } }, undefined]
    expect(resolveBorderEdgeStates(withGhost))
      .toEqual({ top: 'mixed', right: 'off', bottom: 'off', left: 'mixed' })
    // 去掉那个 undefined（选区里全是真实格）：两边都在 ⇒ on
    expect(resolveBorderEdgeStates(withGhost.slice(0, 2)).left).toBe('on')
  })

  it('空集合不抛错，四边给 off', () => {
    expect(resolveBorderEdgeStates([])).toEqual({ top: 'off', right: 'off', bottom: 'off', left: 'off' })
  })
})

describe('resolveElementBorderDisplay：属性台三行显示当前生效规格（方案 B）', () => {
  it('整圈已声明 ⇒ 取整圈三值；宽度 0 也照实显示（那是"明确无边框"，不是未设）', () => {
    expect(resolveElementBorderDisplay(opts({ borderWidth: 2, borderStyle: 'dotted', borderColor: '#123456' })))
      .toEqual({ width: 2, style: 'dotted', color: '#123456' })
    expect(resolveElementBorderDisplay(opts({ borderWidth: 0 })).width).toBe(0)
    expect(resolveElementBorderDisplay(opts({ borderWidth: 1 })).style, '线型未设按出纸兜底档显示实线').toBe('solid')
  })

  it('整圈未设、分边同规格 ⇒ 回显分边规格（此前三行是空的，正是"边框没回写"）', () => {
    const o = opts({ borders: { right: { width: 1.5, style: 'dashed', color: '#abcdef' } } })
    expect(resolveElementBorderDisplay(o)).toEqual({ width: 1.5, style: 'dashed', color: '#abcdef' })
  })

  it('分边各不一样 ⇒ 三值各自 mixed；分边没写线型按实线归一后再比', () => {
    expect(resolveElementBorderDisplay(opts({
      borders: { top: { width: 1, color: '#000000' }, right: { width: 2, color: '#ffffff' } },
    }))).toEqual({ width: 'mixed', style: 'solid', color: 'mixed' })
  })

  it('一条线都没有 ⇒ 宽度留空、线型报「无」（不再假装是实线）', () => {
    expect(resolveElementBorderDisplay(opts())).toEqual({ width: undefined, style: 'none', color: undefined })
    expect(resolveElementBorderDisplay(opts({ borders: {} }))).toEqual({ width: undefined, style: 'none', color: undefined })
  })

  it('没有任何可见边框就报「无」，哪怕 borderStyle 里记着别的档（线型＝无是"有没有框"的开关）', () => {
    expect(resolveElementBorderDisplay(opts({ borderStyle: 'dashed' })).style).toBe('none')
  })
})

describe('elementBorderEdgeVisible / setElementBorderEdgeVisible：勾选框看"这条边到底有没有线"', () => {
  it('整圈宽度 >0 ⇒ 四边都可见；整圈 0 或未设 ⇒ 只有写了分边的边可见', () => {
    const allOn = opts({ borderWidth: 1 })
    for (const s of ['top', 'right', 'bottom', 'left'] as const) expect(elementBorderEdgeVisible(allOn, s), s).toBe(true)
    expect(Object.keys(elementVisibleBorders(allOn))).toEqual(['top', 'right', 'bottom', 'left'])
    const none = opts({ borderWidth: 0, borders: { left: { width: 2 } } })
    expect([elementBorderEdgeVisible(none, 'top'), elementBorderEdgeVisible(none, 'left')]).toEqual([false, true])
  })

  it('整圈生效时撤一条边：其余三边展开成分边、整圈宽度归零（面板与出纸同时跟上）', () => {
    const o = opts({ borderWidth: 2, borderStyle: 'dashed', borderColor: '#123456' })
    setElementBorderEdgeVisible(o, 'top', false)
    expect(o.borderWidth).toBe(0)
    expect(o.borders!.top).toBeUndefined()
    expect(['right', 'bottom', 'left'].map(s => o.borders![s])).toEqual([
      { width: 2, style: 'dashed', color: '#123456' },
      { width: 2, style: 'dashed', color: '#123456' },
      { width: 2, style: 'dashed', color: '#123456' },
    ])
    expect(elementBorderEdgeVisible(o, 'top'), '上边确实没线了').toBe(false)
    expect(elementBorderEdgeVisible(o, 'right'), '右边仍有线').toBe(true)
  })

  it('展开时保留各边自己的规格与整圈原值，不拿显示兜底档去抹平（未设的颜色仍是未设）', () => {
    const o = opts({ borderWidth: 2, borders: { bottom: { width: 4, style: 'dotted', color: '#00ff00' } } })
    setElementBorderEdgeVisible(o, 'top', false)
    expect(o.borders!.bottom).toEqual({ width: 4, style: 'dotted', color: '#00ff00' })
    expect(o.borders!.right).toEqual({ width: 2 })
  })

  it('勾回一条边取"当前生效规格"（整圈不生效时看已有分边），且已是可见态再点不产生任何写入', () => {
    const o = opts({ borderWidth: 0, borders: { right: { width: 1, style: 'solid', color: '#333333' } } })
    setElementBorderEdgeVisible(o, 'left', true)
    expect(o.borders!.left).toEqual({ width: 1, style: 'solid', color: '#333333' })
    expect(o.borderWidth, '勾单边不动整圈三字段').toBe(0)
    const snapshot = JSON.parse(JSON.stringify(o))
    setElementBorderEdgeVisible(o, 'left', true)
    expect(JSON.parse(JSON.stringify(o))).toEqual(snapshot)
  })
})

describe('setElementBorderField：改整圈任一行（方案 B 的落盘）', () => {
  it('元素已有可见边框 ⇒ 新规格整圈化并清掉分边覆盖（= 铺满四边）', () => {
    const o = opts({ borderWidth: 1, borderStyle: 'solid', borderColor: '#333333', borders: { top: { width: 1 } } })
    setElementBorderField(o, 'borderWidth', 3)
    expect([o.borderWidth, o.borderStyle, o.borderColor]).toEqual([3, 'solid', '#333333'])
    expect(o.borders).toBeUndefined()
  })

  it('无边框元素选一个线型＝开一条框（缺省宽度 0.75），否则选了等于没反应', () => {
    const o = opts()
    setElementBorderField(o, 'borderStyle', 'dashed')
    expect([o.borderWidth, o.borderStyle, o.borderColor, o.borders]).toEqual([0.75, 'dashed', undefined, undefined])
    expect(resolveElementBorderDisplay(o)).toEqual({ width: 0.75, style: 'dashed', color: undefined })
  })

  it('把宽度改成 0 是"消框"，不能被兜底档顶回 0.75', () => {
    const o = opts({ borderWidth: 2, borders: { top: { width: 2 } } })
    setElementBorderField(o, 'borderWidth', 0)
    expect(o.borderWidth).toBe(0)
    expect(o.borders).toBeUndefined()
  })

  it('无边框元素改宽度：只落这一键，线型沿用现值、颜色留未设（不替作者发明一个色值）', () => {
    const o = opts({ borderStyle: 'dotted' })
    setElementBorderField(o, 'borderWidth', 2)
    expect([o.borderWidth, o.borderStyle, o.borderColor]).toEqual([2, 'dotted', undefined])
    expect(resolveElementBorderDisplay(o)).toEqual({ width: 2, style: 'dotted', color: undefined })
  })
})

describe('线型「无」：选项单点 + 选它即无边框', () => {
  it('线型选项是 core 单点：无打头，其余四档与出纸档位一致', () => {
    expect(BORDER_LINE_STYLES.map(o => o.value)).toEqual(['none', 'solid', 'dashed', 'dotted', 'double'])
    expect(BORDER_LINE_STYLES[0]?.label).toBe('无')
  })

  it('已有边框时选「无」＝清边框：宽度归零、分边清空、线型记成 none', () => {
    const o = opts({ borderWidth: 2, borderStyle: 'dashed', borderColor: '#123456', borders: { top: { width: 2 } } })
    setElementBorderField(o, 'borderStyle', 'none')
    expect(o.borderWidth).toBe(0)
    expect(o.borders).toBeUndefined()
    expect(o.borderStyle).toBe('none')
    expect(resolveElementBorderDisplay(o).style, '面板立刻显示无').toBe('none')
  })

  it('只有整圈边框、没有任何分边时选「无」也要把宽度归零（写完 none 再判可见会漏）', () => {
    const o = opts({ borderWidth: 2, borderStyle: 'solid', borderColor: '#123456' })
    setElementBorderField(o, 'borderStyle', 'none')
    expect(o.borderWidth).toBe(0)
    expect(o.borders).toBeUndefined()
    expect(resolveElementBorderDisplay(o)).toEqual({ width: 0, style: 'none', color: '#123456' })
  })

  it('本来就没边框时选「无」只记线型，不凭空写宽度 0', () => {
    const o = opts()
    setElementBorderField(o, 'borderStyle', 'none')
    expect(o.borderStyle).toBe('none')
    expect(o.borderWidth).toBeUndefined()
  })

  it('线型为 none 时即使有宽度也不出线（面板与出纸同口径）', () => {
    const o = opts({ borderWidth: 2, borderStyle: 'none' })
    expect(resolveElementBorderDisplay(o)).toEqual({ width: 2, style: 'none', color: undefined })
    expect(elementBorderEdgeVisible(o, 'top'), '线型无 ⇒ 四边都不算有线').toBe(false)
  })
})
