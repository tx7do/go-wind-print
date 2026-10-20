import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppearanceGroup from '../components/property/AppearanceGroup.vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { DEFAULT_DEMO_DATA } from '@worm-vue3-print/core/designer'

function makeElement(type: string, options: Record<string, any> = {}): RuntimeElement {
  return {
    id: 'el-1',
    options: { left: 0, top: 0, width: 42.3, height: 7.1, fontSize: 12, formatter: '文本', ...options },
    printElementType: { type, title: type },
  } as unknown as RuntimeElement
}

function mountGroup(element: RuntimeElement) {
  return mount(AppearanceGroup, {
    props: { element, isTextType: true },
  })
}

/** 文字溢出下拉：模板中唯一含「自动缩小」选项的 select */
function fitSelect(wrapper: ReturnType<typeof mountGroup>) {
  return wrapper.findAll('select').find(s => s.text().includes('自动缩小'))!
}

describe('AppearanceGroup 文字溢出显示形式', () => {
  it('文本元素未配置时显示默认「截断」', () => {
    const wrapper = mountGroup(makeElement('text'))
    expect(fitSelect(wrapper).element.value).toBe('clip')
  })

  it('长文本元素未配置时显示默认「自适应行高」', () => {
    const wrapper = mountGroup(makeElement('longText'))
    expect(fitSelect(wrapper).element.value).toBe('autoHeight')
  })

  it('切换下拉写入 options.textFit', async () => {
    const element = makeElement('text')
    const wrapper = mountGroup(element)
    await fitSelect(wrapper).setValue('shrink')
    expect(element.options.textFit).toBe('shrink')
  })

  it('最小字号仅在选择「自动缩小」时出现', async () => {
    const wrapper = mountGroup(makeElement('text', { textFit: 'clip' }))
    expect(wrapper.text()).not.toContain('最小字号')

    await fitSelect(wrapper).setValue('shrink')
    expect(wrapper.text()).toContain('最小字号')
  })

  it('自动换行默认开启，取消勾选写入 wordWrap=false', async () => {
    const element = makeElement('text')
    const wrapper = mountGroup(element)
    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)

    await checkbox.setValue(false)
    expect(element.options.wordWrap).toBe(false)
  })
})

/** 图片元素：外观组里是缩放模式 + 裁剪锚点 */
function mountImage(element: RuntimeElement) {
  return mount(AppearanceGroup, { props: { element, isTextType: false } })
}

function makeImage(options: Record<string, any> = {}): RuntimeElement {
  return makeElement('image', { src: 'data:image/gif;base64,R0lGOD', width: 35, height: 45, ...options })
}

/** 缩放模式下拉：模板里唯一含「剪裁」选项的 select */
function imgFitSelect(wrapper: ReturnType<typeof mountImage>) {
  return wrapper.findAll('select').find(s => s.text().includes('剪裁（等比铺满后裁边）'))!
}

describe('AppearanceGroup 图片缩放模式与裁剪锚点', () => {
  it('cover 档对用户叫「剪裁」，不再出现旧文案「覆盖」', () => {
    const wrapper = mountImage(makeImage())
    expect(imgFitSelect(wrapper).text()).toContain('剪裁（等比铺满后裁边）')
    expect(wrapper.text()).not.toContain('覆盖（保持比例）')
  })

  it('缺省（包含）档就出锚点行：两轴都调得到，挪的是框内的空位', () => {
    const wrapper = mountImage(makeImage())
    expect(wrapper.text()).toContain('裁剪锚点')
    expect(wrapper.find('.pd-crop-preview').exists()).toBe(true)
  })

  it('只有拉伸填满不给锚点行：图被钉成框，没有取位可言', async () => {
    const element = makeImage()
    const wrapper = mountImage(element)
    await imgFitSelect(wrapper).setValue('fill')
    expect(element.options.fit).toBe('fill')
    expect(wrapper.text()).not.toContain('裁剪锚点')
  })

  it('切到剪裁写回 fit=cover，锚点行不消失（同一行了，不再切档才长出来）', async () => {
    const element = makeImage()
    const wrapper = mountImage(element)
    await imgFitSelect(wrapper).setValue('cover')
    expect(element.options.fit).toBe('cover')
    expect(wrapper.text()).toContain('裁剪锚点')
  })

  it('锚点控件写回 options.objectPosition，回到居中即撤掉该属性', async () => {
    const element = makeImage({ fit: 'cover' })
    const wrapper = mountImage(element)
    const anchorSelect = wrapper.find('[data-field="ap-img-object-position"] select')
    await anchorSelect.setValue('50,0')
    expect(element.options.objectPosition).toBe('50% 0%')

    await anchorSelect.setValue('50,50')
    expect(element.options.objectPosition).toBeUndefined()
  })

  it('表达式图片地址按设计态 demo 数据求值后进示意图', () => {
    const wrapper = mountImage(makeImage({ fit: 'cover', src: '{order.no}' }))
    expect(wrapper.find('.pd-crop-preview img').attributes('src')).toBe(DEFAULT_DEMO_DATA.order.no)
  })
})
