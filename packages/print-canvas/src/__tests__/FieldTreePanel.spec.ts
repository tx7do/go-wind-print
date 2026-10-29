// 字段树长名称显示契约：中文名与变量名包进 .node-meta，最多两行、每行放不下时各自省略；
// 整行 data-tip 带出完整中文名与变量名，悬停 300ms 后由 .pd-hover-tip 浮层看全（侧栏会裁掉 CSS 气泡）。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FieldTreePanel from '../components/FieldTreePanel.vue'
import type { PrintBusinessField } from '@go-wind/print-core/designer'

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
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('字段行用 node-meta 包裹中文名与变量名', () => {
    const w = mountPanel()
    const row = w.findAll('.field-row').find(r => r.text().includes(LONG_KEY))!
    expect(row.find('.node-meta').exists()).toBe(true)
    expect(row.find('.node-meta > .node-label').text()).toBe(LONG_LABEL)
    expect(row.find('.node-meta > .node-key').text()).toBe(`(${LONG_KEY})`)
  })

  it('整行 data-tip 带出完整中文名与变量名，不残留原生 title', () => {
    const w = mountPanel()
    const row = w.findAll('.field-row').find(r => r.text().includes(LONG_KEY))!
    expect(row.attributes('data-tip')).toBe(`${LONG_LABEL} (${LONG_KEY})`)
    expect(row.attributes('title')).toBeUndefined()
  })

  it('分组标题 data-tip 带出完整分组名', () => {
    const w = mountPanel()
    expect(w.find('.field-group-header .group-label').attributes('data-tip')).toBe('客户信息')
  })

  it('悬停字段行 300ms 后浮层显示全文，行内子元素间移动不隐藏', async () => {
    const w = mountPanel()
    const row = w.findAll('.field-row').find(r => r.text().includes(LONG_KEY))!
    expect(w.find('.pd-hover-tip').exists()).toBe(false)
    await row.find('.node-label').trigger('mouseover')
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(w.find('.pd-hover-tip').text()).toBe(`${LONG_LABEL} (${LONG_KEY})`)
    // 中文名 → 变量名：同一 data-tip 目标内部移动，浮层不闪断
    await row.find('.node-label').trigger('mouseout', { relatedTarget: row.find('.node-key').element })
    expect(w.find('.pd-hover-tip').exists()).toBe(true)
    // 移到行外的其它区域：原浮层收起
    await row.find('.node-label').trigger('mouseout', { relatedTarget: w.find('.panel-title').element })
    expect(w.find('.pd-hover-tip').exists()).toBe(false)
  })
})
