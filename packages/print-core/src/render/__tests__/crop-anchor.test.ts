// print-core/src/render/__tests__/crop-anchor.test.ts
// 剪裁锚点落纸契约。实测取证（本机 Chromium，Playwright 截屏回喂像素采样）：
// · 独立 image：img 盒 == 元素框，等比铺满后有余量可裁。锚点 50% 0% 打出图顶端（红带 229,50,45），
//   50% 100% 打出图底端（蓝带 45,91,229），另一头变灰 —— 真生效。
// · 表格图片单元格：td 高度本由内容决定，声明行高不是硬约束——图把行撑高后 img 盒恰好等于整张图
//   （旧实测：声明 12mm=45.4px 而实测 226.8px；给 img 补 width/height:100% 前后盒子都是 143.6×215.5，属空操作）。
//   现口径：fit=cover 的单元格把外框钉在 cellFitCapMm（所跨行高之和扣内边距与塌陷边框），img 撑满该盒，
//   于是与独立元素同构地裁得动；其余档（缺省/contain/fill…）仍按内容撑高，存量模板逐字不变。
import { describe, it, expect } from 'vitest'
import { generateHtml } from '../html-generator.js'
import type { TemplateData } from '../types.js'

const SRC = 'data:image/gif;base64,R0lGOD'

function imgDeclsOf(html: string, what: string): string[] {
  const m = html.match(/<img src="[^"]*" style="([^"]*)"/)
  if (!m) throw new Error(`未渲染出${what}的 img：${html.slice(0, 400)}`)
  return m[1].split(';').map(s => s.trim()).filter(Boolean)
}

/** 单元格图片外框（td 的第一层 div）逐条声明：与 imgDeclsOf 同因，否则 max-height:100% 会让 height:100% 假绿 */
function boxDeclsOf(html: string): string[] {
  const m = /<td[^>]*><div style="([^"]*)"/.exec(html)
  if (!m) throw new Error(`未渲染出单元格图片外框：${html.slice(0, 400)}`)
  return m[1].split(';').map(s => s.trim()).filter(Boolean)
}

function renderElement(options: Record<string, any>): string {
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{ id: 'el-1', type: 'image', options: { left: 0, top: 0, width: 35, height: 45, src: SRC, ...options } } as any],
  }
  return generateHtml(template, [{ pageIndex: 0, sections: [{ elementId: 'el-1', type: 'element' }] }], {})
}

/** 给一张两列表格渲染出单元格图片；不传行高时单行 8mm，传了则按给定行高排多行（跨行用例用） */
function renderCell(extra: Record<string, any> = {}, ...rowHeights: number[]): string {
  const base = { rowspan: 1, colspan: 1, merged: false }
  const heights = rowHeights.length ? rowHeights : [8]
  const _renderRows = heights.map((height, i) => ({
    type: 'data', height,
    cells: [
      i === 0 ? { ...base, cellType: 'image', content: SRC, ...extra } : { ...base, merged: true },
      { ...base, content: '' },
    ],
  }))
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{
      id: 'tbl-1', type: 'table',
      options: { left: 0, top: 0, width: 100, tableColWidths: [40, 60], _renderRows },
    } as any],
  }
  return generateHtml(template, [{ pageIndex: 0, sections: [{ elementId: 'tbl-1', type: 'table-slice', startRow: 0, endRow: heights.length }] }], {})
}

describe('独立图片：锚点生效的那一侧', () => {
  it('img 撑满元素框，等比铺满后才有可裁余量', () => {
    const d = imgDeclsOf(renderElement({ fit: 'cover', objectPosition: '50% 0%' }), '独立图片')
    expect(d).toContain('width:100%')
    expect(d).toContain('height:100%')
    expect(d).toContain('object-position:50% 0%')
  })
  it('缺省不输出锚点声明（存量模板逐字不变）', () => {
    expect(imgDeclsOf(renderElement({}), '独立图片').some(s => s.startsWith('object-position'))).toBe(false)
  })
})

describe('表格图片单元格：剪裁档与独立元素同构', () => {
  it('cover：外框钉在可用框高（声明行高扣内边距），img 撑满该盒才有可裁余量', () => {
    const html = renderCell({ fit: 'cover', objectPosition: '50% 0%' })
    // 8mm 行高 − 上下各 1mm 内边距 = 6mm（该用例无边框）
    expect(boxDeclsOf(html)).toContain('height:6mm')
    const d = imgDeclsOf(html, '单元格图片')
    expect(d).toContain('width:100%')
    expect(d).toContain('height:100%')
    expect(d).toContain('object-position:50% 0%')
  })
  it('cover 且跨行：可用框按所跨行高之和扣内边距', () => {
    expect(boxDeclsOf(renderCell({ fit: 'cover', rowspan: 2 }, 8, 8))).toContain('height:14mm')
  })
  it('门控只在剪裁档：缺省、contain、fill 逐字保持存量形态，行高仍由内容决定', () => {
    for (const extra of [{}, { fit: 'contain' }, { fit: 'fill' }]) {
      const html = renderCell(extra)
      expect(boxDeclsOf(html)).toContain('height:100%')
      const d = imgDeclsOf(html, '单元格图片')
      expect(d).not.toContain('width:100%')
      expect(d).not.toContain('height:100%')
    }
  })
})
