<!-- 条形码/二维码配置分组：码制/条宽/显示文本/字号/纠错级别 + 自定义设置（缩放模式/最大宽高） -->
<template>
  <PropertyGroup title="条码设置" icon="Postcard" default-expanded group-key="code">
    <form class="pd-form" @submit.prevent>
      <template v-if="isBarcode">
        <div class="pd-field" v-show="showItem('cd-type')"><span class="pd-label">码制</span>
          <select class="pd-select" :value="barcodeType" @change="onBarcodeTypeChange">
            <option value="CODE128">CODE128（通用）</option>
            <option value="EAN13">EAN13（商品码）</option>
            <option value="EAN8">EAN8</option>
            <option value="UPC">UPC</option>
            <option value="CODE39">CODE39</option>
            <option value="ITF14">ITF14</option>
          </select>
        </div>
        <div class="pd-field" v-show="showItem('cd-dpi')"><span class="pd-label"><span class="pd-label-t">打印机分辨率</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="printerDpi" :tip-value="def('cd-dpi')?.value" :tip-unit="def('cd-dpi')?.unit" @change="emitChange()" />
        </span>
          <select class="pd-select" :value="dpiValue" @change="onDpiChange">
            <option value="">不指定（按条宽渲染）</option>
            <option value="203">203 dpi（8 点/mm）</option>
            <option value="300">300 dpi（11.8 点/mm）</option>
            <option value="600">600 dpi（23.6 点/mm）</option>
          </select>
        </div>
        <p class="pd-hint" v-show="showItem('cd-dpi')">填写后条宽吸附到整数打印点（消除出纸「条宽忽宽忽窄」）：条码先按条宽渲染，可用宽度够就原样落纸，不够才整体等比缩小</p>
        <div class="pd-field" v-show="showItem('cd-bar-width')"><span class="pd-label"><span class="pd-label-t">条宽（倍率）</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="barWidth" :tip-value="def('cd-bar-width')?.value" :tip-unit="def('cd-bar-width')?.unit" @change="emitChange()" />
        </span>
          <StepperInput :model-value="element.options.barWidth ?? 2"
            :min="2"
            :max="8"
            :step="0.5"
            @update:model-value="element.options.barWidth = $event; emitChange()" />
        </div>
        <p class="pd-hint" v-show="showItem('cd-bar-width')">{{ barWidthHint }}</p>
        <div class="pd-field" v-show="showItem('cd-bar-quiet-zone')"><span class="pd-label"><span class="pd-label-t">静区 (模块)<button type="button" class="pd-help" :data-tip="barQuietTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="barQuietZone" :tip-value="def('cd-bar-quiet-zone')?.value" :tip-unit="def('cd-bar-quiet-zone')?.unit" @change="emitChange()" />
        </span>
          <StepperInput :model-value="element.options.barQuietZone"
            :min="0"
            :max="20"
            placeholder="默认 10"
            @update:model-value="element.options.barQuietZone = $event ?? undefined; emitChange()" />
        </div>
        <div class="pd-field" v-show="showItem('cd-bar-height')"><span class="pd-label"><span class="pd-label-t">条高 (mm)<button type="button" class="pd-help" :data-tip="barHeightTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="barHeight" :tip-value="def('cd-bar-height')?.value" :tip-unit="def('cd-bar-height')?.unit" @change="emitChange()" />
        </span>
          <StepperInput :model-value="element.options.barHeight"
            :min="1"
            :max="100"
            placeholder="默认 30 模块"
            @update:model-value="element.options.barHeight = $event ?? undefined; emitChange()" />
        </div>
        <div class="pd-field" v-show="showItem('cd-show-text')"><span class="pd-label"><span class="pd-label-t">显示文本</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="hideTitle" :tip-value="def('cd-show-text')?.value" :tip-unit="def('cd-show-text')?.unit" @change="emitChange()" />
        </span>
          <input :checked="element.options.hideTitle !== true" type="checkbox" class="pd-switch"
            @input="element.options.hideTitle = ($event.target as HTMLInputElement).checked ? undefined : true; emitChange()" />
        </div>
        <div class="pd-field" v-show="showItem('cd-font-size')"><span class="pd-label"><span class="pd-label-t">文本字号（相对条高，条高为 30）</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fontSize" :tip-value="def('cd-font-size')?.value" :tip-unit="def('cd-font-size')?.unit" @change="emitChange()" />
        </span>
          <StepperInput :model-value="element.options.fontSize"
            :min="5"
            :max="24"
            placeholder="默认 10"
            @update:model-value="element.options.fontSize = $event ?? undefined; emitChange()" />
        </div>
      </template>

      <template v-else-if="isQrcode">
        <div class="pd-field" v-show="showItem('cd-ec-level')"><span class="pd-label"><span class="pd-label-t">纠错级别</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="qrCodeLevel" :tip-value="def('cd-ec-level')?.value" :tip-unit="def('cd-ec-level')?.unit" @change="emitChange()" />
        </span>
          <select class="pd-select" :value="String(element.options.qrCodeLevel ?? 'M')"
            @change="element.options.qrCodeLevel = ($event.target as HTMLSelectElement).value; emitChange()">
            <option value="L">L（最低，容量大）</option>
            <option value="M">M（推荐）</option>
            <option value="Q">Q</option>
            <option value="H">H（最高）</option>
          </select>
        </div>
        <div class="pd-field" v-show="showItem('cd-quiet-zone')"><span class="pd-label"><span class="pd-label-t">静区 (模块)<button type="button" class="pd-help" :data-tip="quietTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="qrQuietZone" :tip-value="def('cd-quiet-zone')?.value" :tip-unit="def('cd-quiet-zone')?.unit" @change="emitChange()" />
        </span>
          <StepperInput :model-value="element.options.qrQuietZone"
            :min="0"
            :max="8"
            placeholder="默认 0"
            @update:model-value="element.options.qrQuietZone = $event ?? undefined; emitChange()" />
        </div>
      </template>

      <h3 class="pd-divider">自定义设置</h3>
      <p class="pd-hint" v-if="isBarcode">条码尺寸由「条宽」与「打印机分辨率」结算：宽度足够时按条宽原样落纸，不足时整体等比缩小；拉伸会把条宽变成非整数，故条形码不提供缩放模式，可用「最大宽高」限制上限。要放大条码：先加条宽倍率，再收窄静区（左右白边会换成条宽），必要时关掉显示文本以让出文本区高度</p>
      <div class="pd-field" v-if="!isBarcode" v-show="showItem('cd-fit')"><span class="pd-label"><span class="pd-label-t">缩放模式</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fit" :tip-value="def('cd-fit')?.value" :tip-unit="def('cd-fit')?.unit" @change="emitChange()" />
        </span>
        <select class="pd-select" :value="element.options.fit || 'contain'" @change="onFitChange">
          <option v-for="o in IMAGE_FIT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="pd-field" v-show="showItem('cd-max-width')"><span class="pd-label"><span class="pd-label-t">最大宽度 (mm)</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="maxWidth" :tip-value="def('cd-max-width')?.value" :tip-unit="def('cd-max-width')?.unit" @change="emitChange()" />
        </span>
        <StepperInput :model-value="element.options.maxWidth"
          :min="1"
          :max="200"
          placeholder="默认"
          @update:model-value="element.options.maxWidth = $event ?? undefined; emitChange()" />
      </div>
      <div class="pd-field" v-show="showItem('cd-max-height')"><span class="pd-label"><span class="pd-label-t">最大高度 (mm)</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="maxHeight" :tip-value="def('cd-max-height')?.value" :tip-unit="def('cd-max-height')?.unit" @change="emitChange()" />
        </span>
        <StepperInput :model-value="element.options.maxHeight"
          :min="1"
          :max="200"
          placeholder="默认"
          @update:model-value="element.options.maxHeight = $event ?? undefined; emitChange()" />
      </div>
    </form>
  </PropertyGroup>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { propertyTip, IMAGE_FIT_OPTIONS, barcodeBarWidthRecommendText } from '@worm-vue3-print/core/designer'
import { createDefaultOptions, propertyDefault } from '@worm-vue3-print/core/designer'
import PropertyGroup from './PropertyGroup.vue'
import StepperInput from './StepperInput.vue'
import ResetButton from './ResetButton.vue'

/** 静区说明：文案单一来源在 core 的属性注册表，与单元格台、common 宿主共用同一条 */
const quietTip = propertyTip('cd-quiet-zone')
/** 条形码静区（左右白边）说明：与二维码同口径走注册表，避免两套宿主各写一份 */
const barQuietTip = propertyTip('cd-bar-quiet-zone')
/** 条高说明：粒度与「条宽优先的让位规则」都在这条文案里，画布所见即实际落纸，不另挂常驻提示 */
const barHeightTip = propertyTip('cd-bar-height')

const props = defineProps<{
  element: RuntimeElement
  matchedKeys?: Set<string>
  searching?: boolean
}>()

/** 该元素类型的出厂 options——「恢复默认值」的落点全部由它派生 */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type))
/** 注册表纯提示字段：只喂文案，不参与判定 */
const def = (key: string) => propertyDefault(key)

const emit = defineEmits<{ change: [] }>()

const isBarcode = computed(() => props.element.printElementType.type === 'barcode')
const isQrcode = computed(() => props.element.printElementType.type === 'qrcode')

/**
 * 码制归一化为大写的 jsbarcode 格式名。
 * jsbarcode 对格式名大小写不敏感，但存量模板存有小写（元素工厂缺省 `code128`），
 * 不归一化会导致下拉框匹配不到选项、显示为空。
 */
const barcodeType = computed(() => (props.element.options.barcodeType || 'CODE128').toUpperCase())

/** 打印机分辨率：'' 表示不启用点对齐（保持原有按框缩放行为） */
const dpiValue = computed(() => (props.element.options.printerDpi ? String(props.element.options.printerDpi) : ''))
const hasPrinterDpi = computed(() => !!props.element.options.printerDpi)
/** 点对齐只作用于条形码（二维码模块数固定，尺寸由 fit/最大宽高决定） */
const dotAligned = computed(() => isBarcode.value && hasPrinterDpi.value)

/**
 * 条宽提示：结算口径 + 选了打印机分辨率后的推荐倍率。
 * 推荐只进文案、不回写 barWidth——用户要的是给参考，不是替他们决定。
 */
const barWidthHint = computed(() => {
  const base = dotAligned.value
    ? '已设置打印机分辨率：条宽会被吸附到最近的整数打印点（DPI 优先于毫米值），元素框放不下时整体等比缩小'
    : '热敏/针式打印建议 3 及以上：决定条码的落纸尺寸，条越粗出纸后条宽越稳定'
  const rec = barcodeBarWidthRecommendText(props.element.options.printerDpi, props.element.options.barWidth)
  return rec ? `${base}。${rec}` : base
})

function onDpiChange(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value)
  props.element.options.printerDpi = value > 0 ? value : undefined
  emitChange()
}

function onBarcodeTypeChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  props.element.options.barcodeType = value === 'CODE128' ? undefined : value
  emitChange()
}

function onFitChange(e: Event) {
  props.element.options.fit = (e.target as HTMLSelectElement).value || undefined
  emitChange()
}

function showItem(key: string): boolean {
  if (!props.searching) {
    return true
  }
  return props.matchedKeys?.has(key) ?? true
}

function emitChange() {
  emit('change')
}
</script>
