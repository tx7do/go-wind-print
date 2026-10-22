// 字段树长名称显示契约：中文名与变量名包进 .node-meta，放不下时变量名才能下沉换行；
// 整行 title 必须带出完整中文名与变量名，省略后仍可悬停看全。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FieldTreePanel from '../components/FieldTreePanel.vue'
import type { PrintBusinessField } from '@worm-vue3-print/core/designer'

const LONG_LABEL = '客户签收备注（加急）'
const LONG_KEY = 'customer.receiptRemark.urgentHandling'

const fields: PrintBusinessField[] = [
  { id: '1', fieldKey: 'customer', fieldLabel: '客户信息', fieldType: 'string', sortOrder: 1 },
  { id: '2', fieldKey: LONG_KEY, fieldLabel: LONG_LABEL, fieldType: 'string', sortOrder: 2 },
]

function mountPanel() {
  return mount(FieldTreePanel, { props: { fields } })
}

describe('FieldTreePanel 长字段显示', () => {
  it('字段行用 node-meta 包裹中文名与变量名', () => {
    const w = mountPanel()
    const row = w.findAll('.field-row').find(r => r.text().includes(LONG_KEY))!
    expect(row.find('.node-meta').exists()).toBe(true)
    expect(row.find('.node-meta > .node-label').text()).toBe(LONG_LABEL)
    expect(row.find('.node-meta > .node-key').text()).toBe(`(${LONG_KEY})`)
  })

  it('整行 title 带出完整中文名与变量名', () => {
    const w = mountPanel()
    const row = w.findAll('.field-row').find(r => r.text().includes(LONG_KEY))!
    expect(row.attributes('title')).toBe(`${LONG_LABEL} (${LONG_KEY})`)
  })

  it('分组标题 title 带出完整分组名', () => {
    const w = mountPanel()
    expect(w.find('.field-group-header .group-label').attributes('title')).toBe('客户信息')
  })
})
