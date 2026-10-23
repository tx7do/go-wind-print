// 流式列表元素的内容层（对应 canvas 的 FlowListElement.vue）。
// 设计台按「一列一格」铺，不预演跨列：跨列档位要按单元实测宽度决定，而画布既不跑测量也不跑分页，
// 预演只能靠估算，画布与出纸就会出现两套栏数（口径见 specs 第八节第 7 项）。
import {
  DEFAULT_DEMO_DATA,
  detectFlowListKey,
  evaluateTemplate,
  resolveFlowColumns,
  resolveFlowGapX,
  resolveFlowRowHeight,
} from '@worm-vue3-print/core/designer'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { h } from '../core/h'

/** 与 canvas FlowListElement 的 DESIGN_FALLBACK_ITEMS 逐字一致：新拖入的元素也要看得见形状 */
export const FLOW_LIST_DEMO_ITEMS = [
  '黄芪 20g', '当归尾 15g', '赤芍 10g', '川芎 10g',
  '地龙 10g', '桃仁 10g', '红花 10g',
]

function asList(source: unknown): Record<string, any>[] {
  return Array.isArray(source) && source.length > 0 ? source as Record<string, any>[] : []
}

/** 列表源解析，与出纸侧同一序：模板里出现的数组字段 → 记录里第一个数组 → demo 数据 */
function resolveItems(formatter: string, record?: Record<string, any>): Record<string, any>[] {
  const key = detectFlowListKey(formatter, record)
    ?? (record ? Object.keys(record).find(k => Array.isArray(record[k])) : undefined)
  if (key) return asList(record?.[key])
  const demoKey = detectFlowListKey(formatter, DEFAULT_DEMO_DATA)
  return demoKey ? asList(DEFAULT_DEMO_DATA[demoKey]) : []
}

export function flowListCells(el: RuntimeElement, data?: Record<string, any>[]): string[] {
  const o = el.options
  const template = typeof o.formatter === 'string' ? o.formatter : ''
  const record = asList(data)[0]
  const list = resolveItems(template, record)
  if (list.length === 0) return [...FLOW_LIST_DEMO_ITEMS]
  if (!template) return list.map(item => String(item?.name ?? JSON.stringify(item)))
  const rec = record ?? {}
  const key = detectFlowListKey(template, rec) ?? Object.keys(rec).find(k => Array.isArray(rec[k]))
  return list.map(item => {
    try {
      // 行上下文同时暴露列表前缀与行内字段：前缀必须指向这一项而不是整个数组，
      // 否则 {drugs.name} 会对数组取路径得到空串（与出纸 itemCtx 同形）
      return evaluateTemplate(template, { ...rec, ...item, ...(key ? { [key]: item } : {}) })
    } catch {
      return template
    }
  })
}

export function renderFlowListElement(el: RuntimeElement, data?: Record<string, any>[]) {
  const o = el.options
  const columns = resolveFlowColumns(o.flowColumns)
  const gapX = resolveFlowGapX(o.flowGapX)
  const rowHeight = resolveFlowRowHeight(o.flowRowHeight)
  const style: Record<string, string> = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns},minmax(0,1fr))`,
    columnGap: `${gapX}mm`,
    gridAutoRows: `minmax(${rowHeight}mm,auto)`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontSize: `${o.fontSize || 12}pt`,
    fontWeight: o.fontWeight || 'normal',
    color: o.color || '#333',
    boxSizing: 'border-box',
  }
  if (o.fontFamily) style.fontFamily = String(o.fontFamily)
  if (o.backgroundColor) style.backgroundColor = String(o.backgroundColor)
  return h('div', { class: 'print-flowlist', style }, flowListCells(el, data).map(text =>
    h('div', { class: 'print-flow-cell', text }),
  ))
}
