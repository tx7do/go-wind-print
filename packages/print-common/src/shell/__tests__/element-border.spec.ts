// @vitest-environment happy-dom
// 元素台边框入口 Common 端契约：与 canvas 的 BorderBgGroup.vue 同位同文案，
// 写入统一经 store.updateElement 收口，落盘口径由 core 的 element-border-edit 保证（两宿主同一条）。
import { describe, it, expect } from 'vitest'
import type { ElementBorderSide, ElementType, RuntimeElement } from '@go-wind/print-core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderPropertyPanel } from '../property-panel'

function paintElement(type: ElementType, options: Record<string, any> = {}) {
  const store = new DesignerStore()
  store.addElement(type, { left: 10, top: 10, width: 35, height: 45, ...options })
  store.selectOne(store.elements[0]!.id)
  const host = document.createElement('div')
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state,
    repaint: () => { host.replaceChildren(); render(renderPropertyPanel(ctx), host) },
    fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  ctx.repaint()
  document.body.replaceChildren(host)
  return { host, ctx, el: store.elements[0] as RuntimeElement }
}

const presetBtn = (host: HTMLElement, label: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>('.border-presets button')).find(b => b.textContent === label)

const edgeBoxes = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLInputElement>('.pd-checkbox-group input'))

const styleSelect = (host: HTMLElement) =>
  host.querySelector<HTMLSelectElement>('[data-prop-key="bb-border-style"] select')!

describe('元素台边框入口', () => {
  it('文本元素给线型、四档预设与四边勾选', () => {
    const { host } = paintElement('text')
    expect(styleSelect(host)).toBeTruthy()
    expect(Array.from(host.querySelectorAll('.border-presets button')).map(b => b.textContent))
      .toEqual(['全部', '外侧', '内部', '无'])
    expect(Array.from(host.querySelectorAll('.pd-checkbox-group .pd-checkbox span')).map(s => s.textContent))
      .toEqual(['上', '右', '下', '左'])
  })

  it('rect／oval／hline／vline／table 用 border 画自身本体，不给预设与单边', () => {
    for (const type of ['rect', 'oval', 'hline', 'vline', 'table'] as const) {
      const { host } = paintElement(type)
      expect(host.querySelector('.border-presets'), `${type} 不应给预设行`).toBeNull()
      expect(host.querySelector('.pd-checkbox-group'), `${type} 不应给单边行`).toBeNull()
      expect(Array.from(host.querySelectorAll('.pd-label')).map(l => l.textContent)).toContain('边框宽度')
    }
  })

  it('「内部」对元素无意义：按钮置灰，提示行说破原因', () => {
    const { host } = paintElement('text')
    expect(presetBtn(host, '内部')!.disabled).toBe(true)
    const hint = Array.from(host.querySelectorAll<HTMLElement>('.pd-hint'))
      .find(p => (p.textContent ?? '').includes('线型 / 宽度 / 颜色即时生效'))
    expect(hint, '元素台应有边框操作说明').toBeTruthy()
    expect(hint!.textContent).toContain('「内部」仅表格单元格可用')
  })

  it('未设线型显示实线，用户不动它就不写进模板', () => {
    const { host, el } = paintElement('text', { borderWidth: 1 })
    expect(styleSelect(host).value).toBe('solid')
    expect(el.options.borderStyle).toBeUndefined()
  })

  it('选虚线即时写入整圈 borderStyle', () => {
    const { host, el } = paintElement('text')
    const select = styleSelect(host)
    select.value = 'dashed'
    select.dispatchEvent(new Event('change'))
    expect(el.options.borderStyle).toBe('dashed')
  })
})

describe('元素台预设与单边落盘', () => {
  it('点「全部」按当前整圈规格写四边，并清掉已勾单边', () => {
    const { host, el } = paintElement('text', {
      borderWidth: 2, borderStyle: 'dotted', borderColor: '#ff0000',
      borders: { top: { width: 1, style: 'solid', color: '#000000' } },
    })
    presetBtn(host, '全部')!.click()
    expect(el.options.borders).toBeUndefined()
    expect([el.options.borderWidth, el.options.borderStyle, el.options.borderColor])
      .toEqual([2, 'dotted', '#ff0000'])
  })

  it('宽度为 0 时点「外侧」兜到缺省档，与「全部」同效', () => {
    const a = paintElement('text', { borderWidth: 0 })
    const b = paintElement('text', { borderWidth: 0 })
    presetBtn(a.host, '外侧')!.click()
    presetBtn(b.host, '全部')!.click()
    expect(a.el.options.borderWidth).toBe(0.75)
    expect(b.el.options).toEqual(a.el.options)
  })

  it('点「无」只把宽度归零：线型与颜色留着，分边清掉', () => {
    const { host, el } = paintElement('text', {
      borderWidth: 2, borderStyle: 'dashed', borderColor: '#123456', borders: { left: { width: 2 } },
    })
    presetBtn(host, '无')!.click()
    expect(el.options.borderWidth).toBe(0)
    expect(el.options.borderStyle).toBe('dashed')
    expect(el.options.borderColor).toBe('#123456')
    expect(el.options.borders).toBeUndefined()
  })

  it('整圈生效时四条边都算可见；撤「上」把其余三边展开成分边、整圈宽度归零', () => {
    const { host, ctx, el } = paintElement('text', { borderWidth: 1.5, borderStyle: 'solid', borderColor: '#333333' })
    expect(edgeBoxes(host).map(b => b.checked), '整圈 1.5pt ⇒ 四边都有线').toEqual([true, true, true, true])

    edgeBoxes(host)[0].click()
    expect(el.options.borderWidth).toBe(0)
    expect(el.options.borders!.top).toBeUndefined()
    expect(['right', 'bottom', 'left'].map(s => el.options.borders![s as ElementBorderSide])).toEqual([
      { width: 1.5, style: 'solid', color: '#333333' },
      { width: 1.5, style: 'solid', color: '#333333' },
      { width: 1.5, style: 'solid', color: '#333333' },
    ])
    ctx.repaint()
    expect(edgeBoxes(host).map(b => b.checked)).toEqual([false, true, true, true])
  })

  it('整圈没生效时勾一条边只写那条分边，规格取已有分边（不动整圈三字段）', () => {
    const { host, el } = paintElement('text', { borders: { bottom: { width: 2, style: 'dashed', color: '#123456' } } })
    expect(edgeBoxes(host).map(b => b.checked)).toEqual([false, false, true, false])
    edgeBoxes(host)[0].click()
    expect(el.options.borders!.top).toEqual({ width: 2, style: 'dashed', color: '#123456' })
    expect(el.options.borderWidth).toBeUndefined()
  })

  it('单边不改整圈三字段，也不要求先点预设', () => {
    const { host, el } = paintElement('text')
    edgeBoxes(host)[1].click()
    expect(el.options.borders!.right).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    expect(el.options.borderWidth).toBeUndefined()
  })
})

describe('元素台三行回显当前生效规格（方案 B）', () => {
  const widthInput = (host: HTMLElement) =>
    host.querySelector<HTMLInputElement>('[data-prop-key="bb-border-width"] input[type="number"]')!
  const colorTitle = (host: HTMLElement) =>
    (host.querySelector('[data-prop-key="bb-border-color"] .preset-color-swatch') as HTMLElement).style.background

  it('整圈未设、只有一条分边 ⇒ 三行回显该分边规格（此前是空的）', () => {
    const { host } = paintElement('text', { borders: { right: { width: 1.5, style: 'dotted', color: '#abcdef' } } })
    expect(styleSelect(host).value).toBe('dotted')
    expect(widthInput(host).value).toBe('1.5')
    expect(colorTitle(host)).toMatch(/abcdef|rgb\(171,\s*205,\s*239\)/i)
  })

  it('分边规格不一 ⇒ 宽度留空并显示「混合」占位，线型行出「混合」项', () => {
    const { host } = paintElement('text', {
      borders: { top: { width: 1, style: 'solid', color: '#000000' }, right: { width: 2, style: 'dashed', color: '#fff' } },
    })
    expect(widthInput(host).value).toBe('')
    expect(widthInput(host).placeholder).toContain('混合')
    expect(styleSelect(host).value).toBe('')
    expect(Array.from(styleSelect(host).options).map(o => o.textContent)).toContain('混合')
  })

  it('已有边框时改宽度：整圈化并清掉分边覆盖（不留"改了没反应"的分边）', () => {
    const { host, el } = paintElement('text', {
      borderWidth: 1, borderStyle: 'solid', borderColor: '#333333',
      borders: { top: { width: 1, style: 'solid', color: '#333333' } },
    })
    const input = widthInput(host)
    input.value = '3'
    input.dispatchEvent(new Event('change'))
    expect(el.options.borderWidth).toBe(3)
    expect(el.options.borders, '分边覆盖一并清掉').toBeUndefined()
    expect(el.options.borderColor).toBe('#333333')
  })

  it('完全无边框的元素选一个线型＝开一条缺省宽度的框（线型就是"有没有框"的开关）', () => {
    const { host, el } = paintElement('text')
    const select = styleSelect(host)
    select.value = 'dashed'
    select.dispatchEvent(new Event('change'))
    expect(el.options.borderStyle).toBe('dashed')
    expect(el.options.borderWidth).toBe(0.75)
    expect(el.options.borderColor, '颜色仍留未设').toBeUndefined()
  })
})

describe('元素台线型可设为「无」', () => {
  it('线型下拉含「无」；完全没有边框的元素线型显示「无」', () => {
    const { host } = paintElement('text')
    expect(Array.from(styleSelect(host).options).map(o => o.textContent)).toEqual(['无', '实线', '虚线', '点线', '双线'])
    expect(styleSelect(host).value).toBe('none')
  })

  it('已有边框时选「无」＝清边框：宽度归零、分边清空、线型记成 none', () => {
    const { host, el } = paintElement('text', {
      borderWidth: 2, borderStyle: 'dashed', borders: { top: { width: 2, style: 'dashed', color: '#333333' } },
    })
    const select = styleSelect(host)
    select.value = 'none'
    select.dispatchEvent(new Event('change'))
    expect(el.options.borderWidth).toBe(0)
    expect(el.options.borders).toBeUndefined()
    expect(el.options.borderStyle).toBe('none')
  })
})
