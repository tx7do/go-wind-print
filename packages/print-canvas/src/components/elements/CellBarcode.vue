<!-- 表格单元格内条形码/二维码渲染：设计态与预览态共用，按值生成图形 -->
<template>
  <div class="cell-barcode">
    <svg v-show="cellType === 'barcode' && svgOk" ref="barcodeSvg" :preserveAspectRatio="par" :style="svgStyle"></svg>
    <img v-if="cellType === 'qrcode' && dataUrl" :src="dataUrl" alt="qrcode" :style="imgStyle" />
    <span v-if="!svgOk && cellType === 'barcode'" class="cell-barcode-fallback">{{ value || '条码' }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import { browserCodeRenderer } from '@go-wind/print-core/browser'
import {
  BARCODE_MARGIN_BOTTOM_MODULES,
  BARCODE_TEXT_FONT_SIZE_MODULES,
  barcodeAvailableBoxMm,
  barcodeQuietZoneModules,
  barcodeUnitsPerModule,
  layoutBarcodeSize,
} from '@go-wind/print-core/designer'

const props = defineProps<{
  cellType: 'barcode' | 'qrcode'
  value: string
  barcodeType?: string
  qrCodeLevel?: string
  /** 二维码静区（白边）宽度（模块），缺省按渲染器默认 0（码面铺满单元格） */
  qrQuietZone?: number
  /** 条形码左右静区（白边）宽度（模块），缺省按 core 默认 10（一维码码制要求下限） */
  barQuietZone?: number
  /**
   * 条形码下方是否显示文本，缺省视为「显示」（与出图端 `showBarcodeText` 同口径）。
   * 注意：Vue 会把缺省的布尔 prop 转成 false，调用方必须显式传 `cell.showBarcodeText !== false`。
   */
  showText?: boolean
  fit?: string
  maxWidth?: number
  maxHeight?: number
  /** 打印机分辨率（点/英寸）：给出后条形码尺寸吸附到整数打印点 */
  printerDpi?: number
  /** 单元格可用宽度（mm），点对齐用 */
  targetWidthMm?: number
  /** 单元格可用高度（mm），点对齐用 */
  targetHeightMm?: number
  /** 条码模块宽度倍率（2-4），缺省 2（与独立条码元素同口径） */
  barWidth?: number
  /** 条码下方文本字号（相对条高，条高为 30），缺省 BARCODE_TEXT_FONT_SIZE_MODULES */
  barFontSize?: number
  /** 条区高度（mm，不含下方文本），缺省按 30 模块的等比档；条宽优先，框高不足时由条高让位 */
  barHeight?: number
}>()

const barcodeSvg = ref<SVGSVGElement | null>(null)
const svgOk = ref(false)
const dataUrl = ref('')
/** 结算后的落纸尺寸（mm）；结算失败时为 null（回退等比缩放到单元格内） */
const size = ref<{ width: string; height: string } | null>(null)

/**
 * 缩放模式 → preserveAspectRatio（内联 svg 不支持 object-fit）。
 * 单元格条码尺寸由条宽与打印机分辨率结算后显式给出，这里只用于二维码图片与兜底情形。
 */
const FIT_TO_PAR = {
  contain: 'xMidYMid meet',
  cover: 'xMidYMid slice',
  fill: 'none',
  none: 'xMidYMid meet',
  'scale-down': 'xMidYMid meet',
} as const

const par = computed(
  () => FIT_TO_PAR[(props.fit || 'contain') as keyof typeof FIT_TO_PAR] ?? 'xMidYMid meet',
)

const svgStyle = computed(() => {
  // 结算尺寸就是最终 mm（条宽 / 打印机 dpi / 可用框三者算出），不再叠加缩放限制，避免二次缩放
  if (size.value) {
    return { width: size.value.width, height: size.value.height }
  }
  return {
    maxWidth: props.maxWidth ? `${props.maxWidth}mm` : '100%',
    maxHeight: props.maxHeight ? `${props.maxHeight}mm` : '100%',
  }
})

const imgStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: (props.fit || 'contain') as any,
  maxWidth: props.maxWidth ? `${props.maxWidth}mm` : '100%',
  maxHeight: props.maxHeight ? `${props.maxHeight}mm` : '100%',
}))

/**
 * 与出图端（browser-code-renderer）共用同一份 jsbarcode 参数与条高布局：
 * 单元格现在支持 barWidth 倍率，unitPerModule = barWidth / 2（与独立条码元素同口径）；
 * 填了条高则先探模块数与粒度、必要时按目标条高重生成一趟，未填只生成一趟。
 */
function renderBarcode() {
  svgOk.value = false
  size.value = null
  if (!barcodeSvg.value) return
  const svg = barcodeSvg.value
  const unitPerModule = barcodeUnitsPerModule(props.barWidth)
  const quietModules = barcodeQuietZoneModules(props.barQuietZone)
  /** 生成一趟码面并读回 viewBox，条区模块数交给 core 决定 */
  const measure = (barHeightModules: number) => {
    JsBarcode(svg, props.value, {
      format: (props.barcodeType || 'CODE128') as any,
      width: unitPerModule,
      height: barHeightModules * unitPerModule,
      displayValue: props.showText !== false,
      fontSize: (props.barFontSize ?? BARCODE_TEXT_FONT_SIZE_MODULES) * unitPerModule,
      // 静区只留左右（与出图端同参）：上下留白会白白吃掉单元格高度
      margin: 0,
      marginLeft: quietModules * unitPerModule,
      marginRight: quietModules * unitPerModule,
      marginTop: 0,
      marginBottom: BARCODE_MARGIN_BOTTOM_MODULES * unitPerModule,
    })
    const viewBox = readViewBox(svg)
    return viewBox ? { widthUnits: viewBox.width, heightUnits: viewBox.height } : null
  }

  try {
    const layout = layoutBarcodeSize({
      barHeightMm: props.barHeight,
      // 最大宽高并入可用框（与出图端同一助手），作为结算上限而非事后 CSS 缩放
      boxWidthMm: barcodeAvailableBoxMm(props.targetWidthMm, props.maxWidth),
      boxHeightMm: barcodeAvailableBoxMm(props.targetHeightMm, props.maxHeight),
      dpi: props.printerDpi,
      barWidth: props.barWidth,
      measure,
    })
    svgOk.value = true
    size.value = layout.size
      ? { width: `${layout.size.widthMm}mm`, height: `${layout.size.heightMm}mm` }
      : null
  } catch {
    return /* 码值不符合码制：回退文本占位 */
  }
  // 抗锯齿会在条边缘生成灰像素，热敏头只有黑白两态 → 与出图端一致地关掉
  svg.setAttribute('shape-rendering', 'crispEdges')
}

/** jsbarcode 会把 viewBox 写成 "0 0 W H"；解析失败时返回 null（不启用点对齐） */
function readViewBox(svg: SVGSVGElement): { width: number; height: number } | null {
  const parts = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some(v => !Number.isFinite(v))) return null
  return { width: parts[2]!, height: parts[3]! }
}

function renderQrcode() {
  if (!props.value) {
    dataUrl.value = ''
    return
  }
  try {
    // 与出纸同源（core/browser）：同一份 SVG、同一静区，矢量图形不随单元格大小重出图
    const svg = browserCodeRenderer.render(props.value, 'qrcode', {
      qrCodeLevel: String(props.qrCodeLevel || 'M'),
      qrQuietZone: typeof props.qrQuietZone === 'number' ? props.qrQuietZone : undefined,
    })
    dataUrl.value = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  } catch {
    dataUrl.value = ''
  }
}

function render() {
  if (props.cellType === 'barcode') renderBarcode()
  else renderQrcode()
}

onMounted(render)
watch(
  () => [
    props.cellType, props.value, props.barcodeType, props.qrCodeLevel, props.qrQuietZone, props.barQuietZone, props.showText,
    props.printerDpi, props.targetWidthMm, props.targetHeightMm,
    props.barWidth, props.barFontSize, props.barHeight, props.maxWidth, props.maxHeight,
  ],
  render,
)
</script>

<style scoped>
.cell-barcode { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
/* 条码 svg 自带 viewBox 与结算后的显式 mm 尺寸（内联 style），这里只做溢出兜底 */
.cell-barcode svg { max-width: 100%; max-height: 100%; }
.cell-barcode img { max-width: 100%; max-height: 100%; }
.cell-barcode-fallback { font-style: italic; opacity: 0.6; }
</style>
