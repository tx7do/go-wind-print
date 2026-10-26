import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import AppearanceGroup from '../components/property/AppearanceGroup.vue'
import { createDefaultOptions } from '@worm-vue3-print/core/designer'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'

function setup(type: 'text' | 'longText' | 'image', options: Record<string, any> = {}) {
  const element = reactive({
    id: 'el-1',
    options: { ...createDefaultOptions(type), ...options },
    printElementType: { type, title: type },
  }) as unknown as RuntimeElement
  return { element, w: mount(AppearanceGroup, { props: { element, isTextType: type !== 'image' } }) }
}

function rowOf(w: any, text: string) {
  const row = w.findAll('.pd-field').find((f: any) => f.find('.pd-label').exists() && f.find('.pd-label').text().includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

describe('外观组「恢复默认值」派生落点', () => {
  it('字体大小：出厂 12，改 18 后亮态，点击写回 12（不是删键）', async () => {
    const { element, w } = setup('text', { fontSize: 18 })
    const btn = rowOf(w, '字体大小').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.fontSize).toBe(12)
  })

  it('行高随元素类型派生：text 出厂未设⇒灰；longText 出厂 18，改 30 后点击回 18', async () => {
    expect(rowOf(setup('text').w, '行高').find('.pd-reset-btn').classes()).not.toContain('is-dirty')
    const { element, w } = setup('longText', { lineHeight: 30 })
    const btn = rowOf(w, '行高').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.lineHeight).toBe(18)
  })

  it('对齐出厂 left、缩放模式出厂 contain，改过都能点回出厂值', async () => {
    const t = setup('text', { textAlign: 'center' })
    await rowOf(t.w, '对齐').find('.pd-reset-btn').trigger('click')
    expect(t.element.options.textAlign).toBe('left')

    const i = setup('image', { fit: 'cover' })
    await rowOf(i.w, '缩放模式').find('.pd-reset-btn').trigger('click')
    expect(i.element.options.fit).toBe('contain')
  })

  it('颜色未设即灰态；设过之后点击删键回落', async () => {
    expect(rowOf(setup('text').w, '颜色').find('.pd-reset-btn').classes()).not.toContain('is-dirty')
    const { element, w } = setup('text', { color: '#ff0000' })
    const btn = rowOf(w, '颜色').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.color).toBeUndefined()
  })

  it('提示语分两档：有具名常量带数字，没有则只写「恢复默认值」', () => {
    const { w } = setup('text', { textFit: 'shrink', fontSize: 18 })
    expect(rowOf(w, '最小字号').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值（6 pt）')
    expect(rowOf(w, '字体大小').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值')
  })

  it('14 个外观行全部挂上图标，且标签文本不含"默认"二字', () => {
    const { w } = setup('text', { fontSize: 18 })
    const labels = ['字体', '字体大小', '字体粗细', '对齐', '垂直对齐', '颜色', '背景色',
      '行高', '字间距', '文字溢出', '自动换行']
    for (const t of labels) expect(rowOf(w, t).find('.pd-reset-btn').exists()).toBe(true)
    for (const l of w.findAll('.pd-label')) expect(l.text()).not.toContain('默认')
  })

  it('裁剪锚点：主行与放大比例各一个图标，水平/垂直两行不挂（同一键不重复挂）', () => {
    const { w } = setup('image', { fit: 'cover', fitScale: 250 })
    const rows = w.findAll('.pd-field').filter(f => f.find('.pd-reset-btn').exists())
    const anchorRows = rows.filter(f => ['裁剪锚点', '放大比例'].some(t => f.find('.pd-label').text().includes(t)))
    expect(anchorRows.length).toBe(2)
    expect(rowOf(w, '裁剪锚点').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值')
    expect(rowOf(w, '放大比例').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值（100 %）')
  })
})
