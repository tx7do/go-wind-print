// services/print-render/src/follow-region.integration.test.ts
// 端到端：表格真实分页产生的「跟随区」里的线条元素，落纸几何是否保留（台账 T-11 C1）。
// 这里跑的是服务端真链路：绑定 → 测量趟（Chromium 实测行高）→ 分页引擎自己检出 followElementIds → 最终 HTML。
// 与 core 的声明级用例互补：那边钉住 `needsHeight`，这边钉住「分页引擎真的会把竖线吸进跟随区，且吸进去后还有长度」。
import { describe, it, expect } from 'vitest'
import {
  bindData,
  createDomHostRuntime,
  generateHtml,
  getPaperDimensions,
  paperViewportPx,
  paginate,
  prepareDocument,
  normalizeMeasurements,
} from '@worm-vue3-print/core'
import type { PrintTemplateData } from '@worm-vue3-print/core'
import { loadExecutorBundle } from '@worm-vue3-print/core/node'
import { BrowserPool } from './browser-pool.js'
import { createPlaywrightDriverFactory } from './driver-playwright.js'

/** 表格设计底 40mm；60 条明细足够撑到第二页。竖线放在表格下方 5mm，应被跟随区吸走 */
function flowTemplate(): PrintTemplateData {
  return {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] },
    footer: { height: 0, elements: [] },
    elements: [
      {
        id: 'tbl',
        type: 'table',
        options: {
          left: 10, top: 10, width: 100, height: 30,
          tableMode: 'dynamic',
          tableColWidths: [100],
          dataSource: 'items',
          tableRows: [
            { id: 'h', type: 'header', height: 10, cells: [{ id: 'h0', formatter: '品名', fontSize: 10, padding: 1 }] },
            { id: 'd', type: 'data', height: 10, cells: [{ id: 'd0', formatter: '{items.name}', fontSize: 10, padding: 1 }] },
          ],
        },
      },
      { id: 'vl', type: 'vline', options: { left: 12, top: 45, width: 1.8, height: 14 } },
      { id: 'hl', type: 'hline', options: { left: 12, top: 62, width: 80, height: 1.8 } },
    ],
  } as unknown as PrintTemplateData
}

const runtime = createDomHostRuntime(
  createPlaywrightDriverFactory(BrowserPool.getInstance()),
  loadExecutorBundle(),
)

/** 取跟随区里某个线元素那一行的内联样式 */
function followStyle(html: string, topPattern: RegExp): string {
  const block = /<div class="flow-follow"[\s\S]*?<\/div>\s*<\/div>/.exec(html)?.[0] ?? ''
  const style = new RegExp(`style="position:absolute;[^"]*${topPattern.source}[^"]*"`).exec(block)?.[0] ?? ''
  return style
}

describe('跟随区线条（服务端真实分页）', () => {
  it('分页引擎确实把表格下方的竖线检出进跟随区，且两趟管线都给它 height', async () => {
    const tpl = flowTemplate()
    const data = { items: Array.from({ length: 60 }, (_, i) => ({ name: `明细 ${i + 1}` })) }
    const prepared = await prepareDocument({ templateJson: tpl, printData: data }, runtime)
    expect(prepared.pageCount).toBeGreaterThanOrEqual(2)
    expect(prepared.html).toContain('class="flow-follow"')

    const style = followStyle(prepared.html, /top:\d+(\.\d+)?mm/)
    expect(style).toContain('border-left')
    expect(style).toContain('height:14mm') // C1：没有这条就是 0 高、纸上整条消失
    console.log('跟随区 vline 样式：', style)
  }, 120000)

  it('对照：横线在跟随区仍不出 height（它的长度走 width），且分页输入不带业务侧误判', async () => {
    const tpl = flowTemplate()
    const data = { items: Array.from({ length: 60 }, (_, i) => ({ name: `明细 ${i + 1}` })) }
    const bound = bindData(tpl as never, data) as never as Parameters<typeof paginate>[0]
    const viewport = paperViewportPx(getPaperDimensions(bound))
    const { measurements } = await runtime.withSession({}, session => session.measure(
      generateHtml(bound, [], data, { isMeasurementPass: true }),
      viewport,
    ))
    const measured = normalizeMeasurements(measurements, bound as never)
    const table = measured.get('tbl')
    expect((table?.measuredRowHeights?.length ?? 0)).toBeGreaterThan(10) // 60 条明细真的被实测过

    const html = generateHtml(bound, paginate(bound, measured), data)
    const hl = followStyle(html, /width:80mm/)
    expect(hl).toContain('border-top')
    expect(hl).not.toContain('height:1.8mm') // hline 的 height:0 是有意为之，C1 不许顺手动它
  }, 120000)
})
