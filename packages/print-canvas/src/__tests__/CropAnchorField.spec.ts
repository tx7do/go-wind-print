// print-canvas/src/__tests__/CropAnchorField.spec.ts
// 裁剪锚点控件：位置档下拉 + 单轴数字框 + 原图可视窗示意；判轴靠预览图真实 load 事件带出的自然尺寸。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CropAnchorField from '../components/property/CropAnchorField.vue'

const BOX = { widthMm: 35, heightMm: 45 }

function mountField(modelValue?: string) {
  return mount(CropAnchorField, {
    props: { fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: 'data:image/gif;base64,R0lGOD', modelValue, widthMm: BOX.widthMm, heightMm: BOX.heightMm },
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

describe('位置档与数字框', () => {
  it('未设锚点时按缺省居中显示', () => {
    const wrapper = mountField()
    expect(labelOf(wrapper, '裁剪锚点')!.find('select').element.value).toBe('50,50')
  })

  it('竖图放进竖框：只有垂直能动，出一个数字框并标注可挪余量', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    expect(labelOf(wrapper, '垂直位置')).toBeTruthy()
    expect(labelOf(wrapper, '水平位置')).toBeFalsy()
    expect(wrapper.find('.pd-crop-note').text()).toContain('7.5')
  })

  it('横图放进竖框：换成水平能动', async () => {
    const wrapper = await withSize(mountField(), 600, 400)
    expect(labelOf(wrapper, '水平位置')).toBeTruthy()
    expect(labelOf(wrapper, '垂直位置')).toBeFalsy()
  })

  it('自然尺寸还没拿到时降级成两个数字框，不让用户对着空转的框发愣', () => {
    const wrapper = mountField()
    expect(labelOf(wrapper, '水平位置')).toBeTruthy()
    expect(labelOf(wrapper, '垂直位置')).toBeTruthy()
  })

  it('位置档选「顶部」写回 50% 0%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await labelOf(wrapper, '裁剪锚点')!.find('select').setValue('50,0')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 0%'])
  })

  it('数字框改到 20 写回 50% 20%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await labelOf(wrapper, '垂直位置')!.find('input').setValue('20')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 20%'])
  })

  it('两轴都回到居中时写回 undefined，而不是空串', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    await labelOf(wrapper, '裁剪锚点')!.find('select').setValue('50,0')
    await labelOf(wrapper, '裁剪锚点')!.find('select').setValue('50,50')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([undefined])
  })

  it('存量写法归一不了时选中「自定义」且不回写，改了才整体替换', async () => {
    const wrapper = await withSize(mountField('left 4mm top 6mm'), 600, 900)
    expect(labelOf(wrapper, '裁剪锚点')!.find('select').element.value).toBe('custom')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await labelOf(wrapper, '垂直位置')!.find('input').setValue('30')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['50% 30%'])
  })

  it('图与框同比例时直说没有可挪余量，不摆一个没用的框', async () => {
    const wrapper = await withSize(mountField(), 35, 45)
    expect(wrapper.find('.pd-crop-note').text()).toContain('没有可挪动的余量')
  })
})

describe('可视窗示意', () => {
  it('拿到自然尺寸后画出窗位：竖图居中时占满宽、高 85.71% 下移 7.14%', async () => {
    const wrapper = await withSize(mountField(), 600, 900)
    const win = wrapper.find('.pd-crop-win')
    expect(win.attributes('style')).toContain('width: 100%')
    expect(win.attributes('style')).toContain('height: 85.7143%')
    expect(win.attributes('style')).toContain('top: 7.1429%')
  })

  it('拿不到自然尺寸时不画窗，避免画一个错框误导用户', () => {
    const wrapper = mountField()
    expect(wrapper.find('.pd-crop-win').exists()).toBe(false)
  })

  it('没有图片地址时整块示意不出现', () => {
    const wrapper = mount(CropAnchorField, {
      props: { fieldKey: 'ap-img-object-position', label: '裁剪锚点', src: '', modelValue: undefined, widthMm: 35, heightMm: 45 },
    })
    expect(wrapper.find('.pd-crop-preview').exists()).toBe(false)
  })
})
