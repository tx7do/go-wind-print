// print-canvas/src/__tests__/CropAnchorField.spec.ts
// 裁剪锚点控件：位置档下拉 + 水平／垂直两框常驻 + 原图可视窗示意。
// 余量按缩放模式逐轴结算（core resolveCropTravel），图片尺寸由预览图真实 load 事件带出。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { CROP_SAMPLE_IMAGE } from '@worm-vue3-print/core/designer'
import CropAnchorField from '../components/property/CropAnchorField.vue'

const BOX = { widthMm: 35, heightMm: 45 }

function mountField(modelValue?: string, fit = 'cover', scale?: number) {
  return mount(CropAnchorField, {
    props: { fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: 'data:image/gif;base64,R0lGOD', modelValue, widthMm: BOX.widthMm, heightMm: BOX.heightMm, fit, scale },
  })
}

/** 让预览图带上自然尺寸并触发 load——真实浏览器就是这条路 */
async function withSize(wrapper: ReturnType<typeof mountField>, w: number, h: number) {
  const img = wrapper.find('img')
  Object.defineProperty(img.element, 'naturalWidth', { value: w, configurable: true })
  Object.defineProperty(img.element, 'naturalHeight', { value: h, configurable: true })
  await img.trigger('load')
  return wrapper
}

function labelOf(wrapper: ReturnType<typeof mountField>, text: string) {
  return wrapper.findAll('.pd-field').find(f => f.find('.pd-label').text().includes(text))
}
const preset = (wrapper: ReturnType<typeof mountField>) => labelOf(wrapper, '裁剪锚点')!.find('select')

describe('两框常驻与逐轴余量', () => {
  it('未设锚点时按缺省居中显示', () => {
    expect(preset(mountField()).element.value).toBe('50,50')
  })

  it('cover 竖图：两框都在，档位只给能动的那一轴，提示直说另一轴贴满', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    expect(labelOf(wrapper, '垂直位置')).toBeTruthy()
    expect(labelOf(wrapper, '水平位置')).toBeTruthy()
    expect(preset(wrapper).findAll('option').map(o => o.text())).toEqual(['顶部', '居中', '底部'])
    expect(wrapper.find('.pd-crop-note').text()).toBe('垂直可挪 7.5mm；水平这一轴已贴满，挪不动')
  })

  it('cover 方图：换成水平能动，垂直轴照样在框里', async () => {
    const wrapper = await withSize(mountField(), 120, 120)
    expect(preset(wrapper).findAll('option').map(o => o.text())).toEqual(['左侧', '居中', '右侧'])
    expect(wrapper.find('.pd-crop-note').text()).toBe('水平可挪 10mm；垂直这一轴已贴满，挪不动')
  })

  it('原始尺寸小图：两轴都有余量，给九宫格并把两个数都报出来', async () => {
    const wrapper = await withSize(mountField(undefined, 'none'), 60, 60)
    expect(preset(wrapper).findAll('option')).toHaveLength(9)
    const note = wrapper.find('.pd-crop-note').text()
    expect(note).toContain('水平可挪 19.13mm')
    expect(note).toContain('垂直可挪 29.13mm')
  })

  it('contain 挪的是框内空位：方图进竖框垂直可挪 10mm', async () => {
    const wrapper = await withSize(mountField(undefined, 'contain'), 120, 120)
    expect(wrapper.find('.pd-crop-note').text()).toContain('垂直可挪 10mm')
  })

  it('拿不到自然尺寸时两框照样在、档位兜底九宫格，但不编造余量', () => {
    const wrapper = mountField()
    expect(labelOf(wrapper, '水平位置')).toBeTruthy()
    expect(labelOf(wrapper, '垂直位置')).toBeTruthy()
    expect(preset(wrapper).findAll('option')).toHaveLength(9)
    expect(wrapper.find('.pd-crop-note').exists()).toBe(false)
  })

  it('图与框同比例时直说没有可挪的余量', async () => {
    const wrapper = await withSize(mountField(), 35, 45)
    expect(wrapper.find('.pd-crop-note').text()).toContain('没有可挪的余量')
  })
})

describe('写回与存量回显', () => {
  it('位置档选「顶部」写回 50% 0%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await preset(wrapper).setValue('50,0')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 0%'])
  })

  it('数字框改到 20 写回 50% 20%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await labelOf(wrapper, '垂直位置')!.find('input').setValue('20')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 20%'])
  })

  it('水平轴也能单独写回：数字框改到 30 得 30% 50%', async () => {
    const wrapper = await withSize(mountField(), 120, 120)
    await labelOf(wrapper, '水平位置')!.find('input').setValue('30')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['30% 50%'])
  })

  it('两轴都回到居中时写回 undefined，而不是空串', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await preset(wrapper).setValue('50,0')
    await preset(wrapper).setValue('50,50')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([undefined])
  })

  it('存量写法归一不了时选中「自定义」且不回写，改了才整体替换', async () => {
    const wrapper = await withSize(mountField('left 4mm top 6mm'), 600, 900)
    expect(preset(wrapper).element.value).toBe('custom')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await labelOf(wrapper, '垂直位置')!.find('input').setValue('30')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 30%'])
  })
})

describe('可视窗示意', () => {
  it('拿到自然尺寸后画出窗位：cover 竖图居中时占满宽、高 85.71% 下移 7.14%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    const win = wrapper.find('.pd-crop-win')
    expect(win.attributes('style')).toContain('width: 100%')
    expect(win.attributes('style')).toContain('height: 85.7143%')
    expect(win.attributes('style')).toContain('top: 7.1429%')
  })

  it('拿不到自然尺寸时不画窗，避免画一个错框误导用户', () => {
    expect(mountField().find('.pd-crop-win').exists()).toBe(false)
  })

  it('没有图片地址时不空着，用内置示例图演示取位并说明这是示例', () => {
    const wrapper = mount(CropAnchorField, {
      props: { fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: '', modelValue: undefined, widthMm: 35, heightMm: 45, fit: 'cover' },
    })
    expect(wrapper.find('.pd-crop-preview img').attributes('src')).toBe(CROP_SAMPLE_IMAGE)
    expect(wrapper.text()).toContain('示例图')
  })

  it('src 是未求值的表达式时不画破图：同样回落示例图（T-17）', () => {
    const wrapper = mount(CropAnchorField, {
      props: { fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: '{image}', modelValue: undefined, widthMm: 35, heightMm: 45, fit: 'cover' },
    })
    expect(wrapper.find('.pd-crop-preview img').attributes('src')).toBe(CROP_SAMPLE_IMAGE)
    expect(wrapper.text()).toContain('示例图')
  })

  it('破图不留在旧尺寸上：load 过再 error 即改口「余量未知」，取景窗与可挪量一起收掉', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    expect(wrapper.find('.pd-crop-win').exists()).toBe(true)
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('.pd-crop-win').exists()).toBe(false)
    expect(wrapper.find('.pd-crop-note').exists()).toBe(false)
  })

  it('换图即清尺寸：新图 load 之前不拿上一张的余量说话', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await wrapper.setProps({ src: 'data:image/gif;base64,R0lGODdh' })
    expect(wrapper.find('.pd-crop-win').exists()).toBe(false)
    await withSize(wrapper, 120, 120)
    expect(wrapper.find('.pd-crop-win').exists()).toBe(true)
  })
})

describe('放大比例：铺满后把画面推大，才有多出来的边可裁', () => {
  /** 方框 + 方图：不放大时图刚好等于框，两轴都挪不动（用户实测到的那一例） */
  function mountSquare(scale?: number) {
    return mount(CropAnchorField, {
      props: {
        fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: 'data:image/gif;base64,R0lGOD',
        modelValue: undefined, widthMm: 35, heightMm: 35, fit: 'cover', scale,
      },
    })
  }

  it('行在锚点下方，区间 100~400、步长 5，未设置显占位而不是擅自填 100', () => {
    const row = labelOf(mountField(), '放大比例')!
    const input = row.find('input')
    expect(input.attributes('min')).toBe('100')
    expect(input.attributes('max')).toBe('400')
    expect(input.attributes('step')).toBe('5')
    expect(input.element.value).toBe('')
    expect(input.attributes('placeholder')).toContain('100')
  })

  it('点「+」从 100 起步发到 105，宿主收到 update:scale', async () => {
    const wrapper = mountField()
    const row = labelOf(wrapper, '放大比例')!
    await row.find('.pd-step-plus').trigger('click')
    expect(wrapper.emitted('update:scale')?.[0]).toEqual([105])
  })

  it('从 105 改回 100 等同不放大：撤成 undefined 而不是存一个 100', async () => {
    const wrapper = mountField(undefined, 'cover', 105)
    const row = labelOf(wrapper, '放大比例')!
    expect(row.find('input').element.value).toBe('105')
    await row.find('input').setValue('100')
    await row.find('input').trigger('change')
    expect(wrapper.emitted('update:scale')?.at(-1)).toEqual([undefined])
  })

  it('方框方图放大到 135%：两轴各多出 12.25mm 可挪，档位随之回到九宫格', async () => {
    const wrapper = await withSize(mountSquare(135), 120, 120)
    expect(wrapper.find('.pd-crop-note').text()).toContain('水平可挪 12.25mm')
    expect(wrapper.find('.pd-crop-note').text()).toContain('垂直可挪 12.25mm')
    expect(labelOf(wrapper, '裁剪锚点')!.find('select').findAll('option')).toHaveLength(9)
  })

  it('不放大时同一张方图确实裁不动：提示直说两轴都没有余量', async () => {
    const wrapper = await withSize(mountSquare(), 120, 120)
    expect(wrapper.find('.pd-crop-note').text()).toContain('没有可挪的余量')
  })
})
