// @vitest-environment happy-dom
// 字段树长名称显示（common 侧）：与 canvas FieldTreePanel.spec.ts 同口径——
// .node-meta 包裹中文名与变量名，整行 data-tip 与分组 data-tip 带出完整文本（浮层由 print-designer 的 JS 提示承担）。
import { describe, it, expect } from 'vitest'
import type { PrintBusinessField } from '@go-wind/print-core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderLeftPanel } from '../panels'

const LONG_LABEL = '客户签收备注（加急）'
const LONG_KEY = 'customer.receiptRemark.urgentHandling'

const fields: PrintBusinessField[] = [
  { id: '1', fieldKey: 'customer', fieldLabel: '客户信息', fieldType: 'string', sortOrder: 1 },
  { id: '2', fieldKey: LONG_KEY, fieldLabel: LONG_LABEL, fieldType: 'string', sortOrder: 2 },
]

function makeState(): ShellState {
  return {
    leftTab: 'fields', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
}

function paint() {
  const store = new DesignerStore()
  store.fields = fields
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state: makeState(),
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false,
    host: { fonts: [] },
  }
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(renderLeftPanel(ctx), host)
  return host
}

const rowOf = (host: HTMLElement) => Array.from(host.querySelectorAll<HTMLElement>('.field-row'))
  .find(r => r.textContent?.includes(LONG_KEY))!

describe('素材台字段树长字段显示', () => {
  it('字段行用 node-meta 包裹中文名与变量名', () => {
    const host = paint()
    const row = rowOf(host)
    expect(row.querySelector('.node-meta')).toBeTruthy()
    expect(row.querySelector('.node-meta > .node-label')?.textContent).toBe(LONG_LABEL)
    expect(row.querySelector('.node-meta > .node-key')?.textContent).toBe(`(${LONG_KEY})`)
  })

  it('整行 data-tip 带出完整中文名与变量名，不残留原生 title', () => {
    const host = paint()
    const row = rowOf(host)
    expect(row.getAttribute('data-tip')).toBe(`${LONG_LABEL} (${LONG_KEY})`)
    expect(row.getAttribute('title')).toBeNull()
  })

  it('分组标题 data-tip 带出完整分组名', () => {
    const host = paint()
    expect(host.querySelector('.field-group-header .group-label')?.getAttribute('data-tip')).toBe('客户信息')
  })
})
