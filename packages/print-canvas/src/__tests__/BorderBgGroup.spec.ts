import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import BorderBgGroup from '../components/property/BorderBgGroup.vue'
import type { ElementBorderSide, RuntimeElement } from '@worm-vue3-print/core/designer'

function makeElement(type: string, options: Record<string, unknown> = {}): RuntimeElement {
  return reactive({
    id: `el-${type}`,
    options: { left: 0, top: 0, width: 20, height: 10, ...options },
    printElementType: { type, title: type },
  }) as unknown as RuntimeElement
}

function mountGroup(element: RuntimeElement) {
  return mount(BorderBgGroup, { props: { element } })
}

const presetBtn = (w: ReturnType<typeof mountGroup>, label: string) =>
  w.findAll('.border-presets button').find(b => b.text() === label)

describe('BorderBgGroup 元素边框入口', () => {
  it('文本元素给线型、四档预设与四边勾选', () => {
    const w = mountGroup(makeElement('text'))
    const labels = w.findAll('.pd-label').map(l => l.text())
    expect(labels).toEqual(expect.arrayContaining(['线型', '边框宽度', '边框颜色', '背景色']))
    expect(w.findAll('.border-presets button').map(b => b.text())).toEqual(['全部', '外侧', '内部', '无'])
    expect(w.findAll('.pd-checkbox-group .pd-checkbox span').map(s => s.text())).toEqual(['上', '右', '下', '左'])
  })

  it('rect／oval／hline／vline／table 用 border 画自身本体，不给预设与单边', () => {
    for (const type of ['rect', 'oval', 'hline', 'vline', 'table']) {
      const w = mountGroup(makeElement(type))
      expect(w.find('.border-presets').exists(), `${type} 不应给预设行`).toBe(false)
      expect(w.find('.pd-checkbox-group').exists(), `${type} 不应给单边行`).toBe(false)
      // 整圈三字段对这些类型仍有意义（线条粗细），入口保留
      expect(w.findAll('.pd-label').map(l => l.text())).toContain('边框宽度')
    }
  })

  it('「内部」对元素无意义，按钮置灰且提示说破原因', () => {
    const w = mountGroup(makeElement('text'))
    expect(presetBtn(w, '内部')!.attributes('disabled')).toBeDefined()
    expect(w.find('.pd-hint').text()).toContain('「内部」仅表格单元格可用')
  })

  it('改线型即时写 options.borderStyle 并请求记历史', async () => {
    const element = makeElement('text')
    const w = mountGroup(element)
    await w.find('select').setValue('dashed')
    expect(element.options.borderStyle).toBe('dashed')
    expect(w.emitted('change')).toBeTruthy()
  })

  it('未设线型的存量元素显示实线，未被用户改动前不写入模板', () => {
    const element = makeElement('text', { borderWidth: 1 })
    const w = mountGroup(element)
    expect((w.find('select').element as HTMLSelectElement).value).toBe('solid')
    expect(element.options.borderStyle).toBeUndefined()
  })
})

describe('BorderBgGroup 预设与单边落盘', () => {
  it('点「全部」按当前整圈规格铺满四边，并清掉已勾选的单边', async () => {
    const element = makeElement('text', {
      borderWidth: 2, borderStyle: 'dotted', borderColor: '#ff0000', borders: { top: { width: 1, style: 'solid', color: '#000000' } },
    })
    const w = mountGroup(element)
    await presetBtn(w, '全部')!.trigger('click')
    expect(element.options.borders).toBeUndefined()
    expect([element.options.borderWidth, element.options.borderStyle, element.options.borderColor])
      .toEqual([2, 'dotted', '#ff0000'])
  })

  it('「外侧」与「全部」同效（元素只有一圈边，沿用工具栏既有口径）', async () => {
    const a = makeElement('text', { borderWidth: 1 })
    const b = makeElement('text', { borderWidth: 1 })
    await presetBtn(mountGroup(a), '全部')!.trigger('click')
    await presetBtn(mountGroup(b), '外侧')!.trigger('click')
    expect(b.options).toEqual(a.options)
  })

  it('宽度为 0 时点「全部」兜到缺省档，按钮不会空转', async () => {
    const element = makeElement('text', { borderWidth: 0 })
    const w = mountGroup(element)
    await presetBtn(w, '全部')!.trigger('click')
    expect(element.options.borderWidth).toBe(0.75)
  })

  it('点「无」只把宽度归零：线型与颜色留着，改回宽度即恢复原样', async () => {
    const element = makeElement('text', {
      borderWidth: 2, borderStyle: 'dashed', borderColor: '#123456', borders: { left: { width: 2 } },
    })
    const w = mountGroup(element)
    await presetBtn(w, '无')!.trigger('click')
    expect(element.options.borderWidth).toBe(0)
    expect(element.options.borderStyle).toBe('dashed')
    expect(element.options.borderColor).toBe('#123456')
    expect(element.options.borders).toBeUndefined()
  })

  it('整圈生效时四条边都算可见；撤「上」把其余三边展开成分边、整圈宽度归零', async () => {
    const element = makeElement('text', { borderWidth: 1.5, borderStyle: 'solid', borderColor: '#333333' })
    const w = mountGroup(element)
    const boxes = w.findAll('.pd-checkbox-group input[type="checkbox"]')
    expect(boxes.map(b => (b.element as HTMLInputElement).checked), '整圈 1.5pt ⇒ 四边都有线').toEqual([true, true, true, true])

    await boxes[0].setValue(false)
    expect(element.options.borderWidth, '整圈宽度归零').toBe(0)
    expect(element.options.borders!.top).toBeUndefined()
    expect(['right', 'bottom', 'left'].map(k => element.options.borders![k as ElementBorderSide])).toEqual([
      { width: 1.5, style: 'solid', color: '#333333' },
      { width: 1.5, style: 'solid', color: '#333333' },
      { width: 1.5, style: 'solid', color: '#333333' },
    ])
  })

  it('整圈没生效时勾一条边只写那条分边，规格取已有分边（不动整圈三字段）', async () => {
    const element = makeElement('text', { borders: { bottom: { width: 2, style: 'dashed', color: '#123456' } } })
    const w = mountGroup(element)
    const boxes = w.findAll('.pd-checkbox-group input[type="checkbox"]')
    expect(boxes.map(b => (b.element as HTMLInputElement).checked)).toEqual([false, false, true, false])
    await boxes[0].setValue(true)
    expect(element.options.borders!.top).toEqual({ width: 2, style: 'dashed', color: '#123456' })
    expect(element.options.borderWidth).toBeUndefined()
  })

  it('单边不改整圈三字段，也不要求先点预设', async () => {
    const element = makeElement('text')
    const w = mountGroup(element)
    await w.findAll('.pd-checkbox-group input[type="checkbox"]')[1].setValue(true)
    expect(element.options.borders!.right).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    expect(element.options.borderWidth).toBeUndefined()
  })
})

describe('BorderBgGroup 三行回显当前生效规格（方案 B）', () => {
  const field = (w: ReturnType<typeof mountGroup>, label: string) =>
    w.findAll('.pd-field').find(f => (f.find('.pd-label').text().replace(/\s/g, '')).startsWith(label))!
  const numInput = (w: ReturnType<typeof mountGroup>) =>
    field(w, '边框宽度').find('input[type="number"]').element as HTMLInputElement
  const styleSelect = (w: ReturnType<typeof mountGroup>) =>
    field(w, '线型').find('select').element as HTMLSelectElement
  const colorTitle = (w: ReturnType<typeof mountGroup>) =>
    field(w, '边框颜色').find('.preset-color-trigger').attributes('title')

  it('整圈未设、只有一条分边 ⇒ 三行回显该分边规格（此前三行是空的）', () => {
    const w = mountGroup(makeElement('text', { borders: { right: { width: 1.5, style: 'dotted', color: '#abcdef' } } }))
    expect(styleSelect(w).value).toBe('dotted')
    expect(numInput(w).value).toBe('1.5')
    expect(colorTitle(w)).toBe('#abcdef')
  })

  it('分边规格不一 ⇒ 宽度留空并显示「混合」占位，线型行出「混合」项', () => {
    const w = mountGroup(makeElement('text', {
      borders: { top: { width: 1, style: 'solid', color: '#000000' }, right: { width: 2, style: 'dashed', color: '#ffffff' } },
    }))
    expect(numInput(w).value).toBe('')
    expect(numInput(w).placeholder, '宽度应报混合而不是假充某个数').toContain('混合')
    expect(styleSelect(w).value).toBe('')
    expect(field(w, '线型').findAll('option').map(o => o.text())).toContain('混合')
  })

  it('已有边框时改宽度：按新规格整圈化并清掉分边覆盖（不留"改了没反应"的分边）', async () => {
    const element = makeElement('text', {
      borderWidth: 1, borderStyle: 'solid', borderColor: '#333333', borders: { top: { width: 1, style: 'solid', color: '#333333' } },
    })
    const w = mountGroup(element)
    await w.find('.border-row input[type="number"]').setValue('3')
    expect(element.options.borderWidth).toBe(3)
    expect(element.options.borders, '分边覆盖一并清掉').toBeUndefined()
    expect(element.options.borderColor, '颜色沿用现值，不替作者改').toBe('#333333')
    expect(w.emitted('change'), '整圈化要进历史').toBeTruthy()
  })

  it('完全无边框的元素选一个线型＝开一条缺省宽度的框（线型就是"有没有框"的开关）', async () => {
    const element = makeElement('text')
    const w = mountGroup(element)
    await field(w, '线型').find('select').setValue('dashed')
    expect(element.options.borderStyle).toBe('dashed')
    expect(element.options.borderWidth).toBe(0.75)
    expect(element.options.borderColor, '颜色仍留未设').toBeUndefined()
    expect(w.emitted('change')).toBeTruthy()
  })
})

describe('元素台线型可设为「无」', () => {
  const field = (w: ReturnType<typeof mountGroup>, label: string) =>
    w.findAll('.pd-field').find(f => (f.find('.pd-label').text().replace(/\s/g, '')).startsWith(label))!

  it('线型下拉含「无」；完全没有边框的元素线型就显示「无」（不再假充实线）', () => {
    const w = mountGroup(makeElement('text'))
    expect(field(w, '线型').findAll('option').map(o => o.text())).toEqual(['无', '实线', '虚线', '点线', '双线'])
    expect((field(w, '线型').find('select').element as HTMLSelectElement).value).toBe('none')
  })

  it('已有边框时选「无」＝清边框：宽度归零、分边清空、线型记成 none', async () => {
    const element = makeElement('text', {
      borderWidth: 2, borderStyle: 'dashed', borderColor: '#123456', borders: { top: { width: 2, style: 'dashed', color: '#123456' } },
    })
    const w = mountGroup(element)
    await field(w, '线型').find('select').setValue('none')
    expect(element.options.borderWidth).toBe(0)
    expect(element.options.borders).toBeUndefined()
    expect(element.options.borderStyle).toBe('none')
    expect(w.emitted('change')).toBeTruthy()
  })
})
