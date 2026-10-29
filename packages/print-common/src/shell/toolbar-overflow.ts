// 顶部工具栏自适应收纳（print-common 侧，与 print-canvas 的 useToolbarOverflow 等价口径）。
//
// common 的设计器是「状态变更即整树重建」：每次 paint 都 clear + render，
// 所以收纳不靠搬运历史节点，而是每次重绘后按同一判定把内联节点放入落位槽。
// 判定本身复用 @go-wind/print-core/designer 的 resolveToolbarOverflow，两宿主同链同序。
import { h } from '../core/h'
import { iconSvg } from '../core/icons'
import { resolveToolbarOverflow } from '@go-wind/print-core/designer'
import type { ShellCtx } from './controls'

export const TOOLBAR_OVERFLOW_GAP = 2
/** 「更多」触发钮占位宽，与 CSS 侧 .tb-dd-trigger 的 padding + 文字 + 箭头对齐 */
export const MORE_TRIGGER_WIDTH = 74

export interface ToolbarUnitDef {
  id: string
  /** 数值小者先被收进「更多」 */
  order: number
  /** 面板内分组标题 */
  label: string
}

/** 收纳优先级链：与 canvas 的 DesignerToolbar / FormatToolbar 声明逐条对应 */
export const TOOLBAR_UNITS: ToolbarUnitDef[] = [
  { id: 'clipboard', order: 1, label: '剪贴板' },
  { id: 'painter', order: 2, label: '格式刷' },
  { id: 'zoom', order: 3, label: '缩放' },
  { id: 'arrange-view', order: 4, label: '排列 / 视图' },
  { id: 'border', order: 5, label: '边框' },
  { id: 'color', order: 6, label: '颜色' },
  { id: 'align', order: 7, label: '对齐' },
  { id: 'style', order: 8, label: '文字样式' },
  { id: 'font', order: 9, label: '字体与字号' },
]

/**
 * 「更多」分组节点：触发钮 + 常驻面板（收起时 .is-hidden，不能用条件渲染，
 * 否则落位槽不存在，被收纳的单元会退回行内显示）。
 */
export function renderMoreGroup(ctx: ShellCtx) {
  const open = !!ctx.state.openMore
  const items = TOOLBAR_UNITS
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((unit) => h('div', {
      class: 'tb-more-item',
      dataset: { unit: unit.id },
      style: { display: 'none' },
    }, [
      h('div', { class: 'tb-menu-label', text: unit.label }),
      h('div', {
        class: 'tb-more-slot',
        id: `tb-more-slot-${unit.id}`,
        dataset: { unit: unit.id },
      }),
    ]))

  return h('div', { class: 'tb-group tb-more-group', style: { display: 'none' } }, [
    h('div', { class: 'tb-dd' }, [
      h('button', {
        type: 'button',
        class: `tb-dd-trigger${open ? ' on' : ''}`,
        dataset: { test: 'more-dd', tip: '更多' },
        onClick: () => {
          ctx.state.openMore = !open
          ctx.repaint()
        },
        html: `${iconSvg('Ellipsis', 15)}<span class="tb-btn-text">更多</span>${iconSvg('ChevronDown', 12, 'tb-dd-arrow')}`,
      }),
      h('div', { class: `tb-dd-panel tb-more-panel${open ? '' : ' is-hidden'}` },
        [h('div', { class: 'tb-menu tb-more-menu' }, items)]),
    ]),
  ])
}

/**
 * 重绘后置遍：复位 → 量自然宽 → 判定 → 把收纳单元搬进各自落位槽。
 *
 * common 每次 paint 都重建整树，单元自然回到内联态；但窗口尺寸变化不触发重绘，
 * 所以本函数可被重复调用，必须先按「家」把上一轮搬走的节点放回原位，
 * 否则自然宽会量成搬运后的残值，变宽时也无法回退。
 *
 * 容器 scrollWidth 不可用作自然宽：只要还有子项可压缩（品牌区），容器就永不溢出，
 * 会把「放不下」误读成「放得下」，故逐子项取 max(offsetWidth, scrollWidth) 累加。
 */
const homes = new WeakMap<Node, { parent: HTMLElement; next: Node | null }>()

export function applyToolbarOverflow(scope: ParentNode) {
  const tb = scope.querySelector<HTMLElement>('.designer-toolbar')
  if (!tb) return { movedIds: [] as string[], overflowRemains: false }

  const cs = getComputedStyle(tb)
  const gap = Number.parseFloat(cs.gap) || TOOLBAR_OVERFLOW_GAP
  const padL = Number.parseFloat(cs.paddingLeft) || 0
  const padR = Number.parseFloat(cs.paddingRight) || 0

  const unitNodes = new Map<string, HTMLElement>()
  for (const el of Array.from(tb.querySelectorAll<HTMLElement>('.tb-ou[data-unit]'))) {
    const parent = el.parentElement
    // 仅内联态才登记为「家」，避免把落位槽本身记成归宿
    if (parent && !parent.classList.contains('tb-more-slot')) {
      homes.set(el, { parent, next: el.nextSibling })
    }
    unitNodes.set(el.dataset.unit!, el)
  }

  for (const node of unitNodes.values()) {
    const home = homes.get(node)
    if (!home || node.parentElement === home.parent) continue
    if (home.next?.parentElement === home.parent) home.parent.insertBefore(node, home.next)
    else home.parent.appendChild(node)
  }

  let natural = 0
  for (const child of Array.from(tb.children) as HTMLElement[]) {
    if (child.classList.contains('tb-spacer') || child.classList.contains('tb-more-group')) continue
    const w = Math.max(child.offsetWidth, child.scrollWidth)
    if (w <= 0) continue
    natural += w + gap
  }

  const widths = new Map<string, number>()
  for (const [id, el] of unitNodes) {
    const w = el.offsetWidth
    if (w > 0) widths.set(id, w)
  }

  const units = TOOLBAR_UNITS.map((u) => ({ id: u.id, order: u.order, width: widths.get(u.id) ?? 0 }))
  const pinned = units.reduce((sum, u) => sum - u.width - gap, natural)
  const available = tb.clientWidth - padL - padR
  const { movedIds, overflowRemains } = resolveToolbarOverflow({
    available,
    pinned,
    moreTriggerWidth: MORE_TRIGGER_WIDTH,
    gap,
    units,
  })

  for (const unit of TOOLBAR_UNITS) {
    const item = tb.querySelector<HTMLElement>(`.tb-more-item[data-unit="${unit.id}"]`)
    const slot = tb.querySelector<HTMLElement>(`#tb-more-slot-${unit.id}`)
    const node = unitNodes.get(unit.id)
    if (!item || !slot || !node) continue
    const moved = movedIds.includes(unit.id)
    if (moved && node.parentElement !== slot) slot.appendChild(node)
    item.style.display = moved ? '' : 'none'
  }

  const moreGroup = tb.querySelector<HTMLElement>('.tb-more-group')
  if (moreGroup) moreGroup.style.display = movedIds.length > 0 ? '' : 'none'
  tb.classList.toggle('is-tight', overflowRemains)

  return { movedIds, overflowRemains }
}
