<template>
  <div class="print-flowlist" :style="gridStyle">
    <div
      v-for="(cell, i) in cells"
      :key="i"
      class="print-flow-cell"
    >{{ cell }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RuntimeElement } from '@go-wind/print-core/designer'
import {
  DEFAULT_DEMO_DATA,
  detectFlowListKey,
  engine,
  resolveFlowColumns,
  resolveFlowGapX,
  resolveFlowRowHeight,
} from '@go-wind/print-core/designer'

const props = defineProps<{
  element: RuntimeElement
  data?: Record<string, any>[]
  designMode?: boolean
}>()

/**
 * 设计台按「一列一格」铺，不预演跨列（specs 第八节第 7 项）：
 * 跨列档位要按单元实测宽度决定，而画布既不跑测量也不跑分页，
 * 预演只能靠估算，画布与出纸就会出现两套栏数。栏数、间距、行高与出纸同源。
 */
const gridStyle = computed(() => {
  const o = props.element.options
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${resolveFlowColumns(o.flowColumns)},minmax(0,1fr))`,
    columnGap: `${resolveFlowGapX(o.flowGapX)}mm`,
    gridAutoRows: `minmax(${resolveFlowRowHeight(o.flowRowHeight)}mm,auto)`,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontSize: `${o.fontSize || 12}pt`,
    fontFamily: o.fontFamily || undefined,
    fontWeight: o.fontWeight || undefined,
    color: o.color || '#333',
    backgroundColor: o.backgroundColor || 'transparent',
    boxSizing: 'border-box' as const,
  }
})

/** 设计态缺样：新拖入的元素也要看得见内容形状（运行态绝不凭空造数据） */
const DESIGN_FALLBACK_ITEMS = [
  '黄芪 20g', '当归尾 15g', '赤芍 10g', '川芎 10g',
  '地龙 10g', '桃仁 10g', '红花 10g',
]

function asList(source: unknown): Record<string, any>[] {
  return Array.isArray(source) && source.length > 0 ? source as Record<string, any>[] : []
}

/**
 * 列表源解析，与出纸侧同一序：模板里出现的数组字段（{drugs.name}）→ 记录里第一个数组 → demo 数据。
 * 设计器按「每行一份数据」传 data，明细数组挂在记录自己的字段上，所以先看 data[0]。
 */
function resolveItems(formatter: string, record?: Record<string, any>): Record<string, any>[] {
  const key = detectFlowListKey(formatter, record)
    ?? (record ? Object.keys(record).find(k => Array.isArray(record[k])) : undefined)
  if (key) return asList(record?.[key])
  const demoKey = detectFlowListKey(formatter, DEFAULT_DEMO_DATA)
  return demoKey ? asList(DEFAULT_DEMO_DATA[demoKey]) : []
}

const cells = computed(() => {
  const o = props.element.options
  const template = typeof o.formatter === 'string' ? o.formatter : ''
  const list = resolveItems(template, asList(props.data)[0])

  if (!list.length) return props.designMode ? [...DESIGN_FALLBACK_ITEMS] : []
  if (!template) return list.map(item => String(item?.name ?? JSON.stringify(item)))
  const record = asList(props.data)[0] ?? {}
  const key = detectFlowListKey(template, record) ?? Object.keys(record).find(k => Array.isArray(record[k]))
  return list.map(item => {
    try {
      // 行上下文同时暴露列表前缀与行内字段：{drugs.name} 与 {name} 都求得出值（与出纸 itemCtx 同形，
      // 前缀必须指向这一项而不是整个数组，否则 {drugs.name} 会对数组取路径得到空串）
      return engine.render(template, { ...record, ...item, ...(key ? { [key]: item } : {}) })
    } catch {
      return template
    }
  })
})
</script>
