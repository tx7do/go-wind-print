// @vitest-environment happy-dom
// 元素台边框入口 Common 端契约：与 canvas 的 BorderBgGroup.vue 同位同文案，
// 写入统一经 store.updateElement 收口，落盘口径由 core 的 element-border-edit 保证（两宿主同一条）。
import { describe, it, expect } from 'vitest'
import type { ElementType, RuntimeElement } from '@worm-vue3-print/core/designer'
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

  it('勾上边写 borders.top，取消勾选只撤那一条边，按下态随重绘回显', () => {
    const { host, ctx, el } = paintElement('text', {
      borderWidth: 1.5, borders: { bottom: { width: 1.5, style: 'solid', color: '#333333' } },
    })
    expect(edgeBoxes(host)[0].checked, '上边未设 → 未勾').toBe(false)
    expect(edgeBoxes(host)[2].checked, '下边已设 → 回显勾选').toBe(true)

    edgeBoxes(host)[0].click()
    expect(el.options.borders!.top).toEqual({ width: 1.5, style: 'solid', color: '#333333' })
    ctx.repaint()
    expect(edgeBoxes(host)[0].checked).toBe(true)

    edgeBoxes(host)[2].click()
    expect(el.options.borders!.bottom).toBeUndefined()
    expect(el.options.borders!.top).toBeTruthy()
  })

  it('单边不改整圈三字段，也不要求先点预设', () => {
    const { host, el } = paintElement('text')
    edgeBoxes(host)[1].click()
    expect(el.options.borders!.right).toEqual({ width: 0.75, style: 'solid', color: '#333333' })
    expect(el.options.borderWidth).toBeUndefined()
  })
})
