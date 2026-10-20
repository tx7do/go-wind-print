// print-core/src/render/__tests__/crop-anchor.test.ts
// 剪裁锚点落纸契约。实测取证（本机 Chromium，Playwright 截屏回喂像素采样）：
// · 独立 image：img 盒 == 元素框，等比铺满后有余量可裁。锚点 50% 0% 打出图顶端（红带 229,50,45），
//   50% 100% 打出图底端（蓝带 45,91,229），另一头变灰 —— 真生效。
// · 表格图片单元格：td 高度由内容决定，声明行高不是硬约束，图把行撑高后 img 盒恰好等于整张图（余量 0）。
//   给 img 补 width:100%;height:100% 前后量出的盒子完全一致（143.6×215.5），所以单元格里的 fit 与锚点整体空转。
// 下面按此现状锁定；要改单元格行高语义（把声明行高变硬约束），这三条得连同 PARITY 一起翻。
import { describe, it, expect } from 'vitest'
import { generateHtml } from '../html-generator.js'
import type { TemplateData } from '../types.js'

const SRC = 'data:image/gif;base64,R0lGOD'

function imgDeclsOf(html: string, what: string): string[] {
  const m = html.match(/<img src="[^"]*" style="([^"]*)"/)
  if (!m) throw new Error(`未渲染出${what}的 img：${html.slice(0, 400)}`)
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

function renderCell(extra: Record<string, any> = {}): string {
  const base = { rowspan: 1, colspan: 1, merged: false }
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{
      id: 'tbl-1', type: 'table',
      options: {
        left: 0, top: 0, width: 100, tableColWidths: [40, 60],
        _renderRows: [{ type: 'data', height: 8, cells: [{ ...base, cellType: 'image', content: SRC, ...extra }, { ...base, content: '' }] }],
      },
    } as any],
  }
  return generateHtml(template, [{ pageIndex: 0, sections: [{ elementId: 'tbl-1', type: 'table-slice', startRow: 0, endRow: 1 }] }], {})
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

describe('表格图片单元格：已知限制（行高不是硬约束）', () => {
  it('img 不撑满单元格盒——补 width/height:100% 是空操作，裁不动也不位移', () => {
    const d = imgDeclsOf(renderCell({ fit: 'cover', objectPosition: '50% 0%' }), '单元格图片')
    expect(d).not.toContain('width:100%')
    expect(d).not.toContain('height:100%')
  })
})
