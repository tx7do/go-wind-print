// 边框与背景组「恢复默认值」：三条 HEAD 里既有的行（线型/预设/单边属另一项在途改动，不在本测试范围）
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import BorderBgGroup from '../components/property/BorderBgGroup.vue'
import { createDefaultOptions } from '@go-wind/print-core/designer'
import type { RuntimeElement } from '@go-wind/print-core/designer'

function setup(type: 'text' | 'rect' | 'hline', options: Record<string, any> = {}) {
  const element = reactive({
    id: 'el-1',
    options: { ...createDefaultOptions(type), ...options },
    printElementType: { type, title: type },
  }) as unknown as RuntimeElement
  return { element, w: mount(BorderBgGroup, { props: { element } }) }
}

function rowOf(w: any, text: string) {
  const row = w.findAll('.pd-field').find((f: any) => f.find('.pd-label').exists() && f.find('.pd-label').text().includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

describe('边框与背景「恢复默认值」派生落点', () => {
  it('文本元素：三行都挂图标，且出厂未设 ⇒ 一律判为偏离、点击删键', async () => {
    const { element, w } = setup('text', { borderWidth: 2, borderColor: '#ff0000', backgroundColor: '#00ff00' })
    for (const t of ['边框宽度', '边框颜色', '背景色']) {
      const b = rowOf(w, t).find('.pd-reset-btn')
      expect(b.exists(), `缺图标：${t}`).toBe(true)
      expect(b.classes(), `应为偏离态：${t}`).toContain('is-dirty')
      expect(b.attributes('data-tip'), `提示不对：${t}`).toBe('恢复默认值')
    }
    await rowOf(w, '边框宽度').find('.pd-reset-btn').trigger('click')
    await rowOf(w, '边框颜色').find('.pd-reset-btn').trigger('click')
    await rowOf(w, '背景色').find('.pd-reset-btn').trigger('click')
    expect(element.options.borderWidth).toBeUndefined()
    expect(element.options.borderColor).toBeUndefined()
    expect(element.options.backgroundColor).toBeUndefined()
  })

  it('矩形：出厂自带 1pt/#333 ⇒ 删回去改字面值，回落指向同一组值', async () => {
    const { element, w } = setup('rect', { borderWidth: 3, borderColor: '#000000' })
    expect(rowOf(w, '边框宽度').find('.pd-reset-btn').classes()).toContain('is-dirty')
    await rowOf(w, '边框宽度').find('.pd-reset-btn').trigger('click')
    await rowOf(w, '边框颜色').find('.pd-reset-btn').trigger('click')
    expect(element.options.borderWidth).toBe(1)
    expect(element.options.borderColor).toBe('#333')
  })

  it('等于出厂值时图标是灰的（不产生历史条目）', () => {
    const { w } = setup('hline', { borderWidth: 0.75 })
    expect(rowOf(w, '边框宽度').find('.pd-reset-btn').classes()).not.toContain('is-dirty')
  })
})
