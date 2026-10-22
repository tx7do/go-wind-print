// print-core/src/render/barcode-dot.test.ts
// 条码落纸尺寸的三条规则：条宽定首选 → 设了 dpi 就吸附到整数打印点（dpi 优先）→ 框不够等比缩小。
import { describe, it, expect } from 'vitest'
import {
  BARCODE_BAR_HEIGHT_MODULES,
  BARCODE_QUIET_ZONE_MODULES,
  MM_PER_INCH,
  barcodeAvailableBoxMm,
  barcodeBarHeightModules,
  barcodePreferredModuleWidthMm,
  barcodeQuietZoneModules,
  barcodeUnitsPerModule,
  barcodeWidthBoundModuleWidthMm,
  layoutBarcodeSize,
  resolveBarcodeSize,
} from './barcode-dot.js'

/** 实测基准：CODE128C 编 '12345678' → 79 模块；条高 30 + 间距 2 + 文本 12 = 44 模块 */
const CODE128C_79 = { unitWidth: 79, unitHeight: 44 }
/** 元素工厂缺省条码框（element-factory.ts） */
const DEFAULT_BOX = { boxWidthMm: 56.4, boxHeightMm: 14.1 }

/** 折算回打印点：点对齐时必须落在整数点上 */
function dotsOf(mm: number, dpi: number): number {
  return (mm * dpi) / MM_PER_INCH
}

describe('条宽 → 首选模块宽度', () => {
  it('每模块用户单位数与出图端 jsbarcode 的 width 同口径', () => {
    expect(barcodeUnitsPerModule()).toBe(1)
    expect(barcodeUnitsPerModule(2)).toBe(1)
    expect(barcodeUnitsPerModule(3)).toBe(1.5)
    expect(barcodeUnitsPerModule(4)).toBe(2)
    // 上限抬到 8（属性台可填 2~8）：每模块 4 用户单位、首选 1mm
    expect(barcodeUnitsPerModule(8)).toBe(4)
    // 缺省值与非法值都按 barWidth=2 处理
    expect(barcodePreferredModuleWidthMm()).toBe(0.25)
    expect(barcodePreferredModuleWidthMm(4)).toBe(0.5)
    expect(barcodePreferredModuleWidthMm(8)).toBe(1)
  })

  it('静区常量为 jsbarcode 缺省值 10 模块', () => {
    expect(BARCODE_QUIET_ZONE_MODULES).toBe(10)
  })

  it('barQuietZone 归一：未填回退 10，0 是合法档，负数按 0，小数向下取整', () => {
    expect(barcodeQuietZoneModules()).toBe(10)
    expect(barcodeQuietZoneModules(10)).toBe(10)
    expect(barcodeQuietZoneModules(0)).toBe(0)
    expect(barcodeQuietZoneModules(20)).toBe(20)
    expect(barcodeQuietZoneModules(-5)).toBe(0)
    expect(barcodeQuietZoneModules(3.7)).toBe(3)
    expect(barcodeQuietZoneModules(Number.NaN)).toBe(10)
    expect(barcodeQuietZoneModules(Number.POSITIVE_INFINITY)).toBe(10)
  })
})

describe('resolveBarcodeSize 未设 dpi：按条宽渲染', () => {
  it('条宽决定每模块物理宽度，框装得下就按原尺寸（不放大填满）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, ...DEFAULT_BOX })
    expect(size.moduleWidthMm).toBe(0.25)
    expect(size.widthMm).toBeCloseTo(79 * 0.25, 9)
    expect(size.heightMm).toBeCloseTo(44 * 0.25, 9)
    expect(size.dotsPerModule).toBeNull()
    expect(size.scaledDown).toBe(false)
  })

  it('dpi 为 0 / 负数 / 缺失时不点对齐', () => {
    for (const dpi of [undefined, 0, -203]) {
      const size = resolveBarcodeSize({ ...CODE128C_79, ...DEFAULT_BOX, dpi })
      expect(size.dotsPerModule).toBeNull()
      expect(size.moduleWidthMm).toBe(0.25)
    }
  })

  it('条宽加倍 → 尺寸同比加倍', () => {
    const base = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0 })
    const thick = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0, barWidth: 4 })
    expect(thick.widthMm).toBeCloseTo(base.widthMm * 2, 9)
  })

  it('可用宽高不足时等比缩小（宽高比不变）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 20, boxHeightMm: 5, barWidth: 4 })
    expect(size.scaledDown).toBe(true)
    expect(size.widthMm).toBeLessThanOrEqual(20)
    expect(size.heightMm).toBeLessThanOrEqual(5)
    expect(size.widthMm / size.heightMm).toBeCloseTo(79 / 44, 9)
  })

  it('框尺寸未知（为 0）时不约束，按首选尺寸渲染', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0 })
    expect(size.widthMm).toBeCloseTo(79 * 0.25, 9)
    expect(size.scaledDown).toBe(false)
  })
})

describe('resolveBarcodeSize 设置 dpi：优先适配打印点阵', () => {
  it('203dpi 缺省条宽：0.25mm → 2 点/模块（宽度足够，不放大）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, ...DEFAULT_BOX, dpi: 203 })
    expect(size.dotsPerModule).toBe(2)
    expect(size.widthMm).toBeCloseTo((79 * 2 * MM_PER_INCH) / 203, 9)
    expect(size.heightMm).toBeCloseTo((44 * 2 * MM_PER_INCH) / 203, 9)
    expect(size.scaledDown).toBe(false)
  })

  it('300dpi 同一条宽：吸附到 3 点/模块（DPI 优先于条宽的精确毫米值）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0, dpi: 300 })
    expect(size.dotsPerModule).toBe(3)
    // 0.25mm 在 300dpi 下是 2.95 点，向上吸附为 3 点 = 0.254mm
    expect(size.moduleWidthMm).toBeCloseTo(0.254, 3)
  })

  it('成品尺寸恰好是整数个打印点（消除条宽忽宽忽窄的关键）', () => {
    for (const dpi of [203, 300, 600]) {
      const size = resolveBarcodeSize({ ...CODE128C_79, ...DEFAULT_BOX, dpi })
      expect(dotsOf(size.widthMm, dpi)).toBeCloseTo(Math.round(dotsOf(size.widthMm, dpi)), 6)
      expect(dotsOf(size.heightMm, dpi)).toBeCloseTo(Math.round(dotsOf(size.heightMm, dpi)), 6)
    }
  })

  it('条宽越大，每模块点数越多（barWidth 仍是尺寸的第一来源）', () => {
    const thin = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0, dpi: 203, barWidth: 2 })
    const thick = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 0, boxHeightMm: 0, dpi: 203, barWidth: 4 })
    expect(thick.dotsPerModule).toBe(4)
    expect(thick.widthMm).toBeCloseTo(thin.widthMm * 2, 9)
  })

  it('框很大时不放大：宁可按条宽原尺寸，也不把条宽拉成非整数点', () => {
    const size = resolveBarcodeSize({
      unitWidth: 79, unitHeight: 44, boxWidthMm: 200, boxHeightMm: 200, dpi: 203,
    })
    expect(size.dotsPerModule).toBe(2)
  })

  it('宽度不足时按整数点逐级缩小（保持点对齐与宽高比）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 15, boxHeightMm: 14.1, dpi: 203 })
    expect(size.dotsPerModule).toBe(1)
    expect(size.scaledDown).toBe(true)
    expect(size.widthMm).toBeLessThanOrEqual(15)
    expect(size.widthMm / size.heightMm).toBeCloseTo(79 / 44, 9)
    expect(dotsOf(size.widthMm, 203)).toBeCloseTo(Math.round(dotsOf(size.widthMm, 203)), 6)
  })

  it('连 1 点/模块都放不下时退回连续等比缩放（不对齐也不溢出可用框）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 5, boxHeightMm: 5, dpi: 203 })
    expect(size.dotsPerModule).toBeNull()
    expect(size.scaledDown).toBe(true)
    expect(size.widthMm).toBeLessThanOrEqual(5)
    expect(size.heightMm).toBeLessThanOrEqual(5)
    expect(size.widthMm / size.heightMm).toBeCloseTo(79 / 44, 9)
  })

  it('高度先告急时同样等比缩小（宽高比不变）', () => {
    const size = resolveBarcodeSize({ ...CODE128C_79, boxWidthMm: 56.4, boxHeightMm: 6, dpi: 203 })
    expect(size.heightMm).toBeLessThanOrEqual(6)
    expect(size.widthMm / size.heightMm).toBeCloseTo(79 / 44, 9)
    expect(dotsOf(size.heightMm, 203)).toBeCloseTo(Math.round(dotsOf(size.heightMm, 203)), 6)
  })

  it('模块数取整向上：非整数单位宽不会被算成额外点数', () => {
    const size = resolveBarcodeSize({
      unitWidth: 79.2, unitHeight: 44.4, boxWidthMm: 0, boxHeightMm: 0, dpi: 203,
    })
    expect(dotsOf(size.widthMm, 203)).toBeCloseTo(80 * (size.dotsPerModule ?? 0), 6)
    expect(dotsOf(size.heightMm, 203)).toBeCloseTo(45 * (size.dotsPerModule ?? 0), 6)
  })
})

describe('可用框并入最大宽高', () => {
  it('可用框已知时取小者', () => {
    expect(barcodeAvailableBoxMm(56.4, 30)).toBe(30)
    expect(barcodeAvailableBoxMm(56.4, 80)).toBe(56.4)
  })

  it('可用框未知时最大宽高即上限', () => {
    expect(barcodeAvailableBoxMm(0, 30)).toBe(30)
    expect(barcodeAvailableBoxMm(undefined, 30)).toBe(30)
  })

  it('两者都未知时返回 0（不约束）', () => {
    expect(barcodeAvailableBoxMm(0, undefined)).toBe(0)
    expect(barcodeAvailableBoxMm(undefined, undefined)).toBe(0)
  })
})

describe('条高 mm → 条区模块数（条宽优先，框高收敛）', () => {
  it('未填、非法或非正条高回退缺省 30 模块：存量模板逐毫米不变', () => {
    const base = { moduleWidthMm: 0.5 }
    expect(barcodeBarHeightModules(base)).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(barcodeBarHeightModules({ ...base, barHeightMm: 0 })).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(barcodeBarHeightModules({ ...base, barHeightMm: -5 })).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(barcodeBarHeightModules({ ...base, barHeightMm: Number.NaN })).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(barcodeBarHeightModules({ ...base, barHeightMm: Number.POSITIVE_INFINITY })).toBe(BARCODE_BAR_HEIGHT_MODULES)
  })

  it('每模块宽未知（≤0）时没有折算粒度，回退缺省档', () => {
    expect(barcodeBarHeightModules({ barHeightMm: 25, moduleWidthMm: 0 })).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(barcodeBarHeightModules({ barHeightMm: 25, moduleWidthMm: -1 })).toBe(BARCODE_BAR_HEIGHT_MODULES)
  })

  it('按每模块宽反算并吸附到整数模块（条高的粒度就是条宽的粒度）', () => {
    expect(barcodeBarHeightModules({ barHeightMm: 15, moduleWidthMm: 0.5 })).toBe(30)
    expect(barcodeBarHeightModules({ barHeightMm: 25, moduleWidthMm: 0.5 })).toBe(50)
    expect(barcodeBarHeightModules({ barHeightMm: 12, moduleWidthMm: 0.5 })).toBe(24)
    // 24.4 → 24、24.6 → 25：只能精确到每模块宽的整数倍
    expect(barcodeBarHeightModules({ barHeightMm: 12.2, moduleWidthMm: 0.5 })).toBe(24)
    expect(barcodeBarHeightModules({ barHeightMm: 12.3, moduleWidthMm: 0.5 })).toBe(25)
  })

  it('框高不足时条高让位，不把条宽压窄', () => {
    // 框高 14.1mm、文字区 14 模块 × 0.5mm = 7mm → 条区上限 (14.1-7)/0.5 = 14.2 → 14 模块
    expect(barcodeBarHeightModules({
      barHeightMm: 25, moduleWidthMm: 0.5, boxHeightMm: 14.1, textModules: 14,
    })).toBe(14)
  })

  it('框高未知（≤0）时不收敛，按期望条高兑现', () => {
    expect(barcodeBarHeightModules({
      barHeightMm: 25, moduleWidthMm: 0.5, boxHeightMm: 0, textModules: 14,
    })).toBe(50)
    expect(barcodeBarHeightModules({ barHeightMm: 25, moduleWidthMm: 0.5, boxHeightMm: -1 })).toBe(50)
  })

  it('文字区单独就超框时仍给 1 模块，条码不至于完全打不出', () => {
    expect(barcodeBarHeightModules({
      barHeightMm: 25, moduleWidthMm: 0.5, boxHeightMm: 5, textModules: 14,
    })).toBe(1)
  })

  it('期望条高小于缺省档时按期望缩小（条高不是只放大）', () => {
    expect(barcodeBarHeightModules({ barHeightMm: 5, moduleWidthMm: 0.5 })).toBe(10)
  })
})

describe('条宽侧上限：条高的折算粒度来源', () => {
  it('未设 dpi：取条宽首选与框宽上限的小者', () => {
    // 79 模块 × 0.5mm = 39.5mm，56.4mm 框装得下 → 按首选
    expect(barcodeWidthBoundModuleWidthMm({ unitWidth: 79, boxWidthMm: 56.4, barWidth: 4 })).toBe(0.5)
    // 200 模块 × 0.5mm = 100mm 放不下 → 被框宽压到 0.282mm
    expect(barcodeWidthBoundModuleWidthMm({ unitWidth: 200, boxWidthMm: 56.4, barWidth: 4 }))
      .toBeCloseTo(56.4 / 200, 9)
  })

  it('框宽未知（≤0）时不约束，直接按首选', () => {
    expect(barcodeWidthBoundModuleWidthMm({ unitWidth: 79, boxWidthMm: 0, barWidth: 4 })).toBe(0.5)
    expect(barcodeWidthBoundModuleWidthMm({ unitWidth: 79, boxWidthMm: -1, barWidth: 4 })).toBe(0.5)
  })

  it('设了 dpi：吸附到整数打印点', () => {
    // 200 模块在 56.4mm 框内是 0.282mm ≈ 2.25 点，只能取 2 点
    const mm = barcodeWidthBoundModuleWidthMm({ unitWidth: 200, boxWidthMm: 56.4, dpi: 203, barWidth: 4 })
    expect(dotsOf(mm, 203)).toBeCloseTo(2, 6)
    // 框宽足够时按首选吸附：0.5mm 在 203dpi 下是 3.996 点 → 4 点
    const roomy = barcodeWidthBoundModuleWidthMm({ unitWidth: 79, boxWidthMm: 56.4, dpi: 203, barWidth: 4 })
    expect(dotsOf(roomy, 203)).toBeCloseTo(4, 6)
  })

  it('框宽连 1 点/模块都放不下时退回连续值（与整图结算同规则）', () => {
    const mm = barcodeWidthBoundModuleWidthMm({ unitWidth: 200, boxWidthMm: 3, dpi: 203, barWidth: 4 })
    expect(dotsOf(mm, 203)).toBeLessThan(1)
    expect(mm).toBeCloseTo(3 / 200, 9)
  })

  it('与整图结算的区别：本函数不看框高，才不会让条高挤窄条宽', () => {
    const widthBound = barcodeWidthBoundModuleWidthMm({ unitWidth: 79, boxWidthMm: 56.4, barWidth: 4 })
    const settled = resolveBarcodeSize({
      unitWidth: 79, unitHeight: 44, boxWidthMm: 56.4, boxHeightMm: 6, barWidth: 4,
    })
    expect(widthBound).toBe(0.5)
    expect(settled.moduleWidthMm).toBeLessThan(0.5)
  })
})

describe('layoutBarcodeSize 两趟布局：条宽优先，条高收敛', () => {
  /** 仿 jsbarcode 的几何：宽 99 模块，高 =（条区 + 12 文字 + 2 间距）×每模块用户单位数 */
  function fakeMeasure(upm: number, seen: number[]) {
    return (barHeightModules: number) => {
      seen.push(barHeightModules)
      return { widthUnits: 99 * upm, heightUnits: (barHeightModules + 12 + 2) * upm }
    }
  }

  it('未填条高：只生成一趟，尺寸与直接结算逐毫米一致', () => {
    const seen: number[] = []
    const layout = layoutBarcodeSize({
      boxWidthMm: 56.4, boxHeightMm: 14.1, barWidth: 2, measure: fakeMeasure(1, seen),
    })
    expect(seen).toEqual([BARCODE_BAR_HEIGHT_MODULES])
    const direct = resolveBarcodeSize({
      unitWidth: 99, unitHeight: 44, boxWidthMm: 56.4, boxHeightMm: 14.1, barWidth: 2,
    })
    expect(layout.size).toEqual(direct)
    expect(layout.barHeightModules).toBe(BARCODE_BAR_HEIGHT_MODULES)
  })

  it('折算结果正好是缺省档时短路第二趟（7.5mm ÷ 0.25mm = 30 模块）', () => {
    const seen: number[] = []
    const layout = layoutBarcodeSize({
      barHeightMm: 7.5, boxWidthMm: 56.4, boxHeightMm: 14.1, barWidth: 2, measure: fakeMeasure(1, seen),
    })
    expect(seen).toEqual([BARCODE_BAR_HEIGHT_MODULES])
    expect(layout.barHeightModules).toBe(BARCODE_BAR_HEIGHT_MODULES)
  })

  it('期望条高超出框高：条高让位到 42 模块，条宽一分不损', () => {
    const seen: number[] = []
    const layout = layoutBarcodeSize({
      barHeightMm: 25, boxWidthMm: 56.4, boxHeightMm: 14.1, barWidth: 2, measure: fakeMeasure(1, seen),
    })
    // 第一趟拿模块数，第二趟按收敛后的条区模块数重生成
    expect(seen).toEqual([BARCODE_BAR_HEIGHT_MODULES, 42])
    expect(layout.barHeightModules).toBe(42)
    if (!layout.size) throw new Error('布局未结算出尺寸')
    // 条宽侧上限 0.25mm 未被条高挤窄
    expect(layout.size.moduleWidthMm).toBe(0.25)
    expect(layout.size.scaledDown).toBe(false)
    // 整图 42 + 14 = 56 模块 × 0.25mm = 14mm，仍在 14.1mm 框内
    expect(layout.size.heightMm).toBeCloseTo(14, 9)
    expect(layout.size.heightMm).toBeLessThanOrEqual(14.1)
    expect(layout.size.widthMm).toBeCloseTo(99 * 0.25, 9)
  })

  it('框高未知（≤0）时不收敛，条高按期望兑现', () => {
    const seen: number[] = []
    const layout = layoutBarcodeSize({
      barHeightMm: 25, boxWidthMm: 56.4, boxHeightMm: 0, barWidth: 2, measure: fakeMeasure(1, seen),
    })
    expect(seen[1]).toBe(100)
    if (!layout.size) throw new Error('布局未结算出尺寸')
    expect(layout.size.heightMm).toBeCloseTo((100 + 14) * 0.25, 9)
  })

  it('粒度跟着条宽侧走：框宽压窄条宽时，条高按压制后的每模块宽折算', () => {
    const seen: number[] = []
    const upm = 2
    const layout = layoutBarcodeSize({
      barHeightMm: 10, boxWidthMm: 30, boxHeightMm: 40, barWidth: 4,
      measure: (barHeightModules) => {
        seen.push(barHeightModules)
        // 200 模块码值 × 每模块 2 用户单位；高同上
        return { widthUnits: 200 * upm, heightUnits: (barHeightModules + 14) * upm }
      },
    })
    // 框宽 30mm ÷ 200 模块 = 0.15mm/模块，条宽首选 0.5mm 被压到 0.15 → 10mm ÷ 0.15 = 67 模块
    expect(seen[1]).toBe(67)
    if (!layout.size) throw new Error('布局未结算出尺寸')
    expect(layout.size.moduleWidthMm).toBeCloseTo(0.15, 9)
  })

  it('生成失败（无 viewBox）时不结算，条高档回缺省', () => {
    const seen: number[] = []
    const layout = layoutBarcodeSize({
      barHeightMm: 25, boxWidthMm: 56.4, boxHeightMm: 14.1, barWidth: 2,
      measure: (barHeightModules) => {
        seen.push(barHeightModules)
        return null
      },
    })
    expect(seen).toEqual([BARCODE_BAR_HEIGHT_MODULES])
    expect(layout.size).toBeNull()
    expect(layout.barHeightModules).toBe(BARCODE_BAR_HEIGHT_MODULES)
  })
})
