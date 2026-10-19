// GitHub issue #4 画布端契约：justify 三端同策、首行缩进 em、image fit/锚点消费
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TextElement from '../components/elements/TextElement.vue'
import AppearanceGroup from '../components/property/AppearanceGroup.vue'
import LongTextElement from '../components/elements/LongTextElement.vue'
import PageNumberElement from '../components/elements/PageNumberElement.vue'
import ImageElement from '../components/elements/ImageElement.vue'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'

function makeEl(type: string, options: Partial<RuntimeElement['options']> = {}): RuntimeElement {
  return {
    id: 'el-test',
    options: { left: 0, top: 0, width: 42.3, height: 7.1, ...options },
    printElementType: { type: type as any, title: type },
  }
}
function styleOf(w: { element: Element }): string {
  return (w.element.getAttribute('style') ?? '').replace(/\s/g, '')
}

describe('TextElement justify', () => {
  it('justify × verticalAlign=middle：主轴转纵向，行盒占满宽', () => {
    const s = styleOf(mount(TextElement, { props: { element: makeEl('text', { textAlign: 'justify', verticalAlign: 'middle', formatter: '文本' }), designMode: true } }))
    expect(s).toContain('display:flex')
    expect(s).toContain('flex-direction:column')
    expect(s).toContain('justify-content:center')
    expect(s).toContain('text-align:justify')
  })
  it('justify 补 text-align-last，单行才会撑满行宽（与出纸同策）', () => {
    const s = styleOf(mount(TextElement, { props: { element: makeEl('text', { textAlign: 'justify', formatter: '文本' }), designMode: true } }))
    expect(s).toContain('text-align:justify')
    expect(s).toContain('text-align-last:justify')
  })
  it('存量右对齐不输出 text-align-last', () => {
    const s = styleOf(mount(TextElement, { props: { element: makeEl('text', { textAlign: 'right', formatter: '文本' }), designMode: true } }))
    expect(s).not.toContain('text-align-last')
  })
  it('存量右对齐 × 底部仍走横向 flex', () => {
    const s = styleOf(mount(TextElement, { props: { element: makeEl('text', { textAlign: 'right', verticalAlign: 'bottom', formatter: '文本' }), designMode: true } }))
    expect(s).toContain('align-items:flex-end')
    expect(s).toContain('justify-content:flex-end')
    expect(s).not.toContain('flex-direction')
  })
})

describe('LongTextElement 首行缩进', () => {
  it('longTextIndent=2 → text-indent:2em（与出纸同单位）', () => {
    expect(styleOf(mount(LongTextElement, { props: { element: makeEl('longText', { longTextIndent: 2, formatter: '长文本' }), designMode: true } }))).toContain('text-indent:2em')
  })
  it('未设时缩进为 0', () => {
    expect(styleOf(mount(LongTextElement, { props: { element: makeEl('longText', { formatter: '长文本' }), designMode: true } }))).toContain('text-indent:0')
  })
  it('justify 同样补 text-align-last', () => {
    expect(styleOf(mount(LongTextElement, { props: { element: makeEl('longText', { textAlign: 'justify', formatter: '长文本' }), designMode: true } })))
      .toContain('text-align-last:justify')
  })
})

describe('PageNumberElement justify', () => {
  it('justify 补 text-align-last（出纸走 core textStyle，画布不能落后）', () => {
    expect(styleOf(mount(PageNumberElement, { props: { element: makeEl('pageNumber', { textAlign: 'justify', title: '第 1 页' }), designMode: true } })))
      .toContain('text-align-last:justify')
  })
})

describe('ImageElement 缩放与锚点', () => {
  const SRC = 'data:image/gif;base64,R0lGOD'
  it('fit=cover 与 objectPosition 均落到 img', () => {
    const w = mount(ImageElement, { props: { element: makeEl('image', { src: SRC, fit: 'cover', objectPosition: 'center 20%' }), designMode: true } })
    const s = (w.find('img').attributes('style') ?? '').replace(/:\s+/g, ':')
    expect(s).toContain('object-fit:cover')
    expect(s).toContain('object-position:center 20%')
  })
  it('缺省时只有 object-fit:contain，不带 object-position', () => {
    const w = mount(ImageElement, { props: { element: makeEl('image', { src: SRC }), designMode: true } })
    const s = (w.find('img').attributes('style') ?? '').replace(/:\s+/g, ':')
    expect(s).toContain('object-fit:contain')
    expect(s).not.toContain('object-position')
  })
})
describe('AppearanceGroup 新增入口（issue #4 属性台暴露）', () => {
  it('长文本元素出现「首行缩进 (字符)」并可写入 longTextIndent', async () => {
    const w = mount(AppearanceGroup, { props: { element: makeEl('longText', { formatter: '长文本', longTextIndent: 1 }), isTextType: true } })
    // 属性台里有多个 number 输入（字号/行高/字间距…），必须按标签锁定缩进那一行
    const row = w.findAll('.pd-field').find(f => (f.find('.pd-label').text() || '').includes('首行缩进'))
    expect(row).toBeTruthy()
    expect(row!.find('input[type="number"]').element.value).toBe('1')
    await row!.find('.pd-step-plus').trigger('click')
    expect(w.props('element').options.longTextIndent).toBe(2)
    await row!.find('.pd-step-minus').trigger('click')
    await row!.find('.pd-step-minus').trigger('click')
    expect(w.props('element').options.longTextIndent).toBe(0)
    // 0 是合法值（不缩进），不能被当成「未设置」丢键
    expect('longTextIndent' in w.props('element').options).toBe(true)
  })
  it('普通文本元素不出现缩进入口（该字段仅 longText 消费）', () => {
    const w = mount(AppearanceGroup, { props: { element: makeEl('text', { formatter: '文本' }), isTextType: true } })
    expect([...w.findAll('.pd-label')].some(l => (l.text() || '').includes('首行缩进'))).toBe(false)
  })
  it('图片元素出现缩放模式与裁剪锚点，且写入 options', async () => {
    const w = mount(AppearanceGroup, { props: { element: makeEl('image', { src: 'a' }), isTextType: false } })
    const select = w.find('select.pd-select').element as HTMLSelectElement
    expect(select.options[1].value).toBe('cover')
    select.value = 'cover'
    await select.dispatchEvent(new Event('change'))
    expect(w.props('element').options.fit).toBe('cover')
    const anchor = w.find('input.pd-input').element as HTMLInputElement
    anchor.value = ' center 20% '
    await anchor.dispatchEvent(new Event('input'))
    expect(w.props('element').options.objectPosition).toBe('center 20%')
  })
  it('图片锚点清空即回到未设置态，而不是存成空串', async () => {
    const w = mount(AppearanceGroup, { props: { element: makeEl('image', { src: 'a', objectPosition: 'top left' }), isTextType: false } })
    const anchor = w.find('input.pd-input').element as HTMLInputElement
    anchor.value = ''
    await anchor.dispatchEvent(new Event('input'))
    expect(w.props('element').options.objectPosition).toBeUndefined()
  })
})

