// @vitest-environment happy-dom
// common 水印区段「恢复默认值」验收。重点是判定基准必须用「已落值视图」：
// 区段的 commit() 会把五个键全部落值，控件在 wm 缺省时显示的就是 WATERMARK_DEFAULTS 的值，
// 若拿原始 wm 当判据，未配置的水印会显示 -30 却判为已偏离——与 canvas 的 localConfig 口径相反。
import { describe, it, expect } from 'vitest'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { watermarkSection } from '../watermark'
import { WATERMARK_DEFAULTS } from '@worm-vue3-print/core'

function paint(watermark?: Record<string, any>) {
  const store = new DesignerStore()
  if (watermark) store.updateTemplateData({ watermark } as never)
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'page', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state,
    repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  const host = document.createElement('div')
  render(watermarkSection(ctx), host)
  return { store, host }
}

function rowOf(host: HTMLElement, text: string) {
  const row = [...host.querySelectorAll<HTMLElement>('.pd-field')]
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

const btnOf = (host: HTMLElement, text: string) => rowOf(host, text).querySelector<HTMLButtonElement>('.pd-reset-btn')!

describe('common 水印「恢复默认值」', () => {
  it('未配置水印时五行全灰——显示的就是缺省值，无物可恢复', () => {
    const { host } = paint()
    for (const t of ['旋转角度', '颜色', '透明度']) {
      const b = btnOf(host, t)
      expect(b, `缺图标：${t}`).toBeTruthy()
      expect(b.classList.contains('is-dirty'), `应灰态：${t}`).toBe(false)
    }
  })

  it('改过旋转角度后亮态，点击写回 WATERMARK_DEFAULTS.rotate', () => {
    const wmCfg = { mode: 'fixed', content: '样张', rotate: 0, color: WATERMARK_DEFAULTS.color, opacity: WATERMARK_DEFAULTS.opacity, tileWidth: WATERMARK_DEFAULTS.tileWidth, tileHeight: WATERMARK_DEFAULTS.tileHeight }
    const { store, host } = paint(wmCfg)
    expect(btnOf(host, '旋转角度').classList.contains('is-dirty')).toBe(true)
    btnOf(host, '旋转角度').click()
    expect((store.templateData as any).watermark.rotate).toBe(WATERMARK_DEFAULTS.rotate)

    // 灰亮是在 paint 时求值的（common 是全量重绘模型），必须重新渲染才能看到恢复后的态；
    // 直接读旧 DOM 会永远停在点击前——那是测试的假阴性，不是实现的缺陷。
    const again = paint((store.templateData as any).watermark)
    expect(btnOf(again.host, '旋转角度').classList.contains('is-dirty')).toBe(false)
  })

  it('颜色恢复到的正是缺省色而非清空', () => {
    const { store, host } = paint({ mode: 'fixed', content: '样张', color: '#ff0000' })
    btnOf(host, '颜色').click()
    expect((store.templateData as any).watermark.color).toBe(WATERMARK_DEFAULTS.color)
  })

  it('水印表达式与测试值是内容，不挂图标', () => {
    const { host } = paint()
    expect(rowOf(host, '水印表达式').querySelector('.pd-reset-btn')).toBeNull()
  })

  it('图标无文字，标签 textContent 不含"默认"', () => {
    const { host } = paint({ mode: 'fixed', content: '样张', rotate: 45 })
    expect(btnOf(host, '旋转角度').textContent).toBe('')
    for (const l of host.querySelectorAll<HTMLElement>('.pd-label')) {
      expect(l.textContent).not.toContain('默认')
    }
  })
})
