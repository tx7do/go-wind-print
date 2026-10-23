<!-- 表格单元格分组：格式化/样式/边框/合并拆分 -->
<template>
  <PropertyGroup title="单元格" icon="Menu" default-expanded group-key="table-cell">
    <form class="pd-form" @submit.prevent>
      <div class="pd-field"><span class="pd-label">单元格类型</span>
        <div class="pd-radio-group" role="radiogroup">
          <label class="pd-radio"><input type="radio" value="text" :checked="(mainCell.cellType || 'text') === 'text'" @change="onCellTypeChange(($event.target as HTMLInputElement).value)"><span>文本</span></label>
          <label class="pd-radio"><input type="radio" value="barcode" :checked="mainCell.cellType === 'barcode'" @change="onCellTypeChange(($event.target as HTMLInputElement).value)"><span>条形码</span></label>
          <label class="pd-radio"><input type="radio" value="qrcode" :checked="mainCell.cellType === 'qrcode'" @change="onCellTypeChange(($event.target as HTMLInputElement).value)"><span>二维码</span></label>
          <label class="pd-radio"><input type="radio" value="image" :checked="mainCell.cellType === 'image'" @change="onCellTypeChange(($event.target as HTMLInputElement).value)"><span>图片</span></label>
        </div>
      </div>

      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label">码制</span>
        <select :value="mainCell.barcodeType || 'CODE128'" class="pd-select" @change="write(c => { c.barcodeType = ($event.target as HTMLSelectElement).value || undefined })">
          <option value="CODE128">CODE128（通用）</option>
          <option value="EAN13">EAN13（商品码）</option>
          <option value="EAN8">EAN8</option>
          <option value="UPC">UPC</option>
          <option value="CODE39">CODE39</option>
          <option value="ITF14">ITF14</option>
        </select>
      </div>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">显示文本</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="showBarcodeText" :tip-override="CELL_TIP" :write="(v) => write(c => { c.showBarcodeText = v })" />
        </span>
        <input :checked="mainCell.showBarcodeText !== false" type="checkbox" class="pd-switch" @input="write(c => { c.showBarcodeText = !!($event.target as HTMLInputElement).checked })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">条宽（倍率）</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="barWidth" :tip-override="CELL_TIP" :write="(v) => write(c => { c.barWidth = v })" />
        </span>
        <StepperInput :model-value="mainCell.barWidth ?? 2"
          :min="2"
          :max="8"
          :step="0.5"
          @update:model-value="write(c => { c.barWidth = $event })" />
      </div>
      <p class="pd-hint" v-if="isBarcodeCell">{{ barWidthHint }}</p>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">静区 (模块)<button type="button" class="pd-help" :data-tip="barQuietTip" aria-label="字段说明" /></span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="barQuietZone" :tip-override="CELL_TIP" :write="(v) => write(c => { c.barQuietZone = v })" />
        </span>
        <StepperInput :model-value="mainCell.barQuietZone"
          :min="0"
          :max="20"
          placeholder="默认 10"
          @update:model-value="write(c => { c.barQuietZone = $event ?? undefined })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">条高 (mm)<button type="button" class="pd-help" :data-tip="barHeightTip" aria-label="字段说明" /></span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="barHeight" :tip-override="CELL_TIP" :write="(v) => write(c => { c.barHeight = v })" />
        </span>
        <StepperInput :model-value="mainCell.barHeight"
          :min="1"
          :max="100"
          placeholder="默认 30 模块"
          @update:model-value="write(c => { c.barHeight = $event ?? undefined })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">文本字号（相对条高，条高为 30）</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="barFontSize" :tip-override="CELL_TIP" :write="(v) => write(c => { c.barFontSize = v })" />
        </span>
        <StepperInput :model-value="mainCell.barFontSize ?? 10"
          :min="5"
          :max="24"
          placeholder="默认 10"
          @update:model-value="write(c => { c.barFontSize = $event ?? undefined })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell"><span class="pd-label"><span class="pd-label-t">打印机分辨率</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="printerDpi" :tip-override="CELL_TIP" :write="(v) => write(c => { c.printerDpi = v })" />
        </span>
        <select :value="mainCell.printerDpi ? String(mainCell.printerDpi) : ''" class="pd-select" @change="onPrinterDpiChange(($event.target as HTMLSelectElement).value)">
          <option value="">不指定（按条宽渲染）</option>
          <option value="203">203 dpi（8 点/mm）</option>
          <option value="300">300 dpi（11.8 点/mm）</option>
          <option value="600">600 dpi（23.6 点/mm）</option>
        </select>
      </div>
      <p class="pd-hint" v-if="isBarcodeCell">填写后条宽吸附到整数打印点（消除出纸「条宽忽宽忽窄」）：条码先按条宽渲染，可用宽度够就原样落纸，不够才整体等比缩小</p>
      <div class="pd-field" v-if="isQrcodeCell"><span class="pd-label"><span class="pd-label-t">纠错级别</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="qrCodeLevel" :tip-override="CELL_TIP" :write="(v) => write(c => { c.qrCodeLevel = v })" />
        </span>
        <select :value="mainCell.qrCodeLevel || 'M'" class="pd-select" @change="write(c => { c.qrCodeLevel = ($event.target as HTMLSelectElement).value || undefined })">
          <option value="L">L（最低，容量大）</option>
          <option value="M">M（推荐）</option>
          <option value="Q">Q</option>
          <option value="H">H（最高）</option>
        </select>
      </div>

      <div class="pd-field" v-if="isQrcodeCell"><span class="pd-label"><span class="pd-label-t">静区 (模块)<button type="button" class="pd-help" :data-tip="quietTip" aria-label="字段说明" /></span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="qrQuietZone" :tip-override="CELL_TIP" :write="(v) => write(c => { c.qrQuietZone = v })" />
        </span>
        <StepperInput :model-value="mainCell.qrQuietZone"
          :min="0"
          :max="8"
          placeholder="默认 0" @update:model-value="write(c => { c.qrQuietZone = $event ?? undefined })" />
      </div>

      <p class="pd-hint" v-if="isBarcodeCell">单元格条码尺寸由「条宽」与「打印机分辨率」结算：可用宽度足够时按条宽原样落纸，不足时整体等比缩小；拉伸会把条宽变成非整数，故条形码不提供缩放模式，可用「最大宽高」限制上限。要放大条码：先加条宽倍率，再收窄静区（左右白边会换成条宽），必要时关掉显示文本以让出文本区高度</p>
      <div class="pd-field" v-if="isQrcodeCell || isImageCell"><span class="pd-label"><span class="pd-label-t">缩放模式</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="fit" :tip-override="CELL_TIP" :write="(v) => write(c => { c.fit = v })" />
        </span>
        <select :value="mainCell.fit || 'contain'" class="pd-select" @change="write(c => { c.fit = ($event.target as HTMLSelectElement).value as any })">
          <option v-for="o in IMAGE_FIT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <div class="pd-cell-anchor" v-if="isImageCell && mainCell.fit === 'cover'">
        <CropAnchorField field-key="ap-img-object-position"
          label="裁剪锚点"
          :options="mainCell" :base="CELL_FACTORY" :tip-override="CELL_TIP"
          :write-anchor="(v) => write(c => { c.objectPosition = v })"
          :write-scale="(v) => write(c => { c.fitScale = v })"
          :src="cellImageSrc"
          :fit="mainCell.fit"
          :width-mm="cellBoxMm.width"
          :height-mm="cellBoxMm.height"
          :scale="mainCell.fitScale"
          :model-value="mainCell.objectPosition"
          @update:model-value="write(c => { c.objectPosition = $event })"
          @update:scale="write(c => { c.fitScale = $event })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell || isQrcodeCell || isImageCell"><span class="pd-label"><span class="pd-label-t">最大宽度 (mm)</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="maxWidth" :tip-override="CELL_TIP" :write="(v) => write(c => { c.maxWidth = v })" />
        </span>
        <StepperInput :model-value="mainCell.maxWidth"
          :min="1"
          :max="200"
          placeholder="默认" @update:model-value="write(c => { c.maxWidth = $event ?? undefined })" />
      </div>
      <div class="pd-field" v-if="isBarcodeCell || isQrcodeCell || isImageCell"><span class="pd-label"><span class="pd-label-t">最大高度 (mm)</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="maxHeight" :tip-override="CELL_TIP" :write="(v) => write(c => { c.maxHeight = v })" />
        </span>
        <StepperInput :model-value="mainCell.maxHeight"
          :min="1"
          :max="200"
          placeholder="默认" @update:model-value="write(c => { c.maxHeight = $event ?? undefined })" />
      </div>

      <div class="pd-field"><span class="pd-label">内容</span>
        <input :value="mainCell.formatter || ''" class="pd-input"
          placeholder="输入内容，支持 {字段} 表达式"
          @input="write(c => { c.formatter = ($event.target as HTMLInputElement).value || undefined })"
          @dblclick="openFormatterEditor" />
      </div>

      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">水平对齐</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="align" :tip-override="CELL_TIP" :write="(v) => write(c => { c.align = v })" />
        </span>
        <div class="pd-radio-group" role="radiogroup">
          <label class="pd-radio"><input type="radio" value="left" :checked="mainCell.align === 'left'" @change="onAlignChange(($event.target as HTMLInputElement).value)"><span>左</span></label>
          <label class="pd-radio"><input type="radio" value="center" :checked="mainCell.align === 'center'" @change="onAlignChange(($event.target as HTMLInputElement).value)"><span>中</span></label>
          <label class="pd-radio"><input type="radio" value="right" :checked="mainCell.align === 'right'" @change="onAlignChange(($event.target as HTMLInputElement).value)"><span>右</span></label>
          <label class="pd-radio"><input type="radio" value="justify" :checked="mainCell.align === 'justify'" @change="onAlignChange(($event.target as HTMLInputElement).value)"><span>两端</span></label>
        </div>
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">垂直对齐</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="valign" :tip-override="CELL_TIP" :write="(v) => write(c => { c.valign = v })" />
        </span>
        <div class="pd-radio-group" role="radiogroup">
          <label class="pd-radio"><input type="radio" value="top" :checked="mainCell.valign === 'top'" @change="onValignChange(($event.target as HTMLInputElement).value)"><span>上</span></label>
          <label class="pd-radio"><input type="radio" value="middle" :checked="mainCell.valign === 'middle'" @change="onValignChange(($event.target as HTMLInputElement).value)"><span>中</span></label>
          <label class="pd-radio"><input type="radio" value="bottom" :checked="mainCell.valign === 'bottom'" @change="onValignChange(($event.target as HTMLInputElement).value)"><span>下</span></label>
        </div>
      </div>
      <div class="cell-style-grid">
        <div class="pd-field cell-font-field"><span class="pd-label"><span class="pd-label-t">字体</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="fontFamily" :tip-override="CELL_TIP" :write="(v) => write(c => { c.fontFamily = v })" />
        </span>
          <FontSelect
            :model-value="mainCell.fontFamily"
            placeholder="继承默认"
            @update:model-value="write(c => { c.fontFamily = $event })"
          />
        </div>
        <div class="pd-field"><span class="pd-label"><span class="pd-label-t">字号 (pt)</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="fontSize" :tip-override="CELL_TIP" :write="(v) => write(c => { c.fontSize = v })" />
        </span>
          <StepperInput :model-value="mainCell.fontSize"
            :min="5"
            :max="72"
            placeholder="默认" @update:model-value="write(c => { c.fontSize = $event ?? undefined })" />
        </div>
        <div class="pd-field"><span class="pd-label"><span class="pd-label-t">加粗</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="fontWeight" :tip-override="CELL_TIP" :write="(v) => write(c => { c.fontWeight = v })" />
        </span>
          <input :checked="mainCell.fontWeight === 'bold'" type="checkbox" class="pd-switch" @input="write(c => { c.fontWeight = ($event.target as HTMLInputElement).checked ? 'bold' : undefined })" />
        </div>
        <div class="pd-field"><span class="pd-label"><span class="pd-label-t">文字颜色</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="color" :tip-override="CELL_TIP" :write="(v) => write(c => { c.color = v })" />
        </span>
          <PresetColorPicker :model-value="mainCell.color" @update:model-value="write(c => { c.color = $event })" />
        </div>
        <div class="pd-field"><span class="pd-label"><span class="pd-label-t">背景色</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="backgroundColor" :tip-override="CELL_TIP" :write="(v) => write(c => { c.backgroundColor = v })" />
        </span>
          <PresetColorPicker :model-value="mainCell.backgroundColor" @update:model-value="write(c => { c.backgroundColor = $event })" />
        </div>
      </div>

      <h3 class="pd-divider">边框</h3>
      <div class="border-style-row">
        <select class="pd-select" v-model="borderStyle" style="width: 90px">
          <option value="solid">实线</option>
          <option value="dashed">虚线</option>
          <option value="dotted">点线</option>
          <option value="double">双线</option>
        </select>
        <div style="width: 112px; flex-shrink: 0"><StepperInput v-model="borderWidth"
          :min="0.25"
          :max="5"
          :step="0.25" /></div>
        <PresetColorPicker v-model="borderColor" :clearable="false" />
      </div>
      <div class="pd-button-group border-presets">
        <button type="button" class="pd-button small" @click="preset('all')">全部</button>
        <button type="button" class="pd-button small" @click="preset('outer')">外侧</button>
        <button type="button" class="pd-button small" @click="preset('inner')">内部</button>
        <button type="button" class="pd-button small" @click="preset('none')">无</button>
      </div>
      <div class="pd-checkbox-group">
        <label class="pd-checkbox"><input type="checkbox" v-model="edgeChecks" value="top" @change="onEdgesChange($event)"><span>上</span></label>
        <label class="pd-checkbox"><input type="checkbox" v-model="edgeChecks" value="right" @change="onEdgesChange($event)"><span>右</span></label>
        <label class="pd-checkbox"><input type="checkbox" v-model="edgeChecks" value="bottom" @change="onEdgesChange($event)"><span>下</span></label>
        <label class="pd-checkbox"><input type="checkbox" v-model="edgeChecks" value="left" @change="onEdgesChange($event)"><span>左</span></label>
      </div>

      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">内边距 (mm)</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="padding" :tip-override="CELL_TIP" :write="(v) => write(c => { c.padding = v })" />
        </span>
        <StepperInput :model-value="mainCell.padding"
          :min="0"
          :max="10"
          :step="0.5"
          placeholder="默认" @update:model-value="write(c => { c.padding = $event ?? undefined })" />
      </div>
      <div class="pd-field"><span class="pd-label"><span class="pd-label-t">自动换行</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="wordWrap" :tip-override="CELL_TIP" :write="(v) => write(c => { c.wordWrap = v })" />
        </span>
        <input :checked="mainCell.wordWrap ?? true" type="checkbox" class="pd-switch" @input="write(c => { c.wordWrap = !!($event.target as HTMLInputElement).checked })" />
      </div>
      <div class="pd-field" v-if="isTextCell"><span class="pd-label"><span class="pd-label-t">文字溢出</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="textFit" :tip-override="CELL_TIP" :write="(v) => write(c => { c.textFit = v })" />
        </span>
        <select class="pd-select" :value="cellTextFit" style="width: 100%" @change="onTextFitChange">
          <option value="clip">截断</option>
          <option value="shrink">自动缩小</option>
          <option value="autoHeight">自适应行高</option>
        </select>
      </div>
      <div class="pd-field" v-if="isTextCell && cellTextFit === 'shrink'"><span class="pd-label"><span class="pd-label-t">最小字号 (pt)</span>
          <ResetButton :target="mainCell" :base="CELL_FACTORY" prop-key="shrinkMinFontSize" :tip-override="CELL_TIP" :write="(v) => write(c => { c.shrinkMinFontSize = v })" />
        </span>
        <StepperInput :model-value="mainCell.shrinkMinFontSize"
          :min="1"
          :max="72"
          :step="0.5"
          placeholder="默认 6"
          @update:model-value="write(c => { c.shrinkMinFontSize = $event ?? undefined })" />
      </div>

      <div class="merge-btns">
        <button type="button" class="pd-button small" :disabled="!!mergeReason" :title="mergeReason || ''" @click="doMerge">
          合并单元格
        </button>
        <button type="button" class="pd-button small" :disabled="!canSplit" @click="doSplit">拆分单元格</button>
      </div>
    </form>
  </PropertyGroup>

  <ExpressionEditor
    v-model="formatterEditorVisible"
    :fields="fields"
    :expression="pendingFormatterValue"
    @update:expression="onFormatterEditorConfirm"
  />
</template>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type {
  RuntimeElement, TableSelection, TableCell, TableCellBorder, TableCellBorders, TableCellType, TextAlign,
  PrintBusinessField,
} from '@worm-vue3-print/core/designer'
import {
  canMergeReason, mergeCells, splitCells, applyBorderPreset, findMainCell, type BorderPreset,
  resolveCellTextFit, type TextFit, propertyTip, IMAGE_FIT_OPTIONS, evaluateTemplate, DEFAULT_DEMO_DATA, barcodeBarWidthRecommendText,
  cellFitCapMm, cellFitWidthMm,
} from '@worm-vue3-print/core/designer'
import { TABLE_EDIT_KEY } from '../../composables/useTableSelection'
import PropertyGroup from './PropertyGroup.vue'
import ResetButton from './ResetButton.vue'
import StepperInput from './StepperInput.vue'
import ExpressionEditor from '../ExpressionEditor.vue'
import PresetColorPicker from '../PresetColorPicker.vue'
import FontSelect from './FontSelect.vue'
import CropAnchorField from './CropAnchorField.vue'

/** 静区说明：文案单一来源在 core 的属性注册表，与元素台、common 宿主共用同一条 */
const quietTip = propertyTip('cd-quiet-zone')
/** 条形码静区说明：与二维码共用注册表入口 */
const barQuietTip = propertyTip('cd-bar-quiet-zone')
/** 条高说明：与元素台同源，两条宿主共用一条文案 */
const barHeightTip = propertyTip('cd-bar-height')

const props = defineProps<{
  element: RuntimeElement
  selection: TableSelection
  fields: PrintBusinessField[]
}>()
const ctx = inject(TABLE_EDIT_KEY)!

const rows = computed(() => props.element.options.tableRows!)

const main = computed(() => findMainCell(rows.value, props.selection.r1, props.selection.c1))
const mainCell = computed<TableCell>(() => rows.value[main.value.r]!.cells[main.value.c]!)

/** 单元格内容盒近似：列宽合计 × 行高合计（内边距与塌陷边框不计，只用于判哪一轴能挪） */
/** 剪裁盒尺寸取「可用内容框」：与出纸钉盒同一口径（扣内边距与塌陷边框），报原始行列和会让可挪量虚高 */
const cellBoxMm = computed(() => {
  const cell = mainCell.value
  const widths = props.element.options.tableColWidths ?? []
  const defaultPadding = props.element.options.tableDefaultPadding ?? 1
  return {
    width: cellFitWidthMm(widths, main.value.c, cell, defaultPadding),
    height: cellFitCapMm(rows.value, main.value.r, cell, defaultPadding),
  }
})

/** 示意图取设计态已解析地址：{字段} 用 demo 数据求值，与 CellImage 的 designMode 分支同口径 */
const cellImageSrc = computed(() => {
  const raw = String(mainCell.value.formatter ?? '')
  return raw.includes('{') ? String(evaluateTemplate(raw, DEFAULT_DEMO_DATA)) : raw
})

const formatterEditorVisible = ref(false)
const pendingFormatterValue = ref('')

const isBarcodeCell = computed(() => mainCell.value.cellType === 'barcode')
const isQrcodeCell = computed(() => mainCell.value.cellType === 'qrcode')
const isImageCell = computed(() => mainCell.value.cellType === 'image')
/** 条码点对齐：仅条形码单元格 + 已配打印机分辨率；此时缩放模式与最大宽高不参与 */
const dotAligned = computed(() => isBarcodeCell.value && !!mainCell.value.printerDpi)

/** 条宽提示：结算口径 + 选了打印机分辨率后的推荐倍率（只给参考，不回写 barWidth） */
const barWidthHint = computed(() => {
  const base = dotAligned.value
    ? '已设置打印机分辨率：条宽会被吸附到最近的整数打印点（DPI 优先于毫米值），单元格放不下时整体等比缩小'
    : '热敏/针式打印建议 3 及以上：决定条码的落纸尺寸，条越粗出纸后条宽越稳定'
  const rec = barcodeBarWidthRecommendText(mainCell.value.printerDpi, mainCell.value.barWidth)
  return rec ? `${base}。${rec}` : base
})

/** 文字溢出形式仅对文本单元格有意义（码值/图片由 fit/maxWidth 控制） */
const isTextCell = computed(() => !isBarcodeCell.value && !isQrcodeCell.value && !isImageCell.value)
/** 未配置时：不换行→截断，否则自适应行高（与打印端同一判定） */
const cellTextFit = computed(() => resolveCellTextFit(mainCell.value))

function onTextFitChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value as TextFit
  write(c => { c.textFit = value })
}

function onAlignChange(v: string) {
  write(c => { c.align = v as TextAlign })
}

function onValignChange(v: string) {
  write(c => { c.valign = v as TableCell['valign'] })
}

function onPrinterDpiChange(v: string) {
  const dpi = Number(v)
  write(c => { c.printerDpi = dpi > 0 ? dpi : undefined })
}

function onCellTypeChange(v: string) {
  write(c => {
    c.cellType = v === 'text' ? undefined : (v as TableCellType)
    if (v !== 'barcode') {
      c.barcodeType = undefined
      c.showBarcodeText = undefined
      c.printerDpi = undefined
      c.barQuietZone = undefined
      c.barHeight = undefined
    }
    if (v !== 'qrcode') {
      c.qrCodeLevel = undefined
      c.qrQuietZone = undefined
    }
    // fit、maxWidth、maxHeight 对所有类型都有效，不再清除
  })
}

function openFormatterEditor() {
  pendingFormatterValue.value = mainCell.value.formatter || ''
  formatterEditorVisible.value = true
}

function onFormatterEditorConfirm(val: string) {
  write(c => { c.formatter = val || undefined })
}

/** 单元格的出厂态就是"未设"：落点恒为 undefined，删键后回落到该表格自己的表格级默认 */
const CELL_FACTORY: Record<string, any> = {}
/** 回落目标是作者可改的表级默认，写死数字就是假承诺，故整组固定这一句 */
const CELL_TIP = '恢复默认值（跟随表格默认）'

function write(fn: (c: TableCell) => void) {
  const s = props.selection
  for (let r = s.r1; r <= s.r2; r++) {
    for (let c = s.c1; c <= s.c2; c++) {
      const cell = rows.value[r]!.cells[c]!
      if (!cell.merged) fn(cell)
    }
  }
  ctx.recordHistory()
}

const borderStyle = ref<TableCellBorder['style']>('solid')
const borderWidth = ref(0.75)
const borderColor = ref('#333333')
const edgeChecks = ref<string[]>([])

function currentBorder(): TableCellBorder {
  return { width: borderWidth.value, style: borderStyle.value, color: borderColor.value }
}

function preset(p: BorderPreset) {
  applyBorderPreset(rows.value, props.selection, p, currentBorder())
  ctx.recordHistory()
}

function onEdgesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const edges = new Set(edgeChecks.value)
  if (input.checked) edges.add(input.value)
  else edges.delete(input.value)
  edgeChecks.value = [...edges]
  const b = currentBorder()
  write(c => {
    const nb = { ...(c.borders ?? {}) } as Record<string, TableCellBorder | undefined>
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (edges.has(side)) nb[side] = { ...b }
      else delete nb[side]
    }
    c.borders = nb as TableCellBorders
  })
}

const mergeReason = computed(() => canMergeReason(rows.value, props.selection))

const canSplit = computed(() => {
  const s = props.selection
  for (let r = s.r1; r <= s.r2; r++) {
    for (let c = s.c1; c <= s.c2; c++) {
      const cell = rows.value[r]!.cells[c]!
      if (!cell.merged && ((cell.rowspan ?? 1) > 1 || (cell.colspan ?? 1) > 1)) return true
    }
  }
  return false
})

function doMerge() {
  mergeCells(rows.value, props.selection)
  ctx.recordHistory()
}

function doSplit() {
  splitCells(rows.value, props.selection)
  ctx.recordHistory()
}

defineExpose({ openFormatterEditor })
</script>

<style scoped>
.cell-style-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 8px;
}
/* 字体含输入框 + 查询按钮 + 状态提示，半栏放不下，独占一行 */
.cell-font-field {
  grid-column: 1 / -1;
  /* 栅格行距为 0，独占一行时需自己与下方「字号 / 加粗」留出间距 */
  padding-bottom: 8px;
}
.border-style-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.border-presets {
  margin-bottom: 8px;
}
.merge-btns {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
