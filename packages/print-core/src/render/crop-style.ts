/**
 * 剪裁取位与放大的声明单点（画布 / 预览 / 出纸三端共用）。
 *
 * 「剪裁」（`fit: 'cover'`）把图等比铺满框，图与框同比例时画面刚好等于框——没有任何东西可裁，
 * 所以放大比例 `fitScale` 把画面按百分比再推大，两轴同时溢出，锚点才真的裁得动。
 *
 * 放大用 `transform: scale()` 而不是撑大 img 盒：object-position 把画面的 x% 点钉在框的 x% 处，
 * transform 以同一比例的 transform-origin 为不动点放大，于是「取位点＝放大中心」两件事共用一个值，
 * 三端不必各推一遍落点公式。放大后的画面由元素框 / 单元格盒的 overflow:hidden 裁掉。
 */

/** 锚点是自由 CSS 值，escapeInlineStyleValue 挡不住用 `;` 追加声明，故按角色白名单整条丢弃 */
const OBJECT_POSITION_UNSAFE = /[;"'<>\\(){}\[\]@!#]/
const OBJECT_POSITION_MAX_LEN = 64

/** 放大比例区间（%）：100＝不放大（存量形态），上限防止画面被推到无意义尺度 */
export const CROP_SCALE_MIN = 100
export const CROP_SCALE_MAX = 400

/** 净化锚点：非法字符、超长、空值一律给空串（宿主 CSSOM 同样会丢弃非法值，两端行为一致） */
export function sanitizeObjectPosition(value?: string): string {
  const v = (value ?? '').trim()
  if (!v || v.length > OBJECT_POSITION_MAX_LEN || OBJECT_POSITION_UNSAFE.test(v)) return ''
  return v
}

/** 只有剪裁档有可裁的边，故只有它消费放大比例；100 与非法值都归成 undefined＝不落声明 */
export function cropScalePct(fit: string | undefined, scale: number | undefined): number | undefined {
  if ((fit || 'contain') !== 'cover') return undefined
  if (typeof scale !== 'number' || !Number.isFinite(scale)) return undefined
  const pct = Math.round(scale)
  if (pct <= CROP_SCALE_MIN) return undefined
  return Math.min(pct, CROP_SCALE_MAX)
}

/**
 * 剪裁相关的样式声明（camelCase 键，宿主直接展开进 style 对象；出纸端按键名转 kebab 内联）。
 * 放大时 transform-origin 复用同一条锚点值：取位点即放大不动点，缺一半都会跑偏。
 */
export function cropStyleDeclarations(
  fit: string | undefined,
  scale: number | undefined,
  objectPosition?: string,
): Record<string, string> {
  const pos = sanitizeObjectPosition(objectPosition)
  const out: Record<string, string> = {}
  if (pos) out.objectPosition = pos
  const pct = cropScalePct(fit, scale)
  if (pct !== undefined) {
    out.transform = `scale(${Number((pct / 100).toFixed(2))})`
    out.transformOrigin = pos || '50% 50%'
  }
  return out
}
