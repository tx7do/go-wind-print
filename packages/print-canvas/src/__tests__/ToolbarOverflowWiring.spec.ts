import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import DesignerToolbar from '../components/DesignerToolbar.vue'
import FormatToolbar from '../components/FormatToolbar.vue'
import { useFormatToolbar } from '../composables/useFormatToolbar'
import { TOOLBAR_OVERFLOW } from '../composables/useToolbarOverflow'
import type { ToolbarOverflowContext } from '../composables/useToolbarOverflow'

const GAP = 2
const UNIT_W = 80
const OWN_W = 60

/**
 * happy-dom 无排版引擎：收纳判定读的是「逐子项自然宽累加」，
 * 因此按同一口径给容器与子项打桩，而不是伪造 scrollWidth。
 * 单元宽度各自桩为 UNIT_W；承载单元的外层分组再加一份自身占位宽 OWN_W。
 */
function stubLayout(root: HTMLElement, available: number) {
  Object.defineProperty(root, 'clientWidth', { value: available, configurable: true })
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (child.classList.contains('tb-spacer') || child.classList.contains('tb-more-group')) continue
    const inner = Array.from(child.querySelectorAll('.tb-ou')) as HTMLElement[]
    for (const u of inner) {
      Object.defineProperty(u, 'offsetWidth', { value: UNIT_W, configurable: true })
      Object.defineProperty(u, 'scrollWidth', { value: UNIT_W, configurable: true })
    }
    const isUnit = child.classList.contains('tb-ou')
    const w = isUnit ? UNIT_W : OWN_W + inner.length * (UNIT_W + GAP)
    Object.defineProperty(child, 'offsetWidth', { value: w, configurable: true })
    Object.defineProperty(child, 'scrollWidth', { value: w, configurable: true })
  }
}

function contextOf(wrapper: ReturnType<typeof mount>): ToolbarOverflowContext {
  const vm = wrapper.vm as unknown as { $: { provides: Record<symbol, unknown> } }
  return vm.$.provides[TOOLBAR_OVERFLOW] as ToolbarOverflowContext
}

/** 真实注入格式栏（空选中态），使 9 个收纳单元全部注册 */
async function mountMeasured(available: number | null) {
  const format = useFormatToolbar({
    elements: ref([]),
    selectedIds: ref(new Set<string>()),
    tableSelection: ref(null),
    recordHistory: () => {},
  })
  const w = mount(DesignerToolbar, {
    attachTo: document.body,
    slots: { default: () => h(FormatToolbar, { format }) },
  })
  await nextTick()
  const root = w.find('.designer-toolbar').element as HTMLElement
  if (available !== null) stubLayout(root, available)
  contextOf(w).refresh()
  await nextTick()
  return { wrapper: w, root }
}

/** 收纳判定看落点：单元是否位于「更多」面板内自己的落位槽 */
const unitMoved = (id: string) =>
  !!document.querySelector(`#tb-more-slot-${id} > .tb-ou[data-unit="${id}"]`)

const unitRendered = (root: HTMLElement, id: string) =>
  !!root.querySelector(`.tb-ou[data-unit="${id}"]`)

/** 单元元素必须带宿主 scoped 属性：没有 data-v-* 就命不中 .tb-group / .ft-group 样式，会退化成 block 把子项竖排 */
const scopedHosts = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.tb-ou'))
  .filter(el => !Array.from(el.attributes).some(a => a.name.startsWith('data-v-')))
  .map(el => el.dataset.unit ?? '?')

describe('工具栏收纳接线：单元节点必须可被宿主样式命中', () => {
  it('每个 .tb-ou 元素都带宿主作用域属性，且计算行盒为一行的 flex 容器', async () => {
    const { wrapper, root } = await mountMeasured(1200)
    expect(scopedHosts(root)).toEqual([])
    wrapper.unmount()
  })
})

describe('工具栏收纳接线：宽度充裕', () => {
  it('放得下时全部单元留在原位，「更多」不出现', async () => {
    const { wrapper, root } = await mountMeasured(1200)
    expect(unitMoved('clipboard')).toBe(false)
    expect(unitMoved('font')).toBe(false)
    expect(unitRendered(root, 'font')).toBe(true)
    expect(wrapper.find('[data-test=more-dd]').isVisible()).toBe(false)
    wrapper.unmount()
  })
})

describe('工具栏收纳接线：窄屏按优先级链收纳', () => {
  it('轻度不足时只收链首单元，链尾仍留在原位', async () => {
    const { wrapper, root } = await mountMeasured(800)
    expect(unitMoved('clipboard')).toBe(true)
    expect(unitMoved('font')).toBe(false)
    expect(unitRendered(root, 'font')).toBe(true)
    wrapper.unmount()
  })

  it('被收纳的单元落到「更多」面板自己的落位槽，并带分组标题', async () => {
    const { wrapper } = await mountMeasured(800)
    const item = document.querySelector('.tb-more-item[data-unit="clipboard"]')
    expect(item?.querySelector('.tb-menu-label')?.textContent).toBe('剪贴板')
    expect(item?.querySelector('#tb-more-slot-clipboard .tb-ou')).toBeTruthy()
    wrapper.unmount()
  })

  it('收纳发生时「更多」触发钮可见', async () => {
    const { wrapper } = await mountMeasured(800)
    expect(wrapper.find('[data-test=more-dd]').isVisible()).toBe(true)
    wrapper.unmount()
  })

  it('极端不足时链上单元全部收纳，并标记 tight 供样式兜底', async () => {
    const { wrapper, root } = await mountMeasured(200)
    expect(unitMoved('font')).toBe(true)
    expect(root.classList.contains('is-tight')).toBe(true)
    wrapper.unmount()
  })
})

describe('工具栏收纳接线：度量未就绪', () => {
  it('未打桩布局（宽度全为 0）时不收纳任何单元', async () => {
    const { wrapper, root } = await mountMeasured(null)
    expect(unitMoved('clipboard')).toBe(false)
    expect(unitRendered(root, 'clipboard')).toBe(true)
    expect(wrapper.find('[data-test=more-dd]').isVisible()).toBe(false)
    wrapper.unmount()
  })
})
