import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FlowListGroup from '../components/property/FlowListGroup.vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'

function makeElement(options: Record<string, any> = {}): RuntimeElement {
  return {
    id: 'el-flowlist',
    options: {
      left: 0, top: 0, width: 190, height: 24, fontSize: 10.5,
      formatter: '{name} {spec}', dataSource: 'drugs',
      flowColumns: 4, flowRowHeight: 8, flowGapX: 6,
      ...options,
    },
    printElementType: { type: 'flowList', title: '流式列表' },
  }
}

function labelsOf(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.pd-label').map(n => n.text())
}

/** 可见行标签：canvas 用 v-show 门控（节点在、隐藏），与 common 的条件渲染不同，断言按可见性对齐 */
function visibleLabelsOf(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('.pd-field')
    .filter(f => (f.element as HTMLElement).style.display !== 'none')
    .map(f => f.find('.pd-label').text())
}

/** 取某一行的步进框并写入新值（与属性台真实事件链一致：input → change） */
function commitStepper(wrapper: ReturnType<typeof mount>, label: string, value: string) {
  const row = wrapper.findAll('.pd-field').find(f => (f.find('.pd-label').text() ?? '').includes(label))
  if (!row) throw new Error(`未找到属性行：${label}`)
  const input = row.find('input.pd-step-input')
  if (!input.exists()) throw new Error(`属性行没有步进输入框：${label}`)
  input.setValue(value)
  input.trigger('change')
}

describe('FlowListGroup 属性台', () => {
  it('列数、行高、间距、跨列开关四行都在；开关缺省关时「最多跨几列」不可见', () => {
    const wrapper = mount(FlowListGroup, { props: { element: makeElement() } })
    const labels = labelsOf(wrapper)
    expect(labels).toContain('每行列数')
    expect(labels.some(l => l.includes('行高 (mm)'))).toBe(true)
    expect(labels.some(l => l.includes('单元横向间距'))).toBe(true)
    expect(labels.some(l => l.includes('内容过长时跨列'))).toBe(true)
    expect(visibleLabelsOf(wrapper).some(l => l.includes('最多跨几列'))).toBe(false)
  })

  it('打开跨列开关后补出「最多跨几列」，值按每行列数收敛', () => {
    const element = makeElement({ flowMaxSpan: 9 })
    const wrapper = mount(FlowListGroup, { props: { element } })
    wrapper.find('input.pd-switch').setValue(true)
    expect(element.options.flowAutoSpan).toBe(true)
    expect(element.options.flowMaxSpan).toBe(4)
    expect(labelsOf(wrapper).some(l => l.includes('最多跨几列'))).toBe(true)
  })

  it('每行列数改小时「最多跨几列」被一并顶回（全案唯一改用户值处）', () => {
    const element = makeElement({ flowColumns: 4, flowAutoSpan: true, flowMaxSpan: 4 })
    const wrapper = mount(FlowListGroup, { props: { element } })
    commitStepper(wrapper, '每行列数', '2')
    expect(element.options.flowColumns).toBe(2)
    expect(element.options.flowMaxSpan).toBe(2)
  })

  it('列数挤不下时只给提示，绝不回写用户填的列数', () => {
    const element = makeElement({ flowColumns: 8, width: 20 })
    const wrapper = mount(FlowListGroup, { props: { element } })
    const hint = wrapper.find('.pd-hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('偏挤')
    expect(hint.text()).toContain('数值保持不变')
    expect(element.options.flowColumns).toBe(8)
  })

  it('框宽够用时不出提示行（不无病呻吟）', () => {
    const wrapper = mount(FlowListGroup, { props: { element: makeElement({ flowColumns: 4, width: 190 }) } })
    expect(wrapper.find('.pd-hint').exists()).toBe(false)
  })

  it('行高与间距按档位钳制：行高最小 3mm、间距最大 50mm', () => {
    const element = makeElement()
    const wrapper = mount(FlowListGroup, { props: { element } })
    commitStepper(wrapper, '行高', '1')
    expect(element.options.flowRowHeight).toBe(3)
    commitStepper(wrapper, '单元横向间距', '80')
    expect(element.options.flowGapX).toBe(50)
  })
})
