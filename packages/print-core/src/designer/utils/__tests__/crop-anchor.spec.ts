// print-core/src/designer/utils/__tests__/crop-anchor.spec.ts
// 裁剪锚点的结构化读写与「可动轴」判定：canvas 与 common 共用同一份判据，避免两端各写一遍漂移。
// 数值判据来自本机 Chromium 实测（35×45mm 框）：竖人像可视窗高 85.71%、可移 7.5mm。
import { describe, it, expect } from 'vitest'
import { buildCropAnchor, parseCropAnchor, resolveCropAxis, cropWindow, CROP_GRID_OPTIONS, cropAxisLabel, cropAxisNote, cropPresetOptions, cropAxisFields, resolveDesignImageSrc } from '../crop-anchor.js'

describe('resolveDesignImageSrc 设计态地址', () => {
  it('{字段} 按 demo 数据求值，普通地址原样', () => {
    expect(resolveDesignImageSrc('{order.no}')).toBe('PO20260801001')
    expect(resolveDesignImageSrc('/docfiles/a.png')).toBe('/docfiles/a.png')
    expect(resolveDesignImageSrc()).toBe('')
  })
})

describe('数字框行模型（两端只负责渲染，顺序不再各排各的）', () => {
  it('判得出轴时只给那一行', () => {
    expect(cropAxisFields('vertical', 30, 20)).toEqual([{ name: 'vertical', label: '垂直位置 (%)', value: 20 }])
    expect(cropAxisFields('horizontal', 30, 20)).toEqual([{ name: 'horizontal', label: '水平位置 (%)', value: 30 }])
  })
  it('判不出时先水平后垂直，同比例时一行都不给', () => {
    expect(cropAxisFields('unknown', 30, 20).map(r => r.name)).toEqual(['horizontal', 'vertical'])
    expect(cropAxisFields('none', 30, 20)).toEqual([])
  })
  it('保留原值时提示直说会被替换，不假装还能回显', () => {
    expect(cropAxisNote('vertical', 7.5, true)).toContain('保留')
    expect(cropAxisNote('unknown', 0, true)).toContain('保留')
  })
})

describe('档位表与中文口径（两端共用，不再各写一遍）', () => {
  it('可动轴标签带单位', () => {
    expect(cropAxisLabel('vertical')).toBe('垂直位置 (%)')
    expect(cropAxisLabel('horizontal')).toBe('水平位置 (%)')
  })
  it('提示直说能挪多少，负责的口径不给「无效」这种猜测', () => {
    expect(cropAxisNote('vertical', 7.5)).toContain('7.5mm')
    expect(cropAxisNote('horizontal', 32.5)).toContain('32.5mm')
    expect(cropAxisNote('none', 0)).toContain('没有可挪动的余量')
    expect(cropAxisNote('unknown', 0)).toBe('')
  })
  it('判得出可动轴时只给该轴的三档，值同时带上不动轴', () => {
    expect(cropPresetOptions('vertical', 30, 50).map(o => o.value)).toEqual(['30,0', '30,50', '30,100'])
    expect(cropPresetOptions('vertical', 30, 50).map(o => o.label)).toEqual(['顶部', '居中', '底部'])
    expect(cropPresetOptions('horizontal', 50, 30).map(o => o.value)).toEqual(['0,30', '50,30', '100,30'])
  })
  it('判不出时给九宫格，不动轴留空由数字框补', () => {
    const opts = cropPresetOptions('unknown', 50, 0)
    expect(opts).toHaveLength(9)
    expect(opts.map(o => o.value)).toContain('0,0')
    expect(opts.find(o => o.label === '上中')).toMatchObject({ value: '50,0' })
  })
})

describe('CROP_GRID_OPTIONS 两轴档位表（判不出可动轴时的降级形态）', () => {
  it('九档齐且「上中」是水平居中配垂直贴顶', () => {
    expect(CROP_GRID_OPTIONS).toHaveLength(9)
    expect(CROP_GRID_OPTIONS.find(o => o.label === '上中')).toMatchObject({ x: 50, y: 0 })
    expect(CROP_GRID_OPTIONS.find(o => o.label === '居中')).toMatchObject({ x: 50, y: 50 })
  })
})

describe('buildCropAnchor 生成落纸串', () => {
  it('两轴都居中时不输出声明（回到缺省居中）', () => {
    expect(buildCropAnchor(50, 50)).toBeUndefined()
  })
  it('偏移轴输出百分比对', () => {
    expect(buildCropAnchor(50, 0)).toBe('50% 0%')
  })
  it('越界与小数被夹取归整', () => {
    expect(buildCropAnchor(-10, 130)).toBe('0% 100%')
    expect(buildCropAnchor(33.6, 50)).toBe('34% 50%')
  })
})

describe('parseCropAnchor 回显存量值', () => {
  it('未设置即空', () => {
    expect(parseCropAnchor(undefined)).toEqual({ kind: 'empty' })
    expect(parseCropAnchor('   ')).toEqual({ kind: 'empty' })
  })
  it('百分比对回填两轴', () => {
    expect(parseCropAnchor('50% 20%')).toMatchObject({ kind: 'axes', x: 50, y: 20 })
  })
  it('九宫格关键字对回填两轴', () => {
    expect(parseCropAnchor('center top')).toMatchObject({ kind: 'axes', x: 50, y: 0 })
    expect(parseCropAnchor('right bottom')).toMatchObject({ kind: 'axes', x: 100, y: 100 })
    expect(parseCropAnchor('center')).toMatchObject({ kind: 'axes', x: 50, y: 50 })
  })
  it('1.3.7 文档示例形态 center 20% 回填为水平居中、垂直 20', () => {
    expect(parseCropAnchor('center 20%')).toMatchObject({ kind: 'axes', x: 50, y: 20 })
  })
  it('表达不了的存量写法保留原文，交由「自定义」承载', () => {
    expect(parseCropAnchor('left 4mm top 6mm')).toMatchObject({ kind: 'custom', raw: 'left 4mm top 6mm' })
  })
})

describe('resolveCropAxis 判定可动轴（剪裁=等比铺满）', () => {
  const box = { widthMm: 35, heightMm: 45 }
  it('图比框更竖时只有垂直能动，位移 7.5mm', () => {
    expect(resolveCropAxis({ ...box, naturalWidth: 600, naturalHeight: 900 }))
      .toMatchObject({ axis: 'vertical', travelMm: 7.5 })
  })
  it('图比框更横时只有水平能动，位移 32.5mm', () => {
    expect(resolveCropAxis({ ...box, naturalWidth: 600, naturalHeight: 400 }))
      .toMatchObject({ axis: 'horizontal', travelMm: 32.5 })
  })
  it('图与框同比例时两轴都溢不出', () => {
    expect(resolveCropAxis({ ...box, naturalWidth: 35, naturalHeight: 45 }))
      .toMatchObject({ axis: 'none', travelMm: 0 })
  })
  it('拿不到图片自然尺寸（动态字段图未加载）时判不出，宿主据此降级为双轴', () => {
    expect(resolveCropAxis({ ...box, naturalWidth: 0, naturalHeight: 0 })).toMatchObject({ axis: 'unknown' })
    expect(resolveCropAxis(box)).toMatchObject({ axis: 'unknown' })
  })
})

describe('cropWindow 算出可视窗在原图上的位置（属性台示意图）', () => {
  it('竖人像居中时可视窗占满宽、占高 85.71% 并下移 7.14%', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 600, naturalHeight: 900 }, 50, 50)
    expect(w.widthPct).toBeCloseTo(100, 2)
    expect(w.leftPct).toBeCloseTo(0, 2)
    expect(w.topPct).toBeCloseTo(7.14, 2)
    expect(w.heightPct).toBeCloseTo(85.71, 2)
  })
  it('锚到顶部时窗贴原图顶端', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 600, naturalHeight: 900 }, 50, 0)
    expect(w.topPct).toBeCloseTo(0, 6)
  })
  it('尺寸未知时不给窗口，宿主隐藏示意图而不是画错框', () => {
    expect(cropWindow({ widthMm: 35, heightMm: 45 }, 50, 50)).toBeNull()
  })
})
