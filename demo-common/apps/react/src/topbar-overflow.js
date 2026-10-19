/* 顶部操作区自适应收纳：宽度不足以容纳全部操作时，按优先级链把单元移入「更多」。
   判定与 packages/print-core/src/designer/utils/toolbar-overflow.ts 逐条同逻辑——
   本宿主是直挂形态（无打包器），拿不到 core 的 /designer 子路径，故就地实现同一算法，
   链序与 demo 权威示例保持一致，避免同一视口宽度下各宿主收起的分组不同。 */

/** 收纳优先级链（越靠前越先被收进「更多」），与 index.html 的 data-overflow-unit 一一对应 */
const CHAIN = ['biz', 'host-switch', 'host-badge', 'clear', 'import', 'export', 'custom', 'batch', 'gallery']
const DEFAULT_GAP = 2

export function initTopbarOverflow() {
  const header = document.querySelector('.demo-topbar')
  if (!header) return
  const group = header.querySelector('[data-overflow-more]')
  const trigger = group ? group.querySelector('.demo-more-trigger') : null
  const panel = group ? group.querySelector('.demo-more-panel') : null
  if (!group || !trigger || !panel) return

  /** 单元：node 为可移动的整体，slot 为「更多」面板内的落位容器 */
  const units = CHAIN.map((id, order) => {
    const node = header.querySelector('[data-overflow-unit="' + id + '"]')
    const slot = panel.querySelector('[data-overflow-slot="' + id + '"]')
    return node && slot ? { id, order, node, slot, natural: 0, moved: false } : null
  }).filter(Boolean)
  if (!units.length) return

  const gap = () => parseFloat(getComputedStyle(header).columnGap) || DEFAULT_GAP

  /** 自然宽度只在内联状态下可测；移动进面板后沿用最后一次量到的值 */
  function measure() {
    for (const u of units) if (!u.moved && u.node.offsetWidth > 0) u.natural = u.node.offsetWidth
  }

  /** 常驻不外收的合计宽：顶栏里既不是收纳单元也不是「更多」组的子节点（含隐藏 file input 的 0 宽） */
  function pinnedWidth() {
    let sum = 0
    for (const child of header.children) {
      if (child === group || child.hasAttribute('data-overflow-unit')) continue
      const r = child.getBoundingClientRect()
      // 用 scrollWidth 取自然宽：品牌区被挤成省略号后 getBoundingClientRect 会偏小，
      // 按压缩后的宽度判定会误算「放得下」，导致顶栏文本折行（T-07 的原始症状）
      if (r.width > 0) sum += Math.max(r.width, child.scrollWidth) + gap()
    }
    return sum
  }

  /** 与 core 同一判据：可用宽 = 顶栏内容盒宽；无收纳项时不计「更多」钮宽 */
  function decide(movedSet) {
    const available = header.clientWidth
    if (available <= 0) return true
    if (units.some(u => u.natural <= 0)) return true
    const g = gap()
    let used = pinnedWidth()
    for (const u of units) if (!movedSet.has(u.id)) used += u.natural + g
    if (movedSet.size > 0) used += trigger.offsetWidth + g
    return used <= available
  }

  function resolve() {
    const moved = new Set()
    if (decide(moved)) return { movedIds: moved, overflowRemains: false }
    for (const u of units) {
      moved.add(u.id)
      if (decide(moved)) return { movedIds: moved, overflowRemains: false }
    }
    return { movedIds: moved, overflowRemains: true }
  }

  /** 归位：插回它原本应在的位置——链中第一个仍内联的后继单元之前，否则回到「更多」组之前 */
  function restorePosition(u) {
    const next = units.find(x => x.order > u.order && !x.moved)
    if (next) header.insertBefore(u.node, next.node)
    else header.insertBefore(u.node, group)
  }

  function apply(movedIds) {
    for (const u of units) {
      const shouldMove = movedIds.has(u.id)
      if (shouldMove === u.moved) continue
      if (shouldMove) { u.slot.appendChild(u.node); u.moved = true }
      else { restorePosition(u); u.moved = false }
    }
    group.hidden = movedIds.size === 0
    if (movedIds.size === 0) closePanel()
  }

  function sync() {
    measure()
    const r = resolve()
    apply(r.movedIds)
    header.classList.toggle('is-toolbar-overflow', r.overflowRemains)
  }

  function closePanel() {
    panel.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  }

  trigger.addEventListener('click', () => {
    const open = panel.hidden
    panel.hidden = !open
    trigger.setAttribute('aria-expanded', String(open))
  })
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
