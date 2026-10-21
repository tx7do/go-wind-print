// print-core/src/designer/utils/__tests__/crop-anchor.spec.ts
// 裁剪锚点的结构化读写与「逐轴可挪余量」判定：canvas 与 common 共用同一份判据，避免两端各写一遍漂移。
// 数值判据用 35×45mm 框手推：cover 竖图 60×90 垂直 7.5mm、方图 120×120 水平 10mm、contain 方图垂直空位 10mm。
import { describe, it, expect } from 'vitest'
import { buildCropAnchor, parseCropAnchor, resolveCropTravel, cropWindow, CROP_GRID_OPTIONS, cropAxisLabel, cropAxisNote, cropPresetOptions, cropAxisFields, resolveDesignImageSrc, resolveCropPreview, CROP_SAMPLE_IMAGE } from '../crop-anchor.js'

describe('resolveDesignImageSrc 设计态地址', () => {
  it('{字段} 按 demo 数据求值，普通地址原样', () => {
    expect(resolveDesignImageSrc('{order.no}')).toBe('PO20260801001')
    expect(resolveDesignImageSrc('/docfiles/a.png')).toBe('/docfiles/a.png')
    expect(resolveDesignImageSrc()).toBe('')
  })
})

describe('resolveCropTravel 逐轴余量（两轴同时可挪，按缩放模式各算各的）', () => {
  const box = { widthMm: 35, heightMm: 45 }
  it('cover 竖图：等比铺满只有竖轴溢得出去，横轴贴满给 0', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 60, naturalHeight: 90, fit: 'cover' }))
      .toEqual({ x: 0, y: 7.5 })
  })
  it('cover 方图：竖轴贴满，横轴可挪 10mm', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 120, naturalHeight: 120, fit: 'cover' }))
      .toEqual({ x: 10, y: 0 })
  })
  it('contain 横图：图整张放进框，多余的是框内的空位——垂直可挪 27.5mm', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 120, naturalHeight: 60, fit: 'contain' }))
      .toEqual({ x: 0, y: 27.5 })
  })
  it('none 小图：按内在尺寸画（96dpi），两轴都有余量——这才叫同时能裁横与竖', () => {
    // 60px = 60 × 25.4/96 = 15.875mm
    expect(resolveCropTravel({ ...box, naturalWidth: 60, naturalHeight: 60, fit: 'none' }))
      .toEqual({ x: 19.13, y: 29.13 })
  })
  it('scale-down 大图：等比缩到放得下，缩不动的那一轴仍给 0', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 600, naturalHeight: 600, fit: 'scale-down' }))
      .toEqual({ x: 0, y: 10 })
  })
  it('fill 拉伸填满：两轴都被钉死，都没有余量', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 60, naturalHeight: 90, fit: 'fill' }))
      .toEqual({ x: 0, y: 0 })
  })
  it('未写缩放模式按 contain 口径（与画布/出纸缺省一致）', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 120, naturalHeight: 60 }))
      .toEqual({ x: 0, y: 27.5 })
  })
  it('拿不到图片尺寸时两轴都是 null（未知），宿主不能猜 0', () => {
    expect(resolveCropTravel({ ...box, fit: 'cover' })).toEqual({ x: null, y: null })
    expect(resolveCropTravel({ ...box, naturalWidth: 0, naturalHeight: 0, fit: 'cover' })).toEqual({ x: null, y: null })
  })
})

describe('放大比例把画面推大：图与框同比例也裁得动', () => {
  const box = { widthMm: 35, heightMm: 45 }
  it('cover 竖图 60×90：不放大只有竖轴 7.5mm，推到 200% 后两轴同时溢出', () => {
    const base = { ...box, naturalWidth: 60, naturalHeight: 90, fit: 'cover' }
    expect(resolveCropTravel(base)).toEqual({ x: 0, y: 7.5 })
    // 内容 70×105mm：框 35×45 → 横 35、竖 60
    expect(resolveCropTravel({ ...base, scalePct: 200 })).toEqual({ x: 35, y: 60 })
  })
  it('方图进方框（用户实测那一例）：铺满后刚好等于框，放大 135% 才多出一条边', () => {
    const square = { widthMm: 35, heightMm: 35, naturalWidth: 120, naturalHeight: 120, fit: 'cover' }
    expect(resolveCropTravel(square)).toEqual({ x: 0, y: 0 })
    // 内容 47.25×47.25 → 两轴各 12.25mm，档位随之回到九宫格
    expect(resolveCropTravel({ ...square, scalePct: 135 })).toEqual({ x: 12.25, y: 12.25 })
    expect(cropPresetOptions({ x: 0, y: 0 }, 50, 50)).toHaveLength(9)
    expect(cropPresetOptions(resolveCropTravel({ ...square, scalePct: 135 }), 50, 50)).toHaveLength(9)
  })
  it('放大只给剪裁档：contain 塞了比例仍按框内空位结算', () => {
    expect(resolveCropTravel({ ...box, naturalWidth: 120, naturalHeight: 60, fit: 'contain', scalePct: 200 }))
      .toEqual({ x: 0, y: 27.5 })
  })
  it('100 与非法值等同不放大（与 core crop-style 同一判据）', () => {
    const base = { ...box, naturalWidth: 60, naturalHeight: 90, fit: 'cover' }
    for (const scalePct of [undefined, 100, 99, NaN]) {
      expect(resolveCropTravel({ ...base, scalePct })).toEqual(resolveCropTravel(base))
    }
  })
  it('可视窗按放大后的画面落位：内容 90×90 时窗占 35/90 宽、半高，取左中即停在左缘、下移 25%', () => {
    const win = cropWindow({ ...box, naturalWidth: 120, naturalHeight: 120, fit: 'cover', scalePct: 200 }, 0, 50)
    expect(win?.leftPct).toBe(0)
    expect(win?.topPct).toBe(25)
    expect(win?.widthPct).toBeCloseTo(35 / 90 * 100, 4)
    expect(win?.heightPct).toBeCloseTo(50, 4)
  })
})

describe('数字框与档位（两框常驻，档位按有余量的轴给）', () => {
  it('两轴都常驻，各带本轴余量；余量为 0 的那一轴也在框里，只是挪不动', () => {
    const rows = cropAxisFields({ x: 10, y: 0 }, 30, 20)
    expect(rows.map(r => r.name)).toEqual(['horizontal', 'vertical'])
    expect(rows.map(r => r.travelMm)).toEqual([10, 0])
    expect(rows.map(r => r.value)).toEqual([30, 20])
  })
  it('余量未知时行照样给，travelMm 传 null 让宿主显示「未知」而不是 0', () => {
    expect(cropAxisFields({ x: null, y: null }, 50, 50).map(r => r.travelMm)).toEqual([null, null])
  })
  it('两轴都有余量给九宫格，只一轴有给该轴三档，档值仍带上另一轴', () => {
    expect(cropPresetOptions({ x: 10, y: 7.5 }, 50, 50)).toHaveLength(9)
    expect(cropPresetOptions({ x: 0, y: 7.5 }, 30, 50).map(o => o.value)).toEqual(['30,0', '30,50', '30,100'])
    expect(cropPresetOptions({ x: 10, y: 0 }, 50, 20).map(o => o.label)).toEqual(['左侧', '居中', '右侧'])
  })
  it('余量未知或全无时兜底九宫格，让用户自己挑而不是不给档', () => {
    expect(cropPresetOptions({ x: null, y: null }, 50, 50)).toHaveLength(9)
    expect(cropPresetOptions({ x: 0, y: 0 }, 50, 50)).toHaveLength(9)
  })
  it('一句话逐轴报数：两轴都能挪就把两个数都写出来', () => {
    expect(cropAxisNote({ x: 10, y: 7.5 })).toContain('水平可挪 10mm')
    expect(cropAxisNote({ x: 10, y: 7.5 })).toContain('垂直可挪 7.5mm')
    expect(cropAxisNote({ x: 0, y: 7.5 })).toBe('垂直可挪 7.5mm；水平这一轴已贴满，挪不动')
    expect(cropAxisNote({ x: 0, y: 0 })).toContain('没有可挪的余量')
    expect(cropAxisNote({ x: null, y: null })).toBe('')
    expect(cropAxisNote({ x: 0, y: 0 }, true)).toContain('保留')
  })
  it('可动轴标签带单位', () => {
    expect(cropAxisLabel('vertical')).toBe('垂直位置 (%)')
    expect(cropAxisLabel('horizontal')).toBe('水平位置 (%)')
  })
})

describe('CROP_GRID_OPTIONS 两轴档位表', () => {
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

describe('cropWindow 可视窗在原图上的位置（按缩放模式结算，两端共用）', () => {
  it('cover 竖人像居中：窗占满宽、占高 85.71% 并下移 7.14%', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 600, naturalHeight: 900, fit: 'cover' }, 50, 50)
    expect(w.widthPct).toBeCloseTo(100, 2)
    expect(w.leftPct).toBeCloseTo(0, 2)
    expect(w.topPct).toBeCloseTo(7.14, 2)
    expect(w.heightPct).toBeCloseTo(85.71, 2)
  })
  it('cover 锚到顶时窗贴原图顶端', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 600, naturalHeight: 900, fit: 'cover' }, 50, 0)
    expect(w.topPct).toBeCloseTo(0, 6)
  })
  it('cover 方图进竖框：被裁的是水平轴，锚到最右时窗贴原图右缘', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 120, naturalHeight: 120, fit: 'cover' }, 100, 50)
    expect(w.heightPct).toBeCloseTo(100, 2)
    expect(w.widthPct).toBeCloseTo(77.78, 2)
    expect(w.leftPct).toBeCloseTo(22.22, 2)
  })
  it('contain 图整张放进框：不裁切，窗就是整张原图', () => {
    const w = cropWindow({ widthMm: 35, heightMm: 45, naturalWidth: 120, naturalHeight: 120, fit: 'contain' }, 100, 100)
    expect(w).toEqual({ leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 })
  })
  it('尺寸未知时不给窗口，宿主隐藏示意图而不是画错框', () => {
    expect(cropWindow({ widthMm: 35, heightMm: 45, fit: 'cover' }, 50, 50)).toBeNull()
  })
})

describe('内置示例图与示意回落（只演示取位，不当图片占位）', () => {
  /** 固有尺寸从示例图产物自身读回：换一张比例不同的图，判轴口径就跟着变，这条必须失败 */
  function sampleIntrinsic(url: string): { width: number; height: number } {
    const svg = Buffer.from(url.split(',')[1], 'base64').toString('utf8')
    const width = Number(/<svg[^>]*\bwidth="(\d+)"/.exec(svg)?.[1])
    const height = Number(/<svg[^>]*\bheight="(\d+)"/.exec(svg)?.[1])
    if (!width || !height) throw new Error('示例图必须自带 width/height，否则浏览器报不出自然尺寸，余量会全成未知')
    return { width, height }
  }

  it('取不到图片地址时回落示例图，取到了就用业务自己的图', () => {
    expect(resolveCropPreview('')).toEqual({ src: CROP_SAMPLE_IMAGE, isSample: true })
    expect(resolveCropPreview(undefined)).toEqual({ src: CROP_SAMPLE_IMAGE, isSample: true })
    expect(resolveCropPreview('/docfiles/a.png')).toEqual({ src: '/docfiles/a.png', isSample: false })
  })
  it('未求值的表达式按「没有图」处理（T-17：直接当 src 用会渲染成破图并绕过示例兜底）', () => {
    expect(resolveCropPreview('{image}')).toEqual({ src: CROP_SAMPLE_IMAGE, isSample: true })
    expect(resolveCropPreview('  {a.b}  ')).toEqual({ src: CROP_SAMPLE_IMAGE, isSample: true })
    // demo 数据里没这个键时求值会原样留花括号，同样落回示例图
    expect(resolveCropPreview(resolveDesignImageSrc('{image}'))).toEqual({ src: CROP_SAMPLE_IMAGE, isSample: true })
    // 求值成功的地址不会被误伤
    expect(resolveCropPreview(resolveDesignImageSrc('{order.no}')).isSample).toBe(false)
  })
  it('示例图是正方形：cover 进 35×45 框只有水平挪 10mm，contain 留的是垂直空位 10mm', () => {
    const { width, height } = sampleIntrinsic(CROP_SAMPLE_IMAGE)
    expect([width, height]).toEqual([120, 120])
    const box = { widthMm: 35, heightMm: 45, naturalWidth: width, naturalHeight: height }
    expect(resolveCropTravel({ ...box, fit: 'cover' })).toEqual({ x: 10, y: 0 })
    expect(resolveCropTravel({ ...box, fit: 'contain' })).toEqual({ x: 0, y: 10 })
  })
})
