import { describe, it, expect } from 'vitest'
import { resolveOverlayPlacement } from './overlay-placement.js'
import type { OverlayPlacementInput } from './overlay-placement.js'

/** 造一份「触发框 + 可用区 + 浮层高」的输入，缺省用向下有 300px 富余的宽松形态 */
function input(over: Partial<OverlayPlacementInput>): OverlayPlacementInput {
  return {
    triggerTop: 100,
    triggerBottom: 126,
    overlayHeight: 200,
    boundaryTop: 0,
    boundaryBottom: 500,
    ...over,
  }
}

describe('resolveOverlayPlacement 下方够用', () => {
  it('下方空间容得下浮层时向下', () => {
    expect(resolveOverlayPlacement(input({}))).toBe('down')
  })

  it('下方刚好等于浮层高（含缺省 4px 间隙）时仍向下', () => {
    // 126 + 4 + 200 = 330 → 可用区下沿取 330
    expect(resolveOverlayPlacement(input({ boundaryBottom: 330 }))).toBe('down')
  })
})

describe('resolveOverlayPlacement 下方不够', () => {
  it('下方装不下且上方更宽时向上', () => {
    // 下：500-496-4=0；上：470-0-4=466 → 向上
    expect(resolveOverlayPlacement(input({
      triggerTop: 470, triggerBottom: 496, boundaryBottom: 500,
    }))).toBe('up')
  })

  it('两侧都不够装时保持向下，避免同一尺寸反复翻转', () => {
    // 可用区 0..300，触发框 100..126：下 170 不够 200，上 96 更少 → 向下（浮层自身滚动）
    expect(resolveOverlayPlacement(input({ boundaryBottom: 300 }))).toBe('down')
  })

  it('间隙计入两侧可用高：gap 越大越容易判成向上', () => {
    const over = { triggerTop: 300, triggerBottom: 326, overlayHeight: 170, boundaryTop: 0, boundaryBottom: 500 }
    // 默认 gap=4：下方 500-326-4=170 恰好够用 → down
    expect(resolveOverlayPlacement(input(over))).toBe('down')
    // gap=5：下方 169 < 170，上方 295 > 169 → up
    expect(resolveOverlayPlacement(input({ ...over, gap: 5 }))).toBe('up')
  })
})
