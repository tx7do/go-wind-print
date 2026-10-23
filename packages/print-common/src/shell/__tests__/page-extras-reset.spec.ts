// @vitest-environment happy-dom
// common 侧拼版八行「恢复默认值」验收：目标纸/方向/四边留白/横纵间距都取 TILE_DEFAULTS，
// enabled 与 columns 按口径不接（左值恒 true、右值按纸面收敛，没有可信落点）。
import { describe, it, expect } from 'vitest'
import { TILE_DEFAULTS } from '@worm-vue3-print/core'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { tilingSection } from '../page-extras'

function makeCtx(store: DesignerStore): ShellCtx {
  const state: ShellState = {
    leftTab: 'elements', leftCollapsed: false, propTab: 'page', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
  return { store, format: new FormatToolbar(store), state, repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: {} }
}

/** 渲染拼版区段；未传 tiling 时按出厂值（此时八行应全为灰态） */
function paint(tiling?: Record<string, any>) {
  const store = new DesignerStore()
  if (tiling) {
    store.updateTemplateData({
      tiling: {
        ...TILE_DEFAULTS, ...tiling,
        sheetMargin: { ...TILE_DEFAULTS.sheetMargin, ...(tiling.sheetMargin ?? {}) },
      } as never,
    })
  }
  const host = document.createElement('div')
  render(tilingSection(makeCtx(store)), host)
  return { store, host }
}

function rowOf(host: HTMLElement, text: string) {
  const row = [...host.querySelectorAll<HTMLElement>('.pd-field')]
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

const btnOf = (host: HTMLElement, text: string) =>
  rowOf(host, text).querySelector<HTMLButtonElement>('.pd-reset-btn')!

const tiling = (store: DesignerStore) => (store.templateData as any).tiling

describe('common 拼版「恢复默认值」', () => {
  it('八行都挂图标、提示为纯「恢复默认值」', () => {
    const { host } = paint({ sheetPaperSize: 'A5', sheetOrientation: 'landscape', gapX: 8, gapY: 9, sheetMargin: { top: 3, bottom: 4, left: 5, right: 6 } })
    expect(host.querySelectorAll('.pd-reset-btn').length).toBe(8)
    for (const t of ['目标纸张', '目标纸方向', '上', '下', '左', '右', '横向间距', '纵向间距']) {
      expect(btnOf(host, t).getAttribute('data-tip'), `提示不对：${t}`).toBe('恢复默认值')
    }
  })

  it('偏离时点亮，点击写回 TILE_DEFAULTS', () => {
    const { store, host } = paint({ sheetPaperSize: 'A5', sheetOrientation: 'landscape', gapX: 8, gapY: 9, sheetMargin: { top: 3, bottom: 4, left: 5, right: 6 } })
    expect(btnOf(host, '目标纸张').classList.contains('is-dirty')).toBe(true)
    expect(btnOf(host, '左').classList.contains('is-dirty')).toBe(true)

    btnOf(host, '目标纸张').click()
    expect(tiling(store).sheetPaperSize).toBe(TILE_DEFAULTS.sheetPaperSize)
    btnOf(host, '目标纸方向').click()
    expect(tiling(store).sheetOrientation).toBe(TILE_DEFAULTS.sheetOrientation)
    btnOf(host, '上').click()
    expect(tiling(store).sheetMargin.top).toBe(TILE_DEFAULTS.sheetMargin.top)
    btnOf(host, '右').click()
    expect(tiling(store).sheetMargin.right).toBe(TILE_DEFAULTS.sheetMargin.right)
    btnOf(host, '横向间距').click()
    expect(tiling(store).gapX).toBe(TILE_DEFAULTS.gapX)
    btnOf(host, '纵向间距').click()
    expect(tiling(store).gapY).toBe(TILE_DEFAULTS.gapY)
  })

  it('全等于出厂值时八行全灰（不产生历史条目）', () => {
    const { host } = paint()
    const dirty = [...host.querySelectorAll('.pd-reset-btn')].filter(b => b.classList.contains('is-dirty'))
    expect(dirty.length).toBe(0)
  })

  it('口径例外三处不挂图标：启用拼版 / 目标纸宽高 / 列数', () => {
    // 目标纸宽高只在 CUSTOM 档出现，且此时「目标纸方向」行让位 ⇒ 图标数 7（其余七行）
    const { host } = paint({ sheetPaperSize: 'CUSTOM' })
    expect(host.querySelectorAll('.pd-reset-btn').length).toBe(7)
    // 启用拼版不是 .pd-label 行（是 .tiling-switch 开关行），单独按容器断言
    const switchRow = host.querySelector('.tiling-switch')!.closest('.pd-field')!
    expect(switchRow.querySelector('.pd-reset-btn'), '不该有图标：启用拼版').toBeNull()
    for (const t of ['目标纸宽高', '列数']) {
      const row = rowOf(host, t)
      expect(row.querySelector('.pd-reset-btn'), `不该有图标：${t}`).toBeNull()
    }
  })
})
