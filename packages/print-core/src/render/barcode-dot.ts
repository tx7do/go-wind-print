// print-core/src/render/barcode-dot.ts
// 条码「落纸尺寸」的统一算法：条宽决定首选尺寸，打印机 DPI 决定它必须落在点阵网格上，
// 可用框不足时等比缩小。设计器画布 / 浏览器出图 / Playwright 服务端三端共用同一份，
// 否则「设计态看到的条码」与「出纸的条码」不是同一个图形。
//
// 背景（实测）：元素框 56.4×14.1mm、CODE128C 79 模块时，把条码拉伸到填满元素框会得到
// 单模块 0.318mm，在 203dpi（≈8 点/mm）下是 2.55 个打印点。矢量几何在 PDF 里是精确的，
// 但打印机/RIP 只能按整点成像，非整数条宽会被各自取整（2 点或 3 点交替），再加边缘抗锯齿，
// 出纸即「条宽忽宽忽窄、边缘发灰」。标签软件之所以清楚，是因为它把窄条宽度定为整数个打印点
// （如 3 点 = 0.375mm）。
//
// 由此定下三条规则（本次统一的核心）：
// 1. 首选尺寸来自条宽：每模块 = 每模块用户单位数 × BARCODE_MODULE_WIDTH_MM；可用框装得下就不
//    放大——放大到填满必然得到非整数条宽，正是要消除的现象；
// 2. 给了 DPI 时优先适配点阵：首选尺寸吸附到「每模块整数个打印点」，DPI 的优先级高于条宽的
//    精确毫米值（条宽 0.25mm 在 300dpi 下取 3 点 = 0.254mm）；
// 3. 可用框放不下首选尺寸时等比缩小：有点阵时按整数点逐级缩小以保住点对齐；连 1 点/模块都
//    放不下才退回连续等比缩放（此时已无法点对齐，宁可缩小也不让条码溢出可用框）。

/** 1 英寸 = 25.4mm */
export const MM_PER_INCH = 25.4

/**
 * 以下 jsbarcode 生成参数单位统一为「模块」（1 模块 = 窄条宽度）；调用时需乘以
 * 每模块用户单位数（jsbarcode 的 width 选项）。设计器画布与出图端必须共用同一份。
 */
/** 条码静区（quiet zone）缺省宽度（模块）：`barQuietZone` 未填时的档位，左右各留这么多 */
export const BARCODE_QUIET_ZONE_MODULES = 10
/**
 * 条码静区归一：取非负整数模块数，未填或非法值回退缺省档。
 * 与二维码不同，一维码的静区是码制硬要求（GS1 取 2.54mm 与 10×条宽的大者），
 * 缺省档不给 0；0 仍是合法档，由用户自担扫码风险换取条宽。
 */
export function barcodeQuietZoneModules(value?: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : BARCODE_QUIET_ZONE_MODULES
}
/** 条高（模块） */
export const BARCODE_BAR_HEIGHT_MODULES = 30
/** 条码下方文本缺省高度（模块，相对条高，非绝对 pt） */
export const BARCODE_TEXT_FONT_SIZE_MODULES = 10
/** 文本区与条码图形之间的间距（模块） */
export const BARCODE_MARGIN_BOTTOM_MODULES = 2
/** 基础模块宽度（mm）：barWidth=2（每模块用户单位数 1）时每个模块的物理宽度 */
export const BARCODE_MODULE_WIDTH_MM = 0.25
/**
 * 一维码每模块物理宽度的推荐下限（mm，业界常引 10mil）。
 * 低于它时热敏头上单条的边缘像素占比过大，首读率明显下降；GS1 对静区另有
 * 「2.54mm 或 10×条宽取大者」的要求，两者同向：条宽达标，静区的绝对宽度也随之达标。
 */
export const BARCODE_MIN_MODULE_WIDTH_MM = 0.254

export interface BarcodeBarWidthRecommendation {
  /** 推荐倍率（0.5 步进，2~8，与属性台同一档距） */
  barWidth: number
  /** 该倍率吸附后的每模块打印点数 */
  dotsPerModule: number
  /** 该倍率的每模块物理宽度（mm） */
  moduleWidthMm: number
}

/**
 * 按打印机分辨率推荐条宽倍率：取「吸附到整数打印点后，每模块宽 ≥ 推荐下限」的最小档。
 * 只用于属性台提示，**不替用户写值**。未填分辨率时返回 null——没有点阵可吸附，
 * 每模块宽就是条宽的连续毫米值，推荐也就失去意义（该文案自己已有「建议 3 及以上」的旧口径）。
 */
export function recommendBarcodeBarWidth(dpi?: number): BarcodeBarWidthRecommendation | null {
  if (typeof dpi !== 'number' || !Number.isFinite(dpi) || dpi <= 0) return null
  const dotsPerMm = dpi / MM_PER_INCH
  for (let bw = 2; bw <= 8; bw += 0.5) {
    // 与 dotAlignedModuleWidth 同一吸附：首选宽度折算成点后取整
    const dotsPerModule = Math.max(1, Math.round(barcodePreferredModuleWidthMm(bw) * dotsPerMm))
    const moduleWidthMm = dotsPerModule / dotsPerMm
    if (moduleWidthMm >= BARCODE_MIN_MODULE_WIDTH_MM - 1e-9) {
      return { barWidth: bw, dotsPerModule, moduleWidthMm }
    }
  }
  return null
}

/**
 * 推荐文案（单一来源，画布与 print-common 四台共用，避免各写一套数字）。
 * 达标时只报推荐档；当前档低于下限时点明差距，并说明这里只提示不改值。
 */
export function barcodeBarWidthRecommendText(
  dpi: number | undefined,
  currentBarWidth: number | undefined,
): string {
  const rec = recommendBarcodeBarWidth(dpi)
  if (!rec) return ''
  const mm = (v: number) => String(Number(v.toFixed(3)))
  const head = `按 ${dpi}dpi 推荐条宽倍率 ${rec.barWidth}（每模块 ${rec.dotsPerModule} 个打印点 = ${mm(rec.moduleWidthMm)}mm，取达到 ${mm(BARCODE_MIN_MODULE_WIDTH_MM)}mm 下限的最小档）`
  const cur = barcodePreferredModuleWidthMm(currentBarWidth ?? 2)
  const curDots = Math.max(1, Math.round(cur * (dpi as number) / MM_PER_INCH))
  const curMm = curDots / ((dpi as number) / MM_PER_INCH)
  // 未填也按缺省档 2 折算：203dpi 下 2 点是 0.250mm，本身就卡在下限之下，该提醒
  const tail = curMm >= BARCODE_MIN_MODULE_WIDTH_MM - 1e-9
    ? `当前倍率 ${currentBarWidth ?? 2} 折算为 ${curDots} 点 / ${mm(curMm)}mm，已达标`
    : `当前倍率 ${currentBarWidth ?? 2} 只有 ${curDots} 点 / ${mm(curMm)}mm，低于下限`
  return `${head}；${tail}。这里只提示，不会替你改值`
}

/** 每模块的用户单位数：与出图端 jsbarcode 的 width 同口径（barWidth=2 → 1，barWidth=4 → 2） */
export function barcodeUnitsPerModule(barWidth?: number): number {
  const raw = typeof barWidth === 'number' && Number.isFinite(barWidth) ? barWidth : 2
  return Math.max(1, raw / 2)
}

/** 每模块的首选物理宽度（mm）：条宽倍率每 +1，增加 BARCODE_MODULE_WIDTH_MM / 2 */
export function barcodePreferredModuleWidthMm(barWidth?: number): number {
  return barcodeUnitsPerModule(barWidth) * BARCODE_MODULE_WIDTH_MM
}

export interface BarcodeBarHeightInput {
  /** 期望条区高度（mm，不含下方文字）；未填或非法一律回退缺省档 */
  barHeightMm?: number
  /** 每模块物理宽度（mm）：条高的折算粒度，来自条宽与点阵的结算 */
  moduleWidthMm: number
  /** 可用框高（mm）；≤0 视为未知，不做收敛 */
  boxHeightMm?: number
  /** 文字区占用的模块数（jsbarcode 的 fontSize + textMargin + 下间距），由实测 viewBox 反推 */
  textModules?: number
}

/**
 * 把期望条高折算成 jsbarcode 的条区模块数。
 * 条高只能落「每模块宽」的整数倍，且框高不够时由条高让位——条宽是清晰度的第一来源，
 * 绝不被条高挤窄（挤窄即回到条宽忽宽忽窄的老问题）。
 */
export function barcodeBarHeightModules(input: BarcodeBarHeightInput): number {
  const { barHeightMm, moduleWidthMm, boxHeightMm, textModules } = input
  const hasHeight = typeof barHeightMm === 'number' && Number.isFinite(barHeightMm) && barHeightMm > 0
  const hasGranularity = typeof moduleWidthMm === 'number' && Number.isFinite(moduleWidthMm) && moduleWidthMm > 0
  // 未填或没有折算粒度时回退缺省档：存量模板（不带 barHeight）必须逐毫米不变
  if (!hasHeight || !hasGranularity) return BARCODE_BAR_HEIGHT_MODULES
  const wanted = Math.max(1, Math.round(barHeightMm / moduleWidthMm))
  const hasBox = typeof boxHeightMm === 'number' && Number.isFinite(boxHeightMm) && boxHeightMm > 0
  if (!hasBox) return wanted
  const text = typeof textModules === 'number' && Number.isFinite(textModules) && textModules > 0 ? textModules : 0
  const cap = Math.floor((boxHeightMm - text * moduleWidthMm) / moduleWidthMm)
  return Math.max(1, Math.min(wanted, cap))
}

export interface BarcodeWidthBoundInput {
  /** 条码总宽（模块，含左右静区） */
  unitWidth: number
  /** 可用框宽（mm）；≤0 视为未知，不约束 */
  boxWidthMm: number
  /** 打印机分辨率（点/英寸）；非正数或缺失视为不对齐点阵 */
  dpi?: number
  /** 条码模块宽度倍率（2-8），缺省 2 */
  barWidth?: number
}

/**
 * 点阵吸附的共用内核：首选每模块宽折算成打印点后取整，并受每模块宽的框侧上限约束。
 * 连 1 点/模块都放不下时返回 null，由调用方退回连续等比缩放（宁可缩小也不溢出可用框）。
 */
function dotAlignedModuleWidth(
  preferredMm: number,
  maxModuleMm: number,
  dotsPerMm: number,
): { dotsPerModule: number; preferredDots: number; moduleWidthMm: number } | null {
  const preferredDots = Math.max(1, Math.round(preferredMm * dotsPerMm))
  const maxDots = Math.floor(maxModuleMm * dotsPerMm)
  if (maxDots < 1) return null
  const dotsPerModule = Math.min(preferredDots, maxDots)
  return { dotsPerModule, preferredDots, moduleWidthMm: dotsPerModule / dotsPerMm }
}

/**
 * 条宽侧的每模块宽：只由条宽、点阵与框宽决定，完全不看条高。
 * 条高要折算成模块数就必须先有一个不被条高污染的粒度，否则「填高把条宽压窄」会循环咬住自己。
 */
export function barcodeWidthBoundModuleWidthMm(input: BarcodeWidthBoundInput): number {
  const preferredMm = barcodePreferredModuleWidthMm(input.barWidth)
  const unitWidth = Math.max(1, Math.ceil(input.unitWidth))
  const maxModuleMm = input.boxWidthMm > 0 ? input.boxWidthMm / unitWidth : Number.POSITIVE_INFINITY
  const dpi = input.dpi
  if (typeof dpi === 'number' && Number.isFinite(dpi) && dpi > 0) {
    const aligned = dotAlignedModuleWidth(preferredMm, maxModuleMm, dpi / MM_PER_INCH)
    if (aligned) return aligned.moduleWidthMm
  }
  return Math.min(preferredMm, maxModuleMm)
}

export interface BarcodeSizeInput {
  /** 总宽度（模块，含左右静区） */
  unitWidth: number
  /** 总高度（模块，条高 + 文本区 + 间距） */
  unitHeight: number
  /** 可用框宽度（mm）；≤0 视为未知（不对条码做宽度约束） */
  boxWidthMm: number
  /** 可用框高度（mm）；≤0 视为未知 */
  boxHeightMm: number
  /** 打印机分辨率（点/英寸）；非正数或缺失视为「不对齐点阵」 */
  dpi?: number
  /** 条码模块宽度倍率（2-8），缺省 2 */
  barWidth?: number
}

export interface BarcodeSize {
  /** 结算后的每模块物理宽度（mm） */
  moduleWidthMm: number
  /** 条码图形最终宽度（mm） */
  widthMm: number
  /** 条码图形最终高度（mm） */
  heightMm: number
  /** 每模块占用的打印点数（整数）；未做点对齐时为 null */
  dotsPerModule: number | null
  /** 是否因可用框放不下首选尺寸而发生了等比缩小 */
  scaledDown: boolean
}

/**
 * 可用框（mm）并入最大宽高，得到结算尺寸的最终上限：
 * - 可用框未知（≤0）时，最大宽高即上限；
 * - 两者都未知时返回 0，交给 resolveBarcodeSize 的「不约束」分支。
 * 调用侧（画布 / 出图）共用一份，避免「最大宽高在一端生效、在另一端不生效」。
 */
export function barcodeAvailableBoxMm(boxMm: number | undefined, maxMm: number | undefined): number {
  const box = typeof boxMm === 'number' && boxMm > 0 ? boxMm : Number.POSITIVE_INFINITY
  const limit = typeof maxMm === 'number' && maxMm > 0 ? Math.min(box, maxMm) : box
  return Number.isFinite(limit) ? limit : 0
}

/**
 * 求条码的落纸尺寸。
 *
 * 缩放是等比的：成品宽高始终等于各自的模块数乘以同一个每模块宽度，
 * 所以「宽度不足」时高度同比缩小，条码不会被拉变形。
 */
export function resolveBarcodeSize(input: BarcodeSizeInput): BarcodeSize {
  const unitWidth = Math.max(1, Math.ceil(input.unitWidth))
  const unitHeight = Math.max(1, Math.ceil(input.unitHeight))
  const preferredModuleMm = barcodePreferredModuleWidthMm(input.barWidth)
  // 可用框折算出的每模块上限：宽高各算一次取小者，即等比缩放下能放下的最大值
  const maxModuleMm = Math.min(
    input.boxWidthMm > 0 ? input.boxWidthMm / unitWidth : Number.POSITIVE_INFINITY,
    input.boxHeightMm > 0 ? input.boxHeightMm / unitHeight : Number.POSITIVE_INFINITY,
  )

  const dpi = input.dpi
  if (typeof dpi === 'number' && Number.isFinite(dpi) && dpi > 0) {
    // DPI 优先：首选条宽换算成打印点后取整，落在点阵网格上
    const aligned = dotAlignedModuleWidth(preferredModuleMm, maxModuleMm, dpi / MM_PER_INCH)
    if (aligned) {
      return {
        moduleWidthMm: aligned.moduleWidthMm,
        widthMm: unitWidth * aligned.moduleWidthMm,
        heightMm: unitHeight * aligned.moduleWidthMm,
        dotsPerModule: aligned.dotsPerModule,
        scaledDown: aligned.dotsPerModule < aligned.preferredDots,
      }
    }
    // 连 1 点/模块都放不下 → 落到下方：放弃点对齐，按框等比缩放（比让条码溢出可用框更好）
  }

  const moduleWidthMm = Math.min(preferredModuleMm, maxModuleMm)
  return {
    moduleWidthMm,
    widthMm: unitWidth * moduleWidthMm,
    heightMm: unitHeight * moduleWidthMm,
    dotsPerModule: null,
    scaledDown: moduleWidthMm < preferredModuleMm,
  }
}

/** 一趟码面的 viewBox 用户单位宽高 */
export interface BarcodeViewBoxUnits {
  widthUnits: number
  heightUnits: number
}

export interface BarcodeLayoutInput {
  /** 期望条区高度（mm，不含下方文字）；未填即缺省档，且只生成一趟 */
  barHeightMm?: number
  /** 可用框宽（mm）；≤0 视为未知 */
  boxWidthMm: number
  /** 可用框高（mm）；≤0 视为未知 */
  boxHeightMm: number
  /** 打印机分辨率（点/英寸） */
  dpi?: number
  /** 条码模块宽度倍率（2-8） */
  barWidth?: number
  /** 按给定条区模块数生成一趟码面并读回 viewBox；生成失败返回 null */
  measure: (barHeightModules: number) => BarcodeViewBoxUnits | null
}

export interface BarcodeLayout {
  /** 最终采用的条区模块数，即生成端最后一次写入 jsbarcode 的 height 档位 */
  barHeightModules: number
  /** 落纸尺寸；码值非法或读不到 viewBox 时为 null，由调用方走既有降级 */
  size: BarcodeSize | null
}

/**
 * 条高布局的趟序：先用缺省条高生成一趟拿模块数，再据此定粒度反算条区模块数，必要时重生成。
 * 之所以必须两趟：每模块宽由「框宽 ÷ 模块数」得出，而模块数只有生成后才知道，
 * 条高又要用每模块宽折算 —— 直接在结算里带上条高，就会让条高反过来挤窄条宽。
 * 未填条高、或折算结果恰是缺省档时只走一趟，与历史行为逐毫米一致。
 */
export function layoutBarcodeSize(input: BarcodeLayoutInput): BarcodeLayout {
  const upm = barcodeUnitsPerModule(input.barWidth)
  const settle = (units: BarcodeViewBoxUnits): BarcodeSize => resolveBarcodeSize({
    unitWidth: units.widthUnits / upm,
    unitHeight: units.heightUnits / upm,
    boxWidthMm: input.boxWidthMm,
    boxHeightMm: input.boxHeightMm,
    dpi: input.dpi,
    barWidth: input.barWidth,
  })

  const first = input.measure(BARCODE_BAR_HEIGHT_MODULES)
  if (!first) return { barHeightModules: BARCODE_BAR_HEIGHT_MODULES, size: null }
  const hasHeight = typeof input.barHeightMm === 'number' && Number.isFinite(input.barHeightMm) && input.barHeightMm > 0
  if (!hasHeight) return { barHeightModules: BARCODE_BAR_HEIGHT_MODULES, size: settle(first) }

  // 文字区占用直接由第一趟实测高减掉条区缺省档得出，比按常量估准：jsbarcode 的 textMargin 不随倍率缩放
  const textModules = Math.max(0, first.heightUnits / upm - BARCODE_BAR_HEIGHT_MODULES)
  const barHeightModules = barcodeBarHeightModules({
    barHeightMm: input.barHeightMm,
    moduleWidthMm: barcodeWidthBoundModuleWidthMm({
      unitWidth: first.widthUnits / upm,
      boxWidthMm: input.boxWidthMm,
      dpi: input.dpi,
      barWidth: input.barWidth,
    }),
    boxHeightMm: input.boxHeightMm,
    textModules,
  })
  if (barHeightModules === BARCODE_BAR_HEIGHT_MODULES) {
    return { barHeightModules, size: settle(first) }
  }

  const second = input.measure(barHeightModules)
  if (!second) return { barHeightModules: BARCODE_BAR_HEIGHT_MODULES, size: null }
  return { barHeightModules, size: settle(second) }
}
