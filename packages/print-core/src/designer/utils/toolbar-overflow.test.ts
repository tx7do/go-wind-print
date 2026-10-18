import { describe, it, expect } from 'vitest'
import { resolveToolbarOverflow } from './toolbar-overflow.js'
import type { OverflowUnitInput } from './toolbar-overflow.js'

/** 收纳链优先级：数字小 = 先被收进「更多」 */
function units(spec: Array<[string, number, number?]>): OverflowUnitInput[] {
  return spec.map(([id, order, width]) => ({ id, order, width: width ?? 100 }))
}

describe('resolveToolbarOverflow 宽度充裕时不收纳', () => {
  it('可用宽足以容纳全部单元时收纳列表为空', () => {
    const r = resolveToolbarOverflow({
      available: 1000,
      pinned: 200,
      moreTriggerWidth: 60,
      units: units([['clipboard', 1], ['painter', 2], ['zoom', 3]]),
    })
    expect(r.movedIds).toEqual([])
    expect(r.overflowRemains).toBe(false)
  })

  it('内联总宽恰好等于可用宽视为放得下（不触发收纳）', () => {
    // pinned 200 + 3 单元各 100 + 单元间 gap 2px×3 = 506
    const r = resolveToolbarOverflow({
      available: 506,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 2,
      units: units([['clipboard', 1], ['painter', 2], ['zoom', 3]]),
    })
    expect(r.movedIds).toEqual([])
  })
})

describe('resolveToolbarOverflow 按优先级链逐个收纳', () => {
  it('空间不足时先收优先级最高的单元（order 小者先收）', () => {
    const r = resolveToolbarOverflow({
      available: 600,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 2,
      units: units([['clipboard', 1], ['painter', 2], ['zoom', 3], ['arrange', 4]]),
    })
    expect(r.movedIds).toEqual(['clipboard'])
    expect(r.overflowRemains).toBe(false)
  })

  it('继续变窄时按链顺序追加收纳，不乱序', () => {
    const r = resolveToolbarOverflow({
      available: 380,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 2,
      units: units([['clipboard', 1], ['painter', 2], ['zoom', 3], ['arrange', 4]]),
    })
    expect(r.movedIds).toEqual(['clipboard', 'painter', 'zoom'])
  })

  it('收纳后需为「更多」触发钮自身留宽，否则继续收下一个', () => {
    // available 430：收 1 个 200+300+60=560 仍超，收 2 个 200+200+60=460 仍超，
    // 收 3 个 200+100+60=360 才成立。若漏算「更多」触发钮的 60px，收 2 个即“放下”，
    // 收纳数会少一个 —— 本用例正是用来钉住这条留宽规则的。
    const r = resolveToolbarOverflow({
      available: 430,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 0,
      units: units([['clipboard', 1], ['painter', 2], ['zoom', 3], ['arrange', 4]]),
    })
    expect(r.movedIds).toEqual(['clipboard', 'painter', 'zoom'])
  })

  it('收纳顺序由 order 决定，与数组传入顺序无关', () => {
    const r = resolveToolbarOverflow({
      available: 380,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 2,
      units: units([['arrange', 4], ['zoom', 3], ['painter', 2], ['clipboard', 1]]),
    })
    expect(r.movedIds).toEqual(['clipboard', 'painter', 'zoom'])
  })
})

describe('resolveToolbarOverflow 布局未就绪时保守不收纳', () => {
  it('存在未上报宽度（width<=0）的内联单元时整体不收纳', () => {
    const r = resolveToolbarOverflow({
      available: 100,
      pinned: 200,
      moreTriggerWidth: 60,
      units: [
        { id: 'clipboard', order: 1, width: 0 },
        { id: 'painter', order: 2, width: 100 },
      ],
    })
    expect(r.movedIds).toEqual([])
    expect(r.overflowRemains).toBe(false)
  })

  it('可用宽未上报（<=0）时整体不收纳', () => {
    const r = resolveToolbarOverflow({
      available: 0,
      pinned: 200,
      moreTriggerWidth: 60,
      units: units([['clipboard', 1], ['painter', 2]]),
    })
    expect(r.movedIds).toEqual([])
  })
})

describe('resolveToolbarOverflow 全部收完仍放不下', () => {
  it('收纳全部候选后标记 overflowRemains，供样式兜底', () => {
    const r = resolveToolbarOverflow({
      available: 210,
      pinned: 200,
      moreTriggerWidth: 60,
      gap: 0,
      units: units([['clipboard', 1], ['painter', 2]]),
    })
    expect(r.movedIds).toEqual(['clipboard', 'painter'])
    expect(r.overflowRemains).toBe(true)
  })

  it('无候选单元但仍放不下时仍标记 overflowRemains（样式兜底与有无收纳项无关）', () => {
    const r = resolveToolbarOverflow({
      available: 50,
      pinned: 200,
      moreTriggerWidth: 60,
      units: [],
    })
    expect(r.movedIds).toEqual([])
    expect(r.overflowRemains).toBe(true)
  })
})
