/**
 * 浮层放置判定：输入触发框、浮层高度与可用区（已折算最近裁剪祖先与视口的交集），
 * 返回浮层该向下还是向上展开。测量由宿主完成，此处只做数值判定，
 * 保证 canvas 与 print-common 两套宿主在同一尺寸下得到同一结论。
 */
export type OverlayPlacement = 'down' | 'up'

export interface OverlayPlacementInput {
  /** 触发框上沿（视口坐标） */
  triggerTop: number
  /** 触发框下沿（视口坐标） */
  triggerBottom: number
  /** 浮层自身高度 */
  overlayHeight: number
  /** 可用区上沿 */
  boundaryTop: number
  /** 可用区下沿 */
  boundaryBottom: number
  /** 触发框与浮层之间的间隙，缺省 4 */
  gap?: number
}

export function resolveOverlayPlacement(input: OverlayPlacementInput): OverlayPlacement {
  const gap = input.gap ?? 4
  const below = input.boundaryBottom - input.triggerBottom - gap
  const above = input.triggerTop - input.boundaryTop - gap
  if (below >= input.overlayHeight) return 'down'
  return above > below ? 'up' : 'down'
}
