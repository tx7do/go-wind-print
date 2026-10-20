<!-- 裁剪锚点：位置档下拉 + 可动轴数字框 + 原图可视窗示意。只在缩放模式=剪裁时使用。 -->
<template>
  <div class="pd-field" :data-field="fieldKey"><span class="pd-label">{{ label }}<button type="button" class="pd-help" :data-tip="tip" aria-label="字段说明" /></span>
    <select class="pd-select" style="width: 100%" :value="selectValue" @change="onPresetChange">
      <option v-for="o in presetOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      <option v-if="isCustom" value="custom">自定义（保留原值）</option>
    </select>
  </div>

  <div class="pd-field" v-for="row in axisRows" :key="row.name" :data-field="fieldKey">
    <span class="pd-label">{{ row.label }}</span>
    <StepperInput :model-value="row.value"
      :min="0"
      :max="100"
      :step="1" @update:model-value="onAxisInput(row.name, $event)" />
  </div>

  <p class="pd-crop-note" v-if="note">{{ note }}</p>

  <div class="pd-crop-preview" v-if="src">
    <img class="pd-crop-thumb" :src="src" alt="原图" @load="onLoad" />
    <div class="pd-crop-win" v-if="win" :style="winStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CropAxisName } from '@worm-vue3-print/core/designer'
import {
  buildCropAnchor,
  cropAxisFields,
  cropAxisNote,
  cropPresetOptions,
  cropWindow,
  parseCropAnchor,
  propertyTip,
  resolveCropAxis,
} from '@worm-vue3-print/core/designer'
import StepperInput from './StepperInput.vue'

const props = withDefaults(defineProps<{
  /** 注册表 key，用于取字段说明 */
  fieldKey: string
  label: string
  /** 已解析的图片地址（表达式由宿主求值后传入）；为空则不画示意 */
  src?: string
  /** 模板里的存量值，原样是 CSS 两轴位置 */
  modelValue?: string
  widthMm: number
  heightMm: number
}>(), {
  src: '',
  modelValue: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const tip = computed(() => propertyTip(props.fieldKey))

/** 自然尺寸由预览图加载事件带出；拿不到就按两轴降级 */
const size = ref<{ width: number; height: number } | undefined>(undefined)
function onLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    size.value = { width: img.naturalWidth, height: img.naturalHeight }
  }
}

const parsed = computed(() => parseCropAnchor(props.modelValue))
const isCustom = computed(() => parsed.value.kind === 'custom')
const curX = computed(() => parsed.value.kind === 'axes' ? parsed.value.x : 50)
const curY = computed(() => parsed.value.kind === 'axes' ? parsed.value.y : 50)

const box = computed(() => ({
  widthMm: props.widthMm,
  heightMm: props.heightMm,
  naturalWidth: size.value?.width,
  naturalHeight: size.value?.height,
}))
const axis = computed<CropAxisName>(() => resolveCropAxis(box.value).axis)
const travelMm = computed(() => resolveCropAxis(box.value).travelMm)

const presetOptions = computed(() => cropPresetOptions(axis.value, curX.value, curY.value))

const selectValue = computed(() => isCustom.value ? 'custom' : `${curX.value},${curY.value}`)

const axisRows = computed(() => cropAxisFields(axis.value, curX.value, curY.value))

const note = computed(() => cropAxisNote(axis.value, travelMm.value, isCustom.value))

function commit(x: number, y: number) {
  emit('update:modelValue', buildCropAnchor(x, y))
}

function onPresetChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  if (value === 'custom') return
  const [x, y] = value.split(',').map(Number)
  commit(x, y)
}

function onAxisInput(name: 'horizontal' | 'vertical', value: number | undefined) {
  if (value === undefined) return
  name === 'horizontal' ? commit(value, curY.value) : commit(curX.value, value)
}

const win = computed(() => cropWindow(box.value, curX.value, curY.value))

/** 四位小数足够定位红框，又不至于把 DOM 属性写成浮点长串 */
function pct(v: number): string {
  return `${Math.round(v * 10000) / 10000}%`
}

const winStyle = computed(() => win.value && {
  left: pct(win.value.leftPct),
  top: pct(win.value.topPct),
  width: pct(win.value.widthPct),
  height: pct(win.value.heightPct),
})
</script>

<style scoped>
.pd-crop-note {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--pd-text-faint, #6b7280);
}
.pd-crop-preview {
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid var(--pd-border, #d9dde6);
  border-radius: 4px;
  line-height: 0;
}
.pd-crop-thumb {
  max-width: 100%;
  max-height: 96px;
  display: block;
}
.pd-crop-win {
  position: absolute;
  border: 1px solid #ff5a5a;
  box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}
</style>
