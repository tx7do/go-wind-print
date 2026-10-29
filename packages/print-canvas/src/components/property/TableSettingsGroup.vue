<template>
  <PropertyGroup title="表格设置" icon="Grid" default-expanded group-key="table-settings">
    <form class="pd-form" @submit.prevent>
      <div class="pd-field"><span class="pd-label">列表数据源字段</span>
        <select :value="element.options.dataSource" class="pd-select"
                   style="width: 100%" @change="onSourceChange(($event.target as HTMLSelectElement).value)">
          <option v-for="f in listFieldOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">默认字体</span>
        <ResetButton :target="element.options" :base="factoryOptions" prop-key="tableDefaultFontFamily" :write="resetTo('tableDefaultFontFamily')" />
      </span>
        <FontSelect v-model="element.options.tableDefaultFontFamily" />
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">默认字号 (pt)</span>
        <ResetButton :target="element.options" :base="factoryOptions" prop-key="tableDefaultFontSize" :write="resetTo('tableDefaultFontSize')" />
      </span>
        <StepperInput v-model="element.options.tableDefaultFontSize" :min="5" :max="72" placeholder="默认" />
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">默认文字颜色</span>
        <ResetButton :target="element.options" :base="factoryOptions" prop-key="tableDefaultColor" :write="resetTo('tableDefaultColor')" />
      </span>
        <PresetColorPicker v-model="element.options.tableDefaultColor" />
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">默认内边距 (mm)</span>
        <ResetButton :target="element.options" :base="factoryOptions" prop-key="tableDefaultPadding" :write="resetTo('tableDefaultPadding')" />
      </span>
        <StepperInput v-model="element.options.tableDefaultPadding" :min="0" :max="10" :step="0.5" placeholder="默认" />
      </div>
      <div class="pd-field"><span class="pd-label">列宽 (mm)</span>
        <div v-for="(w, i) in element.options.tableColWidths" :key="i" class="col-width-row">
          <span style="width: 60px">列{{ i + 1 }}</span>
          <StepperInput :model-value="w" :min="5" :max="200" @update:model-value="onColWidthChange(i, $event)" />
        </div>
      </div>
    </form>
  </PropertyGroup>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import PresetColorPicker from '../PresetColorPicker.vue'
import type { RuntimeElement, PrintBusinessField } from '@go-wind/print-core/designer'
import { TABLE_EDIT_KEY } from '../../composables/useTableSelection'
import { syncTableElementSize, createDefaultOptions } from '@go-wind/print-core/designer'
import PropertyGroup from './PropertyGroup.vue'
import StepperInput from './StepperInput.vue'
import FontSelect from './FontSelect.vue'
import ResetButton from './ResetButton.vue'

const props = defineProps<{
  element: RuntimeElement
  fields: PrintBusinessField[]
}>()

const tableEditCtx = inject(TABLE_EDIT_KEY, null)

/** 该元素的出厂 options——表格级默认三项的落点即此处的字面值 */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type))

/** 恢复默认值的写回通道：与手动改值同口径，记一次历史供撤销 */
const resetTo = (key: string) => (value: any) => {
  ;(props.element.options as Record<string, any>)[key] = value
  tableEditCtx?.recordHistory()
}

/** 列表数据源选项：宿主以 fieldType='list' 声明明细列表字段 */
const listFieldOptions = computed(() => {
  return props.fields
    .filter(f => f.fieldType === 'list')
    .map(f => ({ label: f.fieldLabel, value: f.fieldKey }))
})

function onSourceChange(v: string) {
  props.element.options.dataSource = v || undefined
  tableEditCtx?.recordHistory()
}

function onColWidthChange(i: number, v: number | undefined) {
  if (v === undefined) return
  const widths = props.element.options.tableColWidths!
  const maxW = tableEditCtx?.maxTableWidth.value ?? Infinity
  const othersW = widths.reduce((s, w, idx) => idx === i ? s : s + w, 0)
  if (othersW + v > maxW) {
    const clamped = Math.max(5, Math.round((maxW - othersW) * 10) / 10)
    alert(`表格总宽不能超过打印范围宽度 ${maxW}mm，列${i + 1} 已调整为 ${clamped}mm`)
    widths[i] = clamped
  } else {
    widths[i] = v
  }
  syncTableElementSize(props.element.options)
  tableEditCtx?.recordHistory()
}
</script>

<style scoped>
.col-width-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  width: 100%;
}
</style>