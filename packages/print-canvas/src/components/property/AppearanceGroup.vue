<template>
  <PropertyGroup title="外观" icon="Brush" default-expanded group-key="appearance">
    <form class="pd-form" @submit.prevent>
      <template v-if="isTextType">
        <div class="pd-field" v-show="showItem('ap-font-family')"><span class="pd-label"><span class="pd-label-t">字体</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fontFamily" :tip-value="def('ap-font-family')?.value" :tip-unit="def('ap-font-family')?.unit" />
</span>
          <FontSelect v-model="element.options.fontFamily" />
        </div>
        <div class="pd-field" v-show="showItem('ap-font-size')"><span class="pd-label"><span class="pd-label-t">字体大小</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fontSize" :tip-value="def('ap-font-size')?.value" :tip-unit="def('ap-font-size')?.unit" />
</span>
          <StepperInput v-model="element.options.fontSize"
            :min="8"
            :max="72" />
        </div>
        <div class="pd-field" v-show="showItem('ap-font-weight')"><span class="pd-label"><span class="pd-label-t">字体粗细</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fontWeight" :tip-value="def('ap-font-weight')?.value" :tip-unit="def('ap-font-weight')?.unit" />
</span>
          <select class="pd-select" v-model="element.options.fontWeight" style="width: 100%">
            <option value="normal">正常</option>
            <option value="bold">粗体</option>
            <option value="bolder">更粗</option>
            <option value="lighter">细体</option>
          </select>
        </div>
        <div class="pd-field" v-show="showItem('ap-align')"><span class="pd-label"><span class="pd-label-t">对齐</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="textAlign" :tip-value="def('ap-align')?.value" :tip-unit="def('ap-align')?.unit" />
</span>
          <div class="pd-radio-group" role="radiogroup">
            <label class="pd-radio"><input type="radio" v-model="element.options.textAlign" value="left"><span>左</span></label>
            <label class="pd-radio"><input type="radio" v-model="element.options.textAlign" value="center"><span>中</span></label>
            <label class="pd-radio"><input type="radio" v-model="element.options.textAlign" value="right"><span>右</span></label>
            <label class="pd-radio"><input type="radio" v-model="element.options.textAlign" value="justify"><span>两端</span></label>
          </div>
        </div>
        <div class="pd-field" v-show="showItem('ap-vertical-align')"><span class="pd-label"><span class="pd-label-t">垂直对齐</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="verticalAlign" :tip-value="def('ap-vertical-align')?.value" :tip-unit="def('ap-vertical-align')?.unit" />
</span>
          <div class="pd-radio-group" role="radiogroup">
            <label class="pd-radio"><input type="radio" v-model="element.options.verticalAlign" value="top"><span>顶</span></label>
            <label class="pd-radio"><input type="radio" v-model="element.options.verticalAlign" value="middle"><span>中</span></label>
            <label class="pd-radio"><input type="radio" v-model="element.options.verticalAlign" value="bottom"><span>底</span></label>
          </div>
        </div>
        <div class="color-row">
          <div class="pd-field" v-show="showItem('ap-color')"><span class="pd-label"><span class="pd-label-t">颜色</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="color" :tip-value="def('ap-color')?.value" :tip-unit="def('ap-color')?.unit" />
</span>
            <PresetColorPicker v-model="element.options.color" />
          </div>
          <div class="pd-field" v-show="showItem('ap-bg-color')"><span class="pd-label"><span class="pd-label-t">背景色</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="backgroundColor" :tip-value="def('ap-bg-color')?.value" :tip-unit="def('ap-bg-color')?.unit" />
</span>
            <PresetColorPicker v-model="element.options.backgroundColor" />
          </div>
        </div>
        <div class="pd-field" v-show="showItem('ap-line-height')"><span class="pd-label"><span class="pd-label-t">行高</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="lineHeight" :tip-value="def('ap-line-height')?.value" :tip-unit="def('ap-line-height')?.unit" />
</span>
          <StepperInput v-model="element.options.lineHeight"
            :min="0"
            :max="100" />
        </div>
        <div class="pd-field" v-show="showItem('ap-letter-spacing')"><span class="pd-label"><span class="pd-label-t">字间距</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="letterSpacing" :tip-value="def('ap-letter-spacing')?.value" :tip-unit="def('ap-letter-spacing')?.unit" />
</span>
          <StepperInput v-model="element.options.letterSpacing"
            :min="0"
            :max="20"
            :step="0.5" />
        </div>
        <div class="pd-field" v-show="showItem('ap-text-fit')"><span class="pd-label"><span class="pd-label-t">文字溢出</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="textFit" :tip-value="def('ap-text-fit')?.value" :tip-unit="def('ap-text-fit')?.unit" />
</span>
          <select class="pd-select" :value="textFit" style="width: 100%" @change="onTextFitChange">
            <option value="clip">截断</option>
            <option value="shrink">自动缩小</option>
            <option value="autoHeight">自适应行高</option>
          </select>
        </div>
        <div class="pd-field" v-if="textFit === 'shrink'" v-show="showItem('ap-shrink-min')"><span class="pd-label"><span class="pd-label-t">最小字号 (pt)</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="shrinkMinFontSize" :tip-value="def('ap-shrink-min')?.value" :tip-unit="def('ap-shrink-min')?.unit" />
</span>
          <StepperInput :model-value="element.options.shrinkMinFontSize"
            :min="1"
            :max="72"
            :step="0.5"
            placeholder="默认 6"
            @update:model-value="element.options.shrinkMinFontSize = $event ?? undefined" />
        </div>
        <div class="pd-field" v-if="isLongText" v-show="showItem('ap-long-text-indent')"><span class="pd-label"><span class="pd-label-t">首行缩进 (字符)<button type="button" class="pd-help" :data-tip="indentTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="longTextIndent" :tip-value="def('ap-long-text-indent')?.value" :tip-unit="def('ap-long-text-indent')?.unit" />
</span>
          <StepperInput v-model="element.options.longTextIndent"
            :min="0"
            :max="10"
            placeholder="默认 0" />
        </div>
        <div class="pd-field" v-show="showItem('ap-word-wrap')"><span class="pd-label"><span class="pd-label-t">自动换行</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="wordWrap" :tip-value="def('ap-word-wrap')?.value" :tip-unit="def('ap-word-wrap')?.unit" />
</span>
          <input :checked="element.options.wordWrap !== false" type="checkbox" class="pd-switch"
            @input="element.options.wordWrap = ($event.target as HTMLInputElement).checked ? undefined : false" />
        </div>
      </template>

      <template v-if="isImageType">
        <div class="pd-field" v-show="showItem('ap-img-fit')"><span class="pd-label"><span class="pd-label-t">缩放模式<button type="button" class="pd-help" :data-tip="fitTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fit" :tip-value="def('ap-img-fit')?.value" :tip-unit="def('ap-img-fit')?.unit" />
</span>
          <select class="pd-select" v-model="element.options.fit" style="width: 100%">
            <option v-for="o in IMAGE_FIT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="element.options.fit === 'cover'" v-show="showItem('ap-img-object-position')">
          <CropAnchorField field-key="ap-img-object-position"
            label="裁剪锚点"
            :options="element.options"
            :base="factoryOptions"
            :src="imageSrc"
            :fit="element.options.fit"
            :width-mm="element.options.width || 0"
            :height-mm="element.options.height || 0"
            :scale="element.options.fitScale"
            :model-value="element.options.objectPosition"
            @update:model-value="element.options.objectPosition = $event"
            @update:scale="element.options.fitScale = $event" />
        </div>
      </template>
      <p class="pd-empty" v-if="!isTextType && !isImageType && !isTableType">当前元素不支持外观设置</p>
    </form>
  </PropertyGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { resolveElementTextFit, propertyTip, IMAGE_FIT_OPTIONS, evaluateTemplate, DEFAULT_DEMO_DATA, type TextFit } from '@worm-vue3-print/core/designer'
import { createDefaultOptions, propertyDefault } from '@worm-vue3-print/core/designer'
import PresetColorPicker from '../PresetColorPicker.vue'
import PropertyGroup from './PropertyGroup.vue'
import StepperInput from './StepperInput.vue'
import FontSelect from './FontSelect.vue'
import CropAnchorField from './CropAnchorField.vue'
import ResetButton from './ResetButton.vue'

const props = defineProps<{
  element: RuntimeElement
  isTextType: boolean
  matchedKeys?: Set<string>
  searching?: boolean
}>()

function showItem(key: string): boolean {
  if (!props.searching) {
    return true
  }
  return props.matchedKeys?.has(key) ?? true
}

const isTableType = computed(() => {
  return props.element.printElementType.type === 'table'
})

const isLongText = computed(() => props.element.printElementType.type === 'longText')

/** 该元素类型的出厂 options——所有「恢复默认值」的落点都从这里派生 */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type))
/** 注册表的纯提示字段：只喂文案，不参与判定 */
const def = (key: string) => propertyDefault(key)
const isImageType = computed(() => props.element.printElementType.type === 'image')
const indentTip = propertyTip('ap-long-text-indent')
const fitTip = propertyTip('ap-img-fit')

/** 示意图取设计态已解析地址：{字段} 表达式用 demo 数据求值，与 ImageElement 的 designMode 分支同口径 */
const imageSrc = computed(() => {
  const raw = String(props.element.options.src ?? '')
  return raw.includes('{') ? String(evaluateTemplate(raw, DEFAULT_DEMO_DATA)) : raw
})

/** 溢出形式：未配置时按元素类型取默认（文本=截断、长文本=自适应行高） */
const textFit = computed<TextFit>(() =>
  resolveElementTextFit(props.element.printElementType.type || 'text', props.element.options),
)

function onTextFitChange(e: Event) {
  props.element.options.textFit = (e.target as HTMLSelectElement).value as TextFit
}
</script>

<style scoped>
.color-row {
  display: flex;
  gap: 12px;
}
.color-row > .pd-field {
  flex: 1 1 0;
  min-width: 0;
}</style>