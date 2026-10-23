<!-- 属性级「恢复默认值」：落点派生自该层出厂值 base[propKey]，不新增默认值存储 -->
<template>
  <button
    type="button"
    class="pd-reset-btn"
    :class="{ 'is-dirty': dirty }"
    :data-tip="tip"
    :aria-label="tip"
    @click="reset"
  ><RotateCcw :size="13" /></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  /** 当前承载对象：element.options / cell / 水印或拼版配置对象 */
  target: Record<string, any>
  /** 该层出厂值对象。元素级传 createDefaultOptions(type)，单元格级传 {}，水印拼版传对应 DEFAULTS */
  base: Record<string, any>
  propKey: string
  /** 提示语数值：来自注册表 default，仅用于文案，不参与判定 */
  tipValue?: number | string
  tipUnit?: string
  /** 覆盖整条提示（单元格级固定用「跟随表格默认」，因为回落目标是该表自己的默认） */
  tipOverride?: string
  /** 覆盖写回通道：单元格组必须走分组自己的整选区 write()，不能让组件直接改单个 cell 对象 */
  write?: (value: any) => void
}>()

const emit = defineEmits<{ change: [] }>()

/** 出厂值：undefined 即「未设」，写回它天然等于删键 */
const factory = computed(() => props.base?.[props.propKey])

/** 判据必须用 === 比出厂值；0 与 undefined 是两个状态，不得用 ?? / || 归并 */
const dirty = computed(() => props.target?.[props.propKey] !== factory.value)

const tip = computed(() => {
  if (props.tipOverride) return props.tipOverride
  if (props.tipValue === undefined) return '恢复默认值'
  return `恢复默认值（${props.tipValue}${props.tipUnit ? ' ' + props.tipUnit : ''}）`
})

function reset() {
  if (!dirty.value) return
  if (props.write) props.write(factory.value)
  else props.target[props.propKey] = factory.value
  emit('change')
}
</script>
