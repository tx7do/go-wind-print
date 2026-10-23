import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowListElement from '../components/elements/FlowListElement.vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'

function makeElement(options: Partial<RuntimeElement['options']> = {}): RuntimeElement {
  return {
    id: 'el-flowlist',
    options: {
      left: 0, top: 0, width: 190, height: 24, fontSize: 10.5,
      formatter: '{name} {spec}', dataSource: 'drugs',
      flowColumns: 4, flowRowHeight: 8, flowGapX: 6,
      flowAutoSpan: true, flowMaxSpan: 2,
      ...options,
    },
    printElementType: { type: 'flowList', title: '流式列表' },
  }
}

const DRUGS = [
  { name: '黄芪', spec: '20g' },
  { name: '炙黄芪（先煎）', spec: '30g' },
  { name: '红花', spec: '10g' },
]
/** 设计器把打印数据按「每行一份」传进来，明细数组挂在记录自己的字段上 */
const PRINT_DATA = [{ drugs: DRUGS }]

function rootStyle(wrapper: { element: Element }): string {
  return (wrapper.element.getAttribute('style') ?? '').replace(/\s/g, '')
}

describe('FlowListElement 设计态铺法', () => {
  it('网格列数、间距、最小行高与出纸同源', () => {
    const wrapper = mount(FlowListElement, { props: { element: makeElement(), data: PRINT_DATA, designMode: true } })
    const style = rootStyle(wrapper)
    expect(style).toContain('grid-template-columns:repeat(4,minmax(0,1fr))')
    expect(style).toContain('column-gap:6mm')
    expect(style).toContain('grid-auto-rows:minmax(8mm,auto)')
    expect(style).toContain('overflow:hidden')
  })

  it('单元模板按业务数据逐项求值，一物一格里排开', () => {
    const wrapper = mount(FlowListElement, { props: { element: makeElement(), data: PRINT_DATA, designMode: true } })
    expect(wrapper.findAll('.print-flow-cell').map(c => c.text()))
      .toEqual(['黄芪 20g', '炙黄芪（先煎） 30g', '红花 10g'])
  })

  it('未填数据源时取记录里第一个数组（与出纸 resolveListSource 同兜底）', () => {
    const wrapper = mount(FlowListElement, {
      props: { element: makeElement({ dataSource: undefined }), data: [{ herbs: DRUGS }], designMode: true },
    })
    expect(wrapper.findAll('.print-flow-cell').length).toBe(3)
  })

  it('单元模板写成完整表达式时按表达式里的列表路径取数', () => {
    const wrapper = mount(FlowListElement, {
      props: {
        element: makeElement({ formatter: '{drugs.name} {drugs.spec}', dataSource: undefined }),
        data: PRINT_DATA,
        designMode: true,
      },
    })
    expect(wrapper.findAll('.print-flow-cell').map(c => c.text()))
      .toEqual(['黄芪 20g', '炙黄芪（先煎） 30g', '红花 10g'])
  })

  it('设计台不预演跨列：开了自动跨列也不写 grid-column:span', () => {
    const wrapper = mount(FlowListElement, { props: { element: makeElement(), data: PRINT_DATA, designMode: true } })
    expect(wrapper.html()).not.toContain('grid-column:span')
    expect(rootStyle(wrapper)).not.toContain('span')
  })

  it('没有数据时按内置样例铺出形状，新拖入的元素不是空框', () => {
    const wrapper = mount(FlowListElement, { props: { element: makeElement(), designMode: true } })
    expect(wrapper.findAll('.print-flow-cell').length).toBe(7)
  })

  it('运行态无数据时不硬塞样例（出纸不能凭空多出不存在的药味）', () => {
    const wrapper = mount(FlowListElement, { props: { element: makeElement(), designMode: false } })
    expect(wrapper.findAll('.print-flow-cell').length).toBe(0)
  })

  it('列数非法值回落到下限档，不出现 repeat(0)', () => {
    const wrapper = mount(FlowListElement, {
      props: { element: makeElement({ flowColumns: 0 }), data: PRINT_DATA, designMode: true },
    })
    expect(rootStyle(wrapper)).toContain('grid-template-columns:repeat(1,minmax(0,1fr))')
  })
})
