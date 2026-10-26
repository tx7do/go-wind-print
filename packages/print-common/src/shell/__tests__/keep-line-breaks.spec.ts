// @vitest-environment happy-dom
// T-26 #IKPXQL 需求2：Common 外壳侧「保留换行符」——样式与画布/出纸同源，属性台入口同形同键。
import { describe, it, expect } from 'vitest'
import { textLikeStyle } from '../elements.js'
import { renderPropertyPanel } from '../property-panel'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import type { RuntimeElement, ElementType } from '@worm-vue3-print/core/designer'

function el(type: string, options: Record<string, any> = {}): RuntimeElement {
  return {
    id: 'x',
    options: { left: 0, top: 0, width: 40, height: 10, ...options },
    printElementType: { type: type as ElementType, title: type },
  } as RuntimeElement
}

describe('textLikeStyle 消费同一份 white-space 判据', () => {
  it('缺省与 false 都不出 whiteSpace（存量零变化）', () => {
    expect(textLikeStyle(el('text')).style.whiteSpace).toBeUndefined()
    expect(textLikeStyle(el('longText')).style.whiteSpace).toBeUndefined()
    expect(textLikeStyle(el('text', { keepLineBreaks: false })).style.whiteSpace).toBeUndefined()
  })

  it('text 与 longText 打开都落 pre-wrap', () => {
    expect(textLikeStyle(el('text', { keepLineBreaks: true })).style.whiteSpace).toBe('pre-wrap')
    expect(textLikeStyle(el('longText', { keepLineBreaks: true })).style.whiteSpace).toBe('pre-wrap')
  })

  it('与「自动换行」冲突时单行优先：保留 nowrap，不被新档覆盖', () => {
    const s = textLikeStyle(el('text', { keepLineBreaks: true, wordWrap: false })).style
    expect(s.whiteSpace).toBe('nowrap')
    expect(s.textOverflow).toBe('ellipsis')
  })

  it('长文本的缩进与本档互不顶掉（两条声明成对在）', () => {
    const s = textLikeStyle(el('longText', { keepLineBreaks: true, longTextIndent: 2 })).style
    expect(s.textIndent).toBe('2em')
    expect(s.whiteSpace).toBe('pre-wrap')
  })
})

describe('common 外观组的「保留换行符」行', () => {
  function paint(type: ElementType, options: Record<string, any> = {}) {
    const store = new DesignerStore()
    store.addElement(type, options)
    const element = store.elements[0]!
    store.selectOne(element.id)
    const host = document.createElement('div')
    const state: ShellState = {
      leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
      openDd: null, collapsedGroups: new Set(), renamingPage: null,
    }
    // 壳层靠 store 触发重绘，harness 不会：写完必须 repaint 才拿得到回显（既有惯例）
    const ctx: ShellCtx = {
      store, format: new FormatToolbar(store), state,
      repaint: () => { host.replaceChildren(); render(renderPropertyPanel(ctx), host) },
      fire: () => {}, showHelp: true, isEdit: false, host: { fonts: [] },
    }
    ctx.repaint()
    return { store, element, host, ctx }
  }

  function rowOf(host: HTMLElement, text: string) {
    const row = [...host.querySelectorAll<HTMLElement>('.pd-field')]
      .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))
    if (!row) throw new Error(`未找到属性行：${text}`)
    return row
  }

  const flip = (ctx: ShellCtx, host: HTMLElement, label: string, checked: boolean) => {
    const input = rowOf(host, label).querySelector<HTMLInputElement>('input[type=checkbox]')!
    input.checked = checked
    input.dispatchEvent(new Event('change'))
    ctx.repaint()
  }

  it('两类文本元素都有该行，位置紧跟「自动换行」', () => {
    for (const type of ['text', 'longText'] as ElementType[]) {
      const { host } = paint(type)
      const labels = [...host.querySelectorAll<HTMLElement>('.pd-label-t')].map(l => l.textContent ?? '')
      const iWrap = labels.findIndex(t => t.includes('自动换行'))
      expect(iWrap, `${type} 找不到「自动换行」`).toBeGreaterThan(-1)
      expect(labels[iWrap + 1]).toContain('保留换行符')
    }
  })

  it('勾选写 keepLineBreaks=true，取消回到未设；不动 wordWrap', () => {
    const { element, host, ctx } = paint('text')
    flip(ctx, host, '保留换行符', true)
    expect(element.options.keepLineBreaks).toBe(true)
    expect(element.options.wordWrap).toBeUndefined()
    expect(rowOf(host, '保留换行符').querySelector<HTMLInputElement>('input[type=checkbox]')!.checked).toBe(true)
    flip(ctx, host, '保留换行符', false)
    expect(element.options.keepLineBreaks).toBeUndefined()
  })

  it('「恢复默认值」出厂未设→开后点亮，点一下清回未设并回灰', () => {
    const { element, host, ctx } = paint('longText')
    const btn = () => rowOf(host, '保留换行符').querySelector<HTMLButtonElement>('.pd-reset-btn')!
    expect(btn().classList.contains('is-dirty')).toBe(false)
    flip(ctx, host, '保留换行符', true)
    expect(btn().classList.contains('is-dirty')).toBe(true)
    btn().click()
    ctx.repaint()
    expect(element.options.keepLineBreaks).toBeUndefined()
    expect(btn().classList.contains('is-dirty')).toBe(false)
  })
})
