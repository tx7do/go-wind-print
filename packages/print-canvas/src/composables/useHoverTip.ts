import { nextTick, ref, onUnmounted } from 'vue'

export interface HoverTip { text: string; x: number; y: number }

/**
 * 自定义悬浮提示：事件委托到组件根，读 data-tip，延迟 300ms 显示避免滑过闪烁。
 * 只服务于会被 overflow 裁剪的容器（页签列表、素材台侧栏）——顶部栏与属性台的气泡是 CSS ::after。
 * 消费方需给浮层节点绑定返回的 tipEl，夹取宽度要靠它量出实宽。
 */
export function useHoverTip() {
  const tip = ref<HoverTip | null>(null)
  const tipEl = ref<HTMLElement | null>(null)
  let tipTimer: ReturnType<typeof setTimeout> | null = null

  async function showTipFor(el: HTMLElement) {
    const text = el.dataset.tip
    if (!text) return
    const rect = el.getBoundingClientRect()
    tip.value = { text, x: rect.left + rect.width / 2, y: rect.bottom + 6 }
    await nextTick()
    if (!tip.value) return
    // 先按目标中心摆放，再量出浮层实宽夹回视口：长字段名的气泡比侧栏宽得多，
    // 只夹中心值（旧口径的粗夹）会把整条气泡推出视口左缘，全文反而看不见。
    const half = (tipEl.value?.offsetWidth ?? 0) / 2
    if (!half) return
    const min = half + 8
    const max = Math.max(window.innerWidth - half - 8, min)
    tip.value = { ...tip.value, x: Math.min(Math.max(tip.value.x, min), max) }
  }

  function onTipOver(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null
    if (!el) return
    if (tipTimer) clearTimeout(tipTimer)
    tipTimer = setTimeout(() => showTipFor(el), 300)
  }

  function onTipOut(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null
    // 在同一目标内部移动（子元素间切换）不隐藏
    if (el && (e.relatedTarget as HTMLElement | null)?.closest?.('[data-tip]') === el) return
    hideTip()
  }

  function hideTip() {
    if (tipTimer) { clearTimeout(tipTimer); tipTimer = null }
    tip.value = null
  }

  onUnmounted(hideTip)

  return { tip, tipEl, onTipOver, onTipOut, hideTip }
}
