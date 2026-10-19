import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Teleport, defineComponent, h, nextTick, onMounted, ref, withDirectives } from 'vue'
import {
  provideToolbarOverflow,
  createOverflowUnitDirective,
  TOOLBAR_OVERFLOW,
  type OverflowUnitDef,
  type ToolbarOverflowContext,
} from '../index'

const GAP = 2
const UNIT_W = 80
const OWN_W = 60

const UNITS: OverflowUnitDef[] = [
  { id: 'alpha', order: 1, label: '甲组' },
  { id: 'beta', order: 2, label: '乙组' },
]

/**
 * 宿主侧用法复刻（demo 顶部区就是这个形态）：类名全部自定义，只靠
 * data-overflow-slot / data-overflow-more / data-overflow-spacer 三个属性与机制对接。
 */
const HostBar = defineComponent({
  setup() {
    const overflow = provideToolbarOverflow()
    const vUnit = createOverflowUnitDirective(overflow)
    const rootRef = ref<HTMLElement | null>(null)
    onMounted(() => overflow.attachRoot(rootRef.value))

    const unitNode = (unit: OverflowUnitDef) =>
      withDirectives(h('div', { class: 'host-ou' }, unit.id), [[vUnit, unit]])

    return () => h('div', { ref: rootRef, class: 'host-bar' }, [
      h('span', { class: 'host-title' }, '标题'),
      ...UNITS.map((unit) => h(Teleport, {
        to: overflow.slotEl(unit.id),
        disabled: !overflow.moved(unit.id),
      }, [unitNode(unit)])),
      h('span', { class: 'host-filler', 'data-overflow-spacer': '' }),
      h('div', { class: 'host-more', 'data-overflow-more': '' },
        UNITS.map((unit) => h('div', { class: 'host-more-item', 'data-unit': unit.id }, [
          h('span', { class: 'host-label' }, unit.label),
          h('div', { class: 'host-slot', 'data-overflow-slot': unit.id, 'data-unit': unit.id }),
        ]))),
    ])
  },
})

/** 按「逐子项自然宽累加」口径打桩（happy-dom 无排版引擎） */
function stubLayout(bar: HTMLElement, available: number) {
  Object.defineProperty(bar, 'clientWidth', { value: available, configurable: true })
  for (const child of Array.from(bar.children) as HTMLElement[]) {
    if (child.hasAttribute('data-overflow-spacer') || child.hasAttribute('data-overflow-more')) continue
    const isUnit = child.classList.contains('host-ou')
    const inner = isUnit ? [] : Array.from(child.querySelectorAll('.host-ou')) as HTMLElement[]
    for (const u of inner) {
      Object.defineProperty(u, 'offsetWidth', { value: UNIT_W, configurable: true })
      Object.defineProperty(u, 'scrollWidth', { value: UNIT_W, configurable: true })
    }
    const w = isUnit ? UNIT_W : OWN_W + inner.length * (UNIT_W + GAP)
    Object.defineProperty(child, 'offsetWidth', { value: w, configurable: true })
    Object.defineProperty(child, 'scrollWidth', { value: w, configurable: true })
  }
}

async function mountHost(available: number | null) {
  const wrapper = mount(HostBar, { attachTo: document.body })
  await nextTick()
  const bar = wrapper.find('.host-bar').element as HTMLElement
  if (available !== null) stubLayout(bar, available)
  // happy-dom 无 ResizeObserver：打桩后必须手动触发一次重算
  const vm = wrapper.vm as unknown as { $: { provides: Record<symbol, unknown> } }
  ;(vm.$.provides[TOOLBAR_OVERFLOW] as ToolbarOverflowContext).refresh()
  await nextTick()
  return { wrapper, bar }
}

/** 单元落点：在落位槽里 = 已收纳；否则仍在宿主行内 */
const movedIds = (bar: HTMLElement) => Array
  .from(bar.querySelectorAll('.host-slot > .host-ou'))
  .map(e => e.textContent ?? '')

function contextOf(wrapper: ReturnType<typeof mount>): ToolbarOverflowContext {
  const vm = wrapper.vm as unknown as { $: { provides: Record<symbol, unknown> } }
  return vm.$.provides[TOOLBAR_OVERFLOW] as ToolbarOverflowContext
}

describe('收纳机制的宿主契约（自定义类名 + data-overflow-* 属性）', () => {
  it('宽度充裕时不收纳', async () => {
    const { wrapper, bar } = await mountHost(1200)
    expect(movedIds(bar)).toEqual([])
    wrapper.unmount()
  })

  it('轻度不足时只收链首单元', async () => {
    // 桩口径下自然宽 226：available 222 时全展开(226)放不下、收 alpha 后(62+82+76=220)刚好放下
    const { wrapper, bar } = await mountHost(222)
    expect(movedIds(bar)).toEqual(['alpha'])
    wrapper.unmount()
  })

  it('放不下时按链序把单元搬进宿主自己的落位槽', async () => {
    const { wrapper, bar } = await mountHost(200)
    expect(movedIds(bar)).toEqual(['alpha', 'beta'])
    expect(bar.querySelector('.host-title')).toBeTruthy()
    wrapper.unmount()
  })

  it('落位槽按 data-overflow-slot 属性配对，与类名无关', async () => {
    const { wrapper, bar } = await mountHost(200)
    const slot = bar.querySelector('.host-slot[data-overflow-slot="beta"]')
    expect(slot?.querySelector('.host-ou')?.textContent).toBe('beta')
    wrapper.unmount()
  })

  it('「更多」容器与弹性占位不计入自然宽，灌入巨宽也不误收', async () => {
    const { wrapper, bar } = await mountHost(1200)
    for (const sel of ['.host-more', '.host-filler']) {
      const el = bar.querySelector<HTMLElement>(sel)!
      Object.defineProperty(el, 'offsetWidth', { value: 5000, configurable: true })
      Object.defineProperty(el, 'scrollWidth', { value: 5000, configurable: true })
    }
    // 重算一次：若排除项失效，自然宽会暴涨到 10000+，必然触发收纳
    const vm = wrapper.vm as unknown as { $: { provides: Record<symbol, unknown> } }
    ;(vm.$.provides[TOOLBAR_OVERFLOW] as ToolbarOverflowContext).refresh()
    await nextTick()
    expect(movedIds(bar)).toEqual([])
    wrapper.unmount()
  })

  it('未布局（宽度全 0）时保守不收纳，单元留在行内', async () => {
    const { wrapper, bar } = await mountHost(null)
    expect(movedIds(bar)).toEqual([])
    expect(bar.querySelectorAll(':scope > .host-ou').length).toBe(2)
    wrapper.unmount()
  })

  /**
   * hasMoved 是宿主用来隐藏「更多」入口的信号。
   * 宿主忘记绑定它就会出现「宽屏也挂着一个空的更多」，此用例把契约钉住。
   */
  it('上下文对宿主暴露 hasMoved，随收纳态翻转', async () => {
    const wide = await mountHost(1200)
    const wideCtx = contextOf(wide.wrapper)
    expect(wideCtx.hasMoved.value).toBe(false)
    wide.wrapper.unmount()

    const narrow = await mountHost(200)
    expect(contextOf(narrow.wrapper).hasMoved.value).toBe(true)
    narrow.wrapper.unmount()
  })
})
