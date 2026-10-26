// T-26 #IKPXQL 需求2：元素级「保留换行符」——画布侧与属性台入口验收。
// 出纸侧判据在 core `resolveElementWhiteSpace` 单点，本文件证明画布真的消费同一份，
// 以及面板写入落的是 keepLineBreaks（而不是别的键）。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import TextElement from '../components/elements/TextElement.vue'
import LongTextElement from '../components/elements/LongTextElement.vue'
import AppearanceGroup from '../components/property/AppearanceGroup.vue'
import { createDefaultOptions } from '@worm-vue3-print/core/designer'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'

function makeEl(type: 'text' | 'longText', options: Record<string, any> = {}): RuntimeElement {
  return {
    id: 'el-1',
    options: { left: 0, top: 0, width: 60, height: 20, fontSize: 12, formatter: '第一行\n第二行', ...options },
    printElementType: { type, title: type },
  } as unknown as RuntimeElement
}

function styleOf(type: 'text' | 'longText', options: Record<string, any> = {}): string {
  const Ctor = type === 'text' ? TextElement : LongTextElement
  const w = mount(Ctor, { props: { element: makeEl(type, options), designMode: true } })
  return (w.element.getAttribute('style') ?? '').replace(/\s/g, '')
}

describe('画布元素消费「保留换行符」判据', () => {
  it('缺省不出 white-space（存量模板在画布上也逐字不变）', () => {
    expect(styleOf('text')).not.toContain('white-space')
    expect(styleOf('longText')).not.toContain('white-space')
  })

  it('打开后 text 与 longText 都出 pre-wrap', () => {
    expect(styleOf('text', { keepLineBreaks: true })).toContain('white-space:pre-wrap')
    expect(styleOf('longText', { keepLineBreaks: true })).toContain('white-space:pre-wrap')
  })

  it('longText 打开新档时，自适应行高（overflow:visible）不被顶掉', () => {
    const s = styleOf('longText', { keepLineBreaks: true })
    expect(s).toContain('overflow:visible')
    expect(s).toContain('white-space:pre-wrap')
  })

  it('关掉「自动换行」时单行优先：出 nowrap 且不出 pre-wrap', () => {
    const s = styleOf('text', { keepLineBreaks: true, wordWrap: false })
    expect(s).toContain('white-space:nowrap')
    expect(s).not.toContain('pre-wrap')
  })

  // T-27：画布对 longText 关自动换行的形态是「overflow:visible 与 nowrap 并存」，
  // core 出纸改成的正是这一组声明；这里钉住两端同形，防止再出现「画布单行、纸面多行」的分叉。
  it('longText 关自动换行：overflow:visible 与 nowrap 并存（与 core 出纸同形）', () => {
    const s = styleOf('longText', { wordWrap: false })
    expect(s).toContain('overflow:visible')
    expect(s).toContain('white-space:nowrap')
    expect(s).toContain('text-overflow:ellipsis')
    expect(s).not.toContain('pre-wrap')
    // 负对照：没关自动换行时不该出现 nowrap
    expect(styleOf('longText')).not.toContain('nowrap')
  })
})

describe('外观组的「保留换行符」行', () => {
  function setup(type: 'text' | 'longText', options: Record<string, any> = {}) {
    const element = reactive({
      id: 'el-1',
      options: { ...createDefaultOptions(type), ...options },
      printElementType: { type, title: type },
    }) as unknown as RuntimeElement
    return { element, w: mount(AppearanceGroup, { props: { element, isTextType: true } }) }
  }

  function rowOf(w: any, text: string) {
    const row = w.findAll('.pd-field').find((f: any) =>
      f.find('.pd-label').exists() && f.find('.pd-label').text().includes(text))
    if (!row) throw new Error(`未找到属性行：${text}`)
    return row
  }

  it('文本与长文本两类都有该行，且紧挨「自动换行」', () => {
    for (const type of ['text', 'longText'] as const) {
      const { w } = setup(type)
      const labels = w.findAll('.pd-label-t').map((l: any) => l.text())
      const iWrap = labels.findIndex((t: string) => t.includes('自动换行'))
      expect(iWrap, `${type} 找不到「自动换行」`).toBeGreaterThan(-1)
      expect(labels[iWrap + 1]).toContain('保留换行符')
    }
  })

  it('缺省未勾选；勾上写 true，取消回到未设（不是写 false）', async () => {
    const { element, w } = setup('text')
    const input = rowOf(w, '保留换行符').find('input')
    expect(input.element.checked).toBe(false)
    input.element.checked = true
    await input.trigger('input')
    expect(element.options.keepLineBreaks).toBe(true)
    input.element.checked = false
    await input.trigger('input')
    expect(element.options.keepLineBreaks).toBeUndefined()
  })

  it('「恢复默认值」按派生出厂值判脏：未设即灰，开后点亮，点一下回未设', async () => {
    const { element, w } = setup('text')
    const btn = rowOf(w, '保留换行符').find('.pd-reset-btn')
    expect(btn.classes()).not.toContain('is-dirty')
    element.options.keepLineBreaks = true
    await w.vm.$nextTick()
    expect(rowOf(w, '保留换行符').find('.pd-reset-btn').classes()).toContain('is-dirty')
    await rowOf(w, '保留换行符').find('.pd-reset-btn').trigger('click')
    expect(element.options.keepLineBreaks).toBeUndefined()
  })

  it('反面对照：该行不会把值写到别的键上', async () => {
    const { element, w } = setup('text')
    const input = rowOf(w, '保留换行符').find('input')
    input.element.checked = true
    await input.trigger('input')
    expect(element.options.wordWrap).toBeUndefined()
    expect(element.options.textFit).toBeUndefined()
  })
})
