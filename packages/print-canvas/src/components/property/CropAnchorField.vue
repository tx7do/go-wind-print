<!-- 裁剪锚点：位置档下拉 + 放大比例 + 水平／垂直两框常驻 + 原图可视窗示意。只有缩放模式为剪裁（cover）时才有被裁掉的边，宿主只在那一档出这一行。 -->
<template>
  <div class="pd-field" :data-field="fieldKey"><span class="pd-label"><span class="pd-label-t">{{ label }}<button type="button" class="pd-help" :data-tip="tip" aria-label="字段说明" /></span>
    <ResetButton v-if="options && base" :target="options" :base="base" prop-key="objectPosition" :tip-value="def(fieldKey)?.value" :tip-unit="def(fieldKey)?.unit" />
  </span>
    <select class="pd-select" style="width: 100%" :value="selectValue" @change="onPresetChange">
      <option v-for="o in presetOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
      <option v-if="isCustom" value="custom">自定义（保留原值）</option>
    </select>
  </div>

  <div class="pd-field" data-field="ap-img-fit-scale">
    <span class="pd-label"><span class="pd-label-t">{{ CROP_SCALE_LABEL }}<button type="button" class="pd-help" :data-tip="scaleTip" aria-label="字段说明" /></span>
    <ResetButton v-if="options && base" :target="options" :base="base" prop-key="fitScale" :tip-value="def('ap-img-fit-scale')?.value" :tip-unit="def('ap-img-fit-scale')?.unit" />
  </span>
    <StepperInput :model-value="scale"
      :min="CROP_SCALE_MIN"
      :max="CROP_SCALE_MAX"
      :step="5"
      placeholder="默认 100" @update:model-value="onScaleInput" />
  </div>

  <div class="pd-field" v-for="row in axisRows" :key="row.name" :data-field="fieldKey">
    <span class="pd-label">{{ row.label }}</span>
    <StepperInput :model-value="row.value"
      :min="0"
      :max="100"
      :step="1" @update:model-value="onAxisInput(row.name, $event)" />
  </div>

  <p class="pd-crop-note" v-if="note">{{ note }}</p>

  <p class="pd-crop-note" v-if="preview.isSample">{{ CROP_SAMPLE_NOTE }}</p>

  <div class="pd-crop-preview">
    <img class="pd-crop-thumb" :key="preview.src" :src="preview.src" :alt="preview.isSample ? '示例图' : '原图'" @load="onLoad" @error="forgetSize" />
    <div class="pd-crop-win" v-if="win" :style="winStyle" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  buildCropAnchor,
  CROP_SCALE_LABEL,
  CROP_SCALE_MAX,
  CROP_SCALE_MIN,
  CROP_SAMPLE_NOTE,
  cropAxisFields,
  cropAxisNote,
  cropPresetOptions,
  cropWindow,
  parseCropAnchor,
  propertyTip,
  resolveCropPreview,
  resolveCropTravel,
} from '@worm-vue3-print/core/designer'
import StepperInput from './StepperInput.vue'
import ResetButton from './ResetButton.vue'
import { propertyDefault } from '@worm-vue3-print/core/designer'

/** 注册表纯提示字段：只喂文案 */
const def = (key: string) => propertyDefault(key)

const props = withDefaults(defineProps<{
  /** 注册表 key，用于取字段说明 */
  fieldKey: string
  label: string
  /** 承载对象与出厂值：由宿主传入，本组件不反向依赖 element-factory。
   *  缺省不出图标——表格单元格走自己的整选区写回通道（Task 5），不能复用直改对象的形态。 */
  options?: Record<string, any>
  base?: Record<string, any>
  /** 已解析的图片地址（表达式由宿主求值后传入）；为空则回落内置示例图 */
  src?: string
  /** 模板里的存量值，原样是 CSS 两轴位置 */
  modelValue?: string
  widthMm: number
  heightMm: number
  /** 缩放模式（CSS object-fit 原值，缺省按 contain）：可挪余量按它逐轴结算 */
  fit?: string
  /** 剪裁放大比例（%）：只有剪裁档消费，铺满后把画面再推大这么多 */
  scale?: number
}>(), {
  src: '',
  modelValue: undefined,
  fit: undefined,
  scale: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'update:scale': [value: number | undefined]
}>()

const tip = computed(() => propertyTip(props.fieldKey))
const scaleTip = propertyTip('ap-img-fit-scale')
const preview = computed(() => resolveCropPreview(props.src))

/** 自然尺寸由预览图加载事件带出；拿不到就报「余量未知」，不编造 0 */
const size = ref<{ width: number; height: number } | undefined>(undefined)
function onLoad(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth > 0 && img.naturalHeight > 0) {
    size.value = { width: img.naturalWidth, height: img.naturalHeight }
  }
}
/** 换图与破图都要立刻丢掉上一张的尺寸，否则档位/note/取景窗会停在旧图上说「可挪 X mm」 */
function forgetSize() {
  size.value = undefined
}
watch(() => preview.value.src, forgetSize)

const parsed = computed(() => parseCropAnchor(props.modelValue))
const isCustom = computed(() => parsed.value.kind === 'custom')
const curX = computed(() => parsed.value.kind === 'axes' ? parsed.value.x : 50)
const curY = computed(() => parsed.value.kind === 'axes' ? parsed.value.y : 50)

const box = computed(() => ({
  widthMm: props.widthMm,
  heightMm: props.heightMm,
  naturalWidth: size.value?.width,
  naturalHeight: size.value?.height,
  fit: props.fit,
  scalePct: props.scale,
}))
/** 逐轴余量：剪裁档图铺满框后至少一轴溢出，挪的就是溢出的那一条边；拿不到自然尺寸给 null，不编造 0 */
const travel = computed(() => resolveCropTravel(box.value))

const presetOptions = computed(() => cropPresetOptions(travel.value, curX.value, curY.value))

const selectValue = computed(() => isCustom.value ? 'custom' : `${curX.value},${curY.value}`)

const axisRows = computed(() => cropAxisFields(travel.value, curX.value, curY.value))

const note = computed(() => cropAxisNote(travel.value, isCustom.value))

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

/** 100 与清空都等同「不放大」：撤掉该属性而不是存成 100，存量模板不因此多一个键 */
function onScaleInput(value: number | undefined) {
  emit('update:scale', value !== undefined && value > CROP_SCALE_MIN ? value : undefined)
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
  /* 取景窗的百分比是按这个容器算的：容器必须贴住图本身，撑满面板宽会让红框变成图外的长方形、
     把示例图切成「显示不全」的一块（common 侧 designer.css 由本文件派生，改这里就同步过去） */
  width: fit-content;
  max-width: 100%;
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
