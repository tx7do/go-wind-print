// 端到端：issue #4 的排版四项（两端对齐 / 首行缩进 / 图片缩放 / 裁剪锚点）在
// 服务端真实 Chromium 测量分页后仍原样进入最终 HTML，并能出成 PDF。
// happy-dom 没有排版引擎，这条链路只有这里能验。
import { describe, it, expect } from 'vitest'
import { createDomHostRuntime, prepareDocument } from '@worm-vue3-print/core'
import type { PrintTemplateData } from '@worm-vue3-print/core'
import { loadExecutorBundle } from '@worm-vue3-print/core/node'
import { BrowserPool } from './browser-pool.js'
import { createPlaywrightDriverFactory } from './driver-playwright.js'
import { renderPdf } from './pdf-render.js'

const PARA = '甲方乙方丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏'
const GIF = 'data:image/gif;base64,R0lGOD'

function typographyTemplate(): PrintTemplateData {
  return {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] },
    footer: { height: 0, elements: [] },
    elements: [
      // 两端对齐 × 垂直居中：主轴应转纵向，让行盒取满宽
      {
        id: 'p1', type: 'longText',
        options: { left: 0, top: 0, width: 100, height: 30, fontSize: 10, formatter: PARA, textAlign: 'justify', verticalAlign: 'middle', longTextIndent: 2 },
      },
      // 独立图片：fit 不再被写死 contain，锚点按需输出
      {
        id: 'p2', type: 'image',
        options: { left: 0, top: 40, width: 30, height: 25, src: GIF, fit: 'cover', objectPosition: 'center 20%' },
      },
      // 缺省路径：不设 fit / objectPosition 的存量图片
      { id: 'p3', type: 'image', options: { left: 40, top: 40, width: 30, height: 25, src: GIF } },
      // 表格单元格两端对齐：justify 档与存量 right 档同表对照
      {
        id: 'p4', type: 'table',
        options: {
          left: 0, top: 70, width: 100, tableColWidths: [60, 40],
          tableRows: [{
            id: 'tr1', type: 'header', height: 8, repeatOnPage: false,
            cells: [
              { id: 'tc1', formatter: '收货人张先生', align: 'justify' },
              { id: 'tc2', formatter: '金额', align: 'right' },
            ],
          }],
        },
      },
    ],
  } as unknown as PrintTemplateData
}

const runtime = createDomHostRuntime(
  createPlaywrightDriverFactory(BrowserPool.getInstance()),
  loadExecutorBundle(),
)

describe('服务端排版四项（真实 Chromium → PDF）', () => {
  it('最终 HTML 保留 justify、em 缩进、纵向主轴与图片锚点', async () => {
    const { html } = await prepareDocument({ templateJson: typographyTemplate(), printData: {} }, runtime)
    expect(html).toContain('text-align:justify')
    // 单行文本里那一行就是末行，justify 不拉伸末行 → 必须连 text-align-last 一起进真实 Chromium
    expect(html).toContain('text-align-last:justify')
    // 单元格档位同样成对落纸；存量 right 格不得被带上该声明
    expect(html).toMatch(/<td[^>]*style="[^"]*text-align:justify;text-align-last:justify/)
    expect(html).toMatch(/<td[^>]*style="[^"]*text-align:right;vertical-align/)
    expect(html).toContain('flex-direction:column')
    expect(html).toContain('text-indent:2em')
    expect(html).toContain('object-fit:cover')
    expect(html).toContain('object-position:center 20%')
    // 未设字段的存量路径不得多出任何声明
    const plain = /<img src="[^"]*" style="width:100%;height:100%;object-fit:contain;" \/>/
    expect(html).toMatch(plain)
  }, 60000)

  it('该模板能出成单页 PDF，产物以 %PDF 开头且非空', async () => {
    const pdf = await renderPdf({ templateJson: typographyTemplate(), printData: {} })
    expect(Buffer.from(pdf.subarray(0, 4)).toString('latin1')).toBe('%PDF')
    expect(pdf.length).toBeGreaterThan(1000)
  }, 60000)

  it('非法裁剪锚点不进 PDF：含分号的值整条丢弃', async () => {
    const tpl = typographyTemplate()
    const img = tpl.elements.find(e => e.id === 'p2')!
    img.options.objectPosition = 'center;position:fixed'
    const { html } = await prepareDocument({ templateJson: tpl, printData: {} }, runtime)
    expect(html).not.toContain('object-position')
    expect(html).not.toContain('position:fixed')
  }, 60000)
})
