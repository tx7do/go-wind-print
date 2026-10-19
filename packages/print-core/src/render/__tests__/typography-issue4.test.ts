// print-core/src/render/__tests__/typography-issue4.test.ts
// GitHub issue #4 文本/图片排版落纸契约：T-01 首行缩进、T-02 fit、T-03 object-position、T-04 justify
import { describe, it, expect } from 'vitest'
import { generateHtml } from '../html-generator.js'
import type { TemplateData, PageLayout } from '../types.js'

function renderOne(type: string, options: Record<string, any>): string {
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{ id: 'el-1', type: type as any, options: { left: 0, top: 0, width: 60, height: 20, ...options } } as any],
  }
  const layouts: PageLayout[] = [{ pageIndex: 0, sections: [{ elementId: 'el-1', type: 'element' }] }]
  return generateHtml(template, layouts, {})
}

/** 取该元素 div 的行内样式声明列表，逐条比对，避免 toContain 被相邻声明蒙过去 */
function styleDecls(html: string): string[] {
  const m = html.match(/<div class="print-element"[^>]*style="([^"]*)"/)
  if (!m) throw new Error(`未渲染出 print-element：${html.slice(0, 300)}`)
  return m[1].split(';').map(s => s.trim()).filter(Boolean)
}

const SRC = 'data:image/gif;base64,R0lGOD'

describe('T-01 长文本首行缩进落纸（单位 em）', () => {
  it('longText + longTextIndent=2 → text-indent:2em', () => {
    expect(styleDecls(renderOne('longText', { testData: '中文段落', longTextIndent: 2 }))).toContain('text-indent:2em')
  })
  it('未设 longTextIndent → 不输出 text-indent（存量模板零变化）', () => {
    expect(renderOne('longText', { testData: '中文段落' })).not.toContain('text-indent')
  })
  it('普通 text 元素带 longTextIndent 也不输出——与画布/common 同语义（仅 longText 消费）', () => {
    expect(renderOne('text', { testData: '短文本', longTextIndent: 2 })).not.toContain('text-indent')
  })
  it('缩进与字号同源：textFit=shrink 时 em 随实测字号走（输出仍为 em，交由浏览器换算）', () => {
    const html = renderOne('longText', { testData: '段落', longTextIndent: 3, textFit: 'shrink', fontSize: 12, _fitFontSize: 8 })
    const d = styleDecls(html)
    expect(d).toContain('font-size:8pt')
    expect(d).toContain('text-indent:3em')
  })
})

describe('T-04 justify 两端对齐（含 verticalAlign 组合）', () => {
  it('仅 textAlign=justify → text-align:justify，且不引入 flex', () => {
    const d = styleDecls(renderOne('text', { testData: '段落', textAlign: 'justify' }))
    expect(d).toContain('text-align:justify')
    expect(d).not.toContain('display:flex')
  })
  it('justify × verticalAlign=middle → 主轴转纵向，交叉轴 stretch 让行盒取满宽', () => {
    const d = styleDecls(renderOne('text', { testData: '段落', textAlign: 'justify', verticalAlign: 'middle' }))
    expect(d).toContain('display:flex')
    expect(d).toContain('flex-direction:column')
    expect(d).toContain('justify-content:center')
    expect(d).toContain('text-align:justify')
    expect(d).not.toContain('justify-content:flex-start')
  })
  it('longText 同样生效', () => {
    expect(styleDecls(renderOne('longText', { testData: '段落', textAlign: 'justify', verticalAlign: 'bottom' })))
      .toContain('justify-content:flex-end')
  })
  it('存量三档不受影响：right × middle 仍是横向 flex', () => {
    const d = styleDecls(renderOne('text', { testData: '段落', textAlign: 'right', verticalAlign: 'middle' }))
    expect(d).toContain('align-items:center')
    expect(d).toContain('justify-content:flex-end')
    expect(d).not.toContain('flex-direction')
  })

  // 单行文本里那唯一一行就是末行，CSS 的 justify 永不拉伸末行 → 必须显式 text-align-last:justify
  it('justify 补 text-align-last，单行才会撑满行宽', () => {
    const d = styleDecls(renderOne('text', { testData: '收货人张先生', textAlign: 'justify' }))
    expect(d).toContain('text-align:justify')
    expect(d).toContain('text-align-last:justify')
  })
  it('justify × verticalAlign 组合同样补 text-align-last', () => {
    expect(styleDecls(renderOne('longText', { testData: '段落', textAlign: 'justify', verticalAlign: 'middle' })))
      .toContain('text-align-last:justify')
  })
  it('存量三档不输出 text-align-last', () => {
    for (const align of ['left', 'center', 'right']) {
      expect(renderOne('text', { testData: '段落', textAlign: align, verticalAlign: 'middle' })).not.toContain('text-align-last')
    }
  })
})

describe('T-04b 表格单元格两端对齐', () => {
  /** 单格表格：把首个 td 的行内样式单独取出来比对，避免 toContain 命中相邻声明 */
  function cellDecls(align: string): string[] {
    const base = { rowspan: 1, colspan: 1, merged: false }
    const template: TemplateData = {
      paperSize: 'A4', orientation: 'portrait',
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
      header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
      elements: [{
        id: 'tbl-1', type: 'table',
        options: {
          left: 0, top: 0, width: 100, tableColWidths: [60, 40],
          _renderRows: [{
            type: 'data', height: 8,
            cells: [
              { ...base, content: '收货人张先生', align: align as any },
              { ...base, content: '备注', align: 'center' },
            ],
          }],
        },
      } as any],
    }
    const html = generateHtml(template, [{ pageIndex: 0, sections: [{ elementId: 'tbl-1', type: 'table-slice', startRow: 0, endRow: 1 }] }], {})
    const m = html.match(/<td[^>]*style="([^"]*)"/)
    if (!m) throw new Error(`未渲染出 td：${html.slice(0, 300)}`)
    return m[1].split(';').map(s => s.trim()).filter(Boolean)
  }

  it('单元格 justify 成对输出 text-align-last，单行才撑满列宽', () => {
    const d = cellDecls('justify')
    expect(d).toContain('text-align:justify')
    expect(d).toContain('text-align-last:justify')
  })
  it('存量 left/center/right 单元格不输出 text-align-last', () => {
    for (const align of ['left', 'center', 'right']) {
      expect(cellDecls(align)).not.toContain('text-align-last:justify')
    }
  })
})

describe('T-02 / T-03 独立 image 与单元格图片', () => {
  it('fit=cover 落纸为 cover（改前恒为 contain）', () => {
    expect(renderOne('image', { src: SRC, fit: 'cover' })).toContain('object-fit:cover')
  })
  it('未设 fit 仍为 contain（存量模板逐字不变）', () => {
    const html = renderOne('image', { src: SRC })
    expect(html).toContain(`<img src="${SRC}" style="width:100%;height:100%;object-fit:contain;" />`)
  })
  it('fit 五档逐一落纸，none/scale-down 不劣化', () => {
    for (const fit of ['contain', 'cover', 'fill', 'none', 'scale-down']) {
      expect(renderOne('image', { src: SRC, fit })).toContain(`object-fit:${fit}`)
    }
  })
  it('objectPosition 原样透传，缺省不输出该声明', () => {
    expect(renderOne('image', { src: SRC, fit: 'cover', objectPosition: 'center 20%' })).toContain('object-position:center 20%')
    expect(renderOne('image', { src: SRC, fit: 'cover' })).not.toContain('object-position')
  })
  it('objectPosition 含分隔符/引号/函数时整条丢弃，注入不进 style 属性；合法值仍透传', () => {
    for (const bad of ['center";position:fixed', 'center;position:fixed', 'url(evil)', "center 20%' 10px"]) {
      const html = renderOne('image', { src: SRC, fit: 'cover', objectPosition: bad })
      expect(html).not.toContain('object-position')
      expect(html).not.toContain('position:fixed')
    }
    expect(renderOne('image', { src: SRC, fit: 'cover', objectPosition: 'center 20%' })).toContain('object-position:center 20%')
  })
  it('表格单元格图片同样接受 objectPosition，缺省路径不变', () => {
    const base = { rowspan: 1, colspan: 1, merged: false }
    const build = (extra: Record<string, any>) => {
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
    const withPos = build({ objectPosition: 'top left' })
    expect(withPos).toContain('object-fit:contain;object-position:top left;')
    expect(build({})).not.toContain('object-position')
    expect(build({ objectPosition: 'top;left' })).not.toContain('object-position')
  })
})
