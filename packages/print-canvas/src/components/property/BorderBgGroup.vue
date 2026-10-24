<template>
  <PropertyGroup title="边框与背景" icon="Picture" default-expanded group-key="border-bg">
    <form class="pd-form" @submit.prevent>
      <div class="pd-field" v-show="showItem('bb-border-style')"><span class="pd-label">线型</span>
        <select class="pd-select" :value="display.style === 'mixed' ? '' : display.style"
          @change="patchField('borderStyle', ($event.target as HTMLSelectElement).value)">
          <option v-if="display.style === 'mixed'" value="" disabled>混合</option>
          <option v-for="s in BORDER_LINE_STYLES" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="border-row">
        <div class="pd-field" v-show="showItem('bb-border-width')"><span class="pd-label"><span class="pd-label-t">边框宽度</span>
          <ResetButton :target="element.options" :base="factoryOptions" prop-key="borderWidth" :tip-value="def('bb-border-width')?.value" :tip-unit="def('bb-border-width')?.unit" />
        </span>
          <StepperInput :model-value="display.width === 'mixed' ? undefined : display.width"
            :placeholder="display.width === 'mixed' ? '混合' : undefined"
            :min="0"
            :max="20"
            :step="0.25"
            @update:model-value="patchField('borderWidth', $event)" />
        </div>
        <div class="pd-field" v-show="showItem('bb-border-color')"><span class="pd-label"><span class="pd-label-t">边框颜色</span>
          <ResetButton :target="element.options" :base="factoryOptions" prop-key="borderColor" :tip-value="def('bb-border-color')?.value" :tip-unit="def('bb-border-color')?.unit" />
        </span>
          <PresetColorPicker :model-value="display.color === 'mixed' ? undefined : display.color"
            @update:model-value="patchField('borderColor', $event)" />
        </div>
      </div>
      <!-- 分边只有「画自身本体的形状之外」的元素才有意义：rect/oval/hline/vline/table 的边框是本体，写 borders 不出效果 -->
      <template v-if="canEdgeBorder">
        <div class="pd-button-group border-presets">
          <button type="button" class="pd-button small" @click="applyPreset('all')">全部</button>
          <button type="button" class="pd-button small" @click="applyPreset('outer')">外侧</button>
          <button type="button" class="pd-button small" disabled>内部</button>
          <button type="button" class="pd-button small" @click="applyPreset('none')">无</button>
        </div>
        <div class="pd-checkbox-group">
          <label class="pd-checkbox" v-for="e in BORDER_EDGES" :key="e.value">
            <input type="checkbox" :checked="edgeOn(e.value)" @change="toggleEdge(e.value)"><span>{{ e.label }}</span>
          </label>
        </div>
        <p class="pd-hint">{{ ELEMENT_BORDER_APPLY_HINT }}</p>
      </template>
      <div class="pd-field" v-show="showItem('bb-bg-color')"><span class="pd-label"><span class="pd-label-t">背景色</span>
        <ResetButton :target="element.options" :base="factoryOptions" prop-key="backgroundColor" :tip-value="def('bb-bg-color')?.value" :tip-unit="def('bb-bg-color')?.unit" />
      </span>
        <PresetColorPicker v-model="element.options.backgroundColor" />
      </div>
    </form>
  </PropertyGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  BorderPreset, ElementBorderFieldKey, ElementBorderSide, RuntimeElement,
} from '@worm-vue3-print/core/designer'
import {
  acceptsElementBorder, applyElementBorderPreset, effectiveElementBorderSpec, elementBorderEdgeVisible,
  resolveElementBorderDisplay, setElementBorderEdgeVisible, setElementBorderField, BORDER_LINE_STYLES,
  ELEMENT_BORDER_APPLY_HINT,
  createDefaultOptions, propertyDefault,
} from '@worm-vue3-print/core/designer'
import PresetColorPicker from '../PresetColorPicker.vue'
import PropertyGroup from './PropertyGroup.vue'
import StepperInput from './StepperInput.vue'
import ResetButton from './ResetButton.vue'

const props = defineProps<{
  element: RuntimeElement
  matchedKeys?: Set<string>
  searching?: boolean
}>()

/** 预设与单边写完要进历史（与「条码设置」组同口径，由属性面板收口） */
const emit = defineEmits<{ (e: 'change'): void }>()

const BORDER_EDGES: { value: ElementBorderSide; label: string }[] = [
  { value: 'top', label: '上' }, { value: 'right', label: '右' },
  { value: 'bottom', label: '下' }, { value: 'left', label: '左' },
]

/** 该元素是否可携带元素级边框（与出纸 resolveElementBorder 的排除表同源） */
const canEdgeBorder = computed(() => acceptsElementBorder(props.element.printElementType?.type))

/** 重置落点：该元素类型的出厂值（未预置的键 ⇒ undefined ⇒ 写回即删键） */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type))

/** 注册表纯提示字段：只喂文案 */
const def = (key: string) => propertyDefault(key)

/** 三行显示「当前生效规格」：整圈生效取整圈，整圈没生效取可见分边的一致值（方案 B） */
const display = computed(() => resolveElementBorderDisplay(props.element.options))

/** 改任一行都按新规格重铺四边并清掉单边覆盖；元素本来没框时只写这一键 */
function patchField(key: ElementBorderFieldKey, value: number | string | undefined) {
  setElementBorderField(props.element.options, key, value)
  emit('change')
}

/** 预设与单边都拿当前生效规格当源：分边做的框不会被缺省档顶成 0.75pt */
function applyPreset(preset: BorderPreset) {
  applyElementBorderPreset(props.element.options, preset, effectiveElementBorderSpec(props.element.options))
  emit('change')
}

function edgeOn(side: ElementBorderSide): boolean {
  return elementBorderEdgeVisible(props.element.options, side)
}

/** 撤一边时整圈会被展开成其余三条分边（否则整圈照样盖住那条边，点了没反应） */
function toggleEdge(side: ElementBorderSide) {
  setElementBorderEdgeVisible(props.element.options, side, !edgeOn(side))
  emit('change')
}

function showItem(key: string): boolean {
  if (!props.searching) {
    return true
  }
  return props.matchedKeys?.has(key) ?? true
}
</script>

<style scoped>
.border-row {
  display: flex;
  gap: 10px;
}
.border-row .pd-field {
  flex: 1;
  min-width: 0;
}
.border-presets {
  margin-bottom: 8px;
}
</style>
