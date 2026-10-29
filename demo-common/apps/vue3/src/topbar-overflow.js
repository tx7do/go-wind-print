/* 顶部操作区自适应收纳：宽度不足以容纳全部操作时，按优先级链把单元移入「更多」。
   判定直接调 core 的 resolveToolbarOverflow（与 canvas 的 useToolbarOverflow、设计器顶栏同一份纯函数），
   本文件只做宿主侧的量宽、搬运 DOM 与状态类维护；链序与 demo 权威示例保持一致，
   避免同一视口宽度下各宿主收起的分组不同。此前这里就地重写了一遍算法，已漂出四条口径（见 TODO T-19b）。 */

import { resolveToolbarOverflow } from '@go-wind/print-core/designer'

/** 收纳优先级链（越靠前越先被收进「更多」），与 index.html 的 data-overflow-unit 一一对应 */
const CHAIN = ['biz', 'host-switch', 'host-badge', 'clear', 'import', 'export', 'custom', 'batch', 'gallery']
/** 与 canvas useToolbarOverflow 同一组常数：判据只在 core 与这一处结算 */
const GAP = 2
/** 「更多」触发钮占位宽：收纳态下才可见、量不到稳定值，故与 demo 一样按固定宽预算 */
const MORE_TRIGGER_WIDTH = 74

export function initTopbarOverflow() {
  const header = document.querySelector('.demo-topbar')
  if (!header) return
  const group = header.querySelector('[data-overflow-more]')
  const trigger = group ? group.querySelector('.demo-more-trigger') : null
  const panel = group ? group.querySelector('.demo-more-panel') : null
  const caret = group ? group.querySelector('.demo-more-caret') : null
  if (!group || !trigger || !panel) return

  /** 单元：node 为可移动的整体，slot 为「更多」面板内的落位容器 */
  const units = CHAIN.map((id, order) => {
    const node = header.querySelector('[data-overflow-unit="' + id + '"]')
    const slot = panel.querySelector('[data-overflow-slot="' + id + '"]')
    return node && slot ? { id, order, node, slot, natural: 0, moved: false } : null
  }).filter(Boolean)
  if (!units.length) return

  /** 全部内联时量到的一次自然宽合计；搬进面板后节点不在顶栏，靠这份缓存参与计算（canvas 同策略） */
  let naturalTotal = 0
  let movedIds = new Set()

  /** 自然宽度只在内联状态下可测；移动进面板后沿用最后一次量到的值 */
  function measureInlineUnits() {
    for (const u of units) {
      const w = u.node.offsetWidth
      if (w > 0) u.natural = w
    }
  }

  /** 累加顶栏全部子项自然宽：「更多」组与弹性占位不计（后者吸收余量，计入会把自然宽算虚） */
  function measureToolbar() {
    const cs = getComputedStyle(header)
    const gap = Number.parseFloat(cs.columnGap) || GAP
    const padL = Number.parseFloat(cs.paddingLeft) || 0
    const padR = Number.parseFloat(cs.paddingRight) || 0
    let total = 0
    for (const child of Array.from(header.children)) {
      if (child === group || child.hasAttribute('data-overflow-spacer')) continue
      const el = child
      // 用 scrollWidth 兜自然宽：品牌区被挤成省略号后 offsetWidth 会偏小，
      // 按压缩后的宽度判定会误算「放得下」，导致顶栏文本折行（T-07 的原始症状）
      const w = Math.max(el.offsetWidth, el.scrollWidth)
      if (w > 0) total += w + gap
    }
    return { available: header.clientWidth - padL - padR, natural: total }
  }

  /** 归位：插回它原本应在的位置——链中第一个仍内联的后继单元之前，否则回到「更多」组之前 */
  function restorePosition(u) {
    const next = units.find(x => x.order > u.order && !x.moved)
    if (next) header.insertBefore(u.node, next.node)
    else header.insertBefore(u.node, group)
  }

  function apply(next) {
    for (const u of units) {
      const shouldMove = next.has(u.id)
      if (shouldMove === u.moved) continue
      if (shouldMove) { u.slot.appendChild(u.node); u.moved = true }
      else { restorePosition(u); u.moved = false }
    }
    movedIds = next
    group.hidden = next.size === 0
    if (next.size === 0) closePanel()
  }

  function sync() {
    const wasMoved = movedIds.size > 0
    const { available, natural } = measureToolbar()
    if (!wasMoved) {
      naturalTotal = natural
      measureInlineUnits()
    }
    const inputs = units.map(u => ({ id: u.id, order: u.order, width: u.natural }))
    // 常驻宽 = 自然宽合计减去各单元自身与其分隔（与 canvas 同一算式，含其 gap 口径）
    const pinned = inputs.reduce((sum, u) => sum - u.width - GAP, naturalTotal)
    const result = resolveToolbarOverflow({
      available,
      pinned,
      moreTriggerWidth: MORE_TRIGGER_WIDTH,
      gap: GAP,
      units: inputs,
    })
    apply(new Set(result.movedIds))
    header.classList.toggle('is-tight', result.overflowRemains)
    // 由收纳态回到全展开后，DOM 已换回内联位置，需再量一次真实宽度
    if (wasMoved && result.movedIds.length === 0) requestAnimationFrame(sync)
  }

  /** 状态类与 demo 的 DemoTopbarMore.vue 同三条：`is-open` 管浮层层级、`on` 高亮触发钮、`up` 翻折角 */
  function setOpen(open) {
    panel.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
    group.classList.toggle('is-open', open)
    trigger.classList.toggle('on', open)
    if (caret) caret.classList.toggle('up', open)
  }

  function closePanel() {
    setOpen(false)
  }

  trigger.addEventListener('click', () => setOpen(panel.hidden))
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !group.contains(e.target)) closePanel()
  })

  let queued = 0
  const ro = new ResizeObserver(() => {
    if (queued) return
    queued = requestAnimationFrame(() => { queued = 0; sync() })
  })
  ro.observe(header)
  for (const u of units) ro.observe(u.node)
  window.addEventListener('resize', sync)
  sync()
  return { sync, closePanel }
}
