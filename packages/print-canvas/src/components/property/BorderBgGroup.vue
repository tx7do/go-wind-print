<template>
  <PropertyGroup title="边框与背景" icon="Picture" default-expanded group-key="border-bg">
    <form class="pd-form" @submit.prevent>
      <div class="border-row">
        <div class="pd-field" v-show="showItem('bb-border-width')"><span class="pd-label"><span class="pd-label-t">边框宽度</span>
          <ResetButton :target="element.options" :base="factoryOptions" prop-key="borderWidth" :tip-value="def('bb-border-width')?.value" :tip-unit="def('bb-border-width')?.unit" />
        </span>
          <StepperInput v-model="element.options.borderWidth"
            :min="0"
            :max="20"
            :step="0.25" />
        </div>
        <div class="pd-field" v-show="showItem('bb-border-color')"><span class="pd-label"><span class="pd-label-t">边框颜色</span>
          <ResetButton :target="element.options" :base="factoryOptions" prop-key="borderColor" :tip-value="def('bb-border-color')?.value" :tip-unit="def('bb-border-color')?.unit" />
        </span>
          <PresetColorPicker v-model="element.options.borderColor" />
        </div>
      </div>
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
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { createDefaultOptions, propertyDefault } from '@worm-vue3-print/core/designer'
import PresetColorPicker from '../PresetColorPicker.vue'
import PropertyGroup from './PropertyGroup.vue'
import StepperInput from './StepperInput.vue'
import ResetButton from './ResetButton.vue'

const props = defineProps<{
  element: RuntimeElement
  matchedKeys?: Set<string>
  searching?: boolean
}>()

/** 重置落点：该元素类型的出厂值（未预置的键 ⇒ undefined ⇒ 写回即删键） */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type))

/** 注册表纯提示字段：只喂文案 */
const def = (key: string) => propertyDefault(key)

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
}</style>