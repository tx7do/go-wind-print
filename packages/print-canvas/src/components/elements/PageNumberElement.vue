<template>
  <div class="page-number-element" :style="textStyle">
    {{ displayText }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RuntimeElement } from '@go-wind/print-core/designer'
import { resolveCanvasFontFamily } from '@go-wind/print-core'

const props = defineProps<{
  element: RuntimeElement
  data?: Record<string, any>[]
  designMode?: boolean
}>()

const textStyle = computed(() => {
  const o = props.element.options
  return {
    fontSize: (o.fontSize || 12) + 'pt',
    fontWeight: o.fontWeight || 'normal',
    fontFamily: resolveCanvasFontFamily(o.fontFamily),
    color: o.color || '#333',
    textAlign: (o.textAlign || 'left') as 'left' | 'center' | 'right' | 'justify',
    // justify 不拉伸段落末行，单行页码需显式声明才撑满行宽（出纸走 core textStyle，画布不能落后）
    ...(o.textAlign === 'justify' ? { textAlignLast: 'justify' as const } : {}),
    lineHeight: o.lineHeight ? o.lineHeight + 'pt' : 'normal',
    letterSpacing: o.letterSpacing ? o.letterSpacing + 'pt' : 'normal',
  }
})

const displayText = computed(() => {
  if (props.designMode) {
    return props.element.options.title || '{pageIndex}/{totalPages}'
  }
  // 运行时由 print-render 渲染端按分页填充 {pageIndex}/{totalPages}
  return props.element.options.title || ''
})
</script>

<style scoped>
.page-number-element {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
