// 设计态元素边框写入：整圈三字段（borderWidth / borderStyle / borderColor）+ 分边 borders。
// 字段口径与出纸端 resolveElementBorder 同源（pt）；本文件只管「怎么写」，渲染判定仍归 render/element-border.ts。
// 元素只有一圈边，没有单元格那种「相邻格共用边」，故内部档对元素无意义（入口一律置灰）。

import type { ElementBorderSide, ElementOptions } from '../types.js'
import type { BorderPreset } from './table-matrix.js'

/** 一次写入所用的元素边框规格（pt 口径，与整圈三字段及单元格边框统一） */
export interface ElementBorderSpec {
  width: number
  style: string
  color: string
}

/** 整圈宽度 ≤0 / 非法时的兜底档：点预设要真的出框，不能把 0 原样铺上去 */
export const ELEMENT_BORDER_FALLBACK_WIDTH = 0.75

/** 元素台边框操作说明：与单元格台的草稿口径不同，这里改了立即生效，说破两者差别 */
export const ELEMENT_BORDER_APPLY_HINT
  = '线型 / 宽度 / 颜色即时生效：「全部 / 外侧」按该规格铺满四边并覆盖已勾选的单边，上、下、左、右只给选中的边加框；「无」清除边框，「内部」仅表格单元格可用'

type BorderFields = Pick<ElementOptions, 'borderWidth' | 'borderStyle' | 'borderColor' | 'borders'>

/** 用元素当前整圈三字段拼出待应用规格：属性台没有草稿态，规格就是元素自身现值 */
export function resolveElementBorderSpec(opts: BorderFields): ElementBorderSpec {
  const w = opts.borderWidth
  const width = typeof w === 'number' && Number.isFinite(w) && w > 0 ? w : ELEMENT_BORDER_FALLBACK_WIDTH
  return { width, style: opts.borderStyle || 'solid', color: opts.borderColor || '#333333' }
}

/**
 * 整圈预设：`all` 与 `outer` 同效（元素只有一圈边，沿用工具栏既有口径），写整圈三字段；
 * `none` 只把宽度归零（出纸端 ≤0 即无边框），线型与颜色留着不动，便于改回宽度就恢复原样；
 * 两者都清掉分边残留，`inner` 对元素不改。
 */
export function applyElementBorderPreset(opts: BorderFields, preset: BorderPreset, spec: ElementBorderSpec): void {
  if (preset === 'inner') return
  opts.borders = undefined
  if (preset === 'none') {
    opts.borderWidth = 0
    return
  }
  opts.borderWidth = spec.width
  opts.borderStyle = spec.style
  opts.borderColor = spec.color
}

/** 该边是否已有分边边框（单边按钮/勾选框的按下态） */
export function elementBorderEdgeOn(opts: BorderFields, side: ElementBorderSide): boolean {
  return !!opts.borders?.[side]
}

/** 写或撤单条分边，不碰整圈三字段；spec 传 null 即撤掉该边 */
export function setElementBorderEdge(opts: BorderFields, side: ElementBorderSide, spec: ElementBorderSpec | null): void {
  const nb = { ...(opts.borders ?? {}) }
  if (spec) nb[side] = { width: spec.width, style: spec.style, color: spec.color }
  else delete nb[side]
  opts.borders = nb
}
