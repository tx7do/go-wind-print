import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import {
  defaultZoomKey,
  fitZoom,
  paperWidthPx,
  resolvePrinterDpi,
  zoomPresets,
} from '../composables/usePreviewZoom'

const MM_TO_PX = 96 / 25.4

/** 预览 iframe 的渲染产物与本用例无关：桩掉 core/browser，只验缩放写进文档 */
const PREVIEW_HTML = '<html><head></head><body><div class="print-page">纸面</div></body></html>'
vi.mock('@worm-vue3-print/core/browser', () => ({
  renderHtmlPages: async () => ({ html: PREVIEW_HTML, pageCount: 1, copies: 1 }),
  browserCodeRenderer: { render: () => '<svg />' },
}))

const TEMPLATE_WITH_DPI = {
  paperSize: 'CUSTOM',
  customWidth: 95,
  customHeight: 75,
  elements: [
    { type: 'barcode', options: { printerDpi: 203 } },
    {
      type: 'table',
      options: { tableRows: [{ cells: [{ cellType: 'barcode', printerDpi: 300 }] }] },
    },
  ],
}

describe('usePreviewZoom 档位计算', () => {
  it('从元素与表格单元格收集 printerDpi，多档取最细点距', () => {
    expect(resolvePrinterDpi(TEMPLATE_WITH_DPI)).toBe(300)
    expect(resolvePrinterDpi({ elements: [{ options: {} }] })).toBeNull()
    expect(resolvePrinterDpi(null)).toBeNull()
    // 多页模板要能翻到 pages 里的元素
    expect(resolvePrinterDpi({ pages: [{ elements: [{ options: { printerDpi: 203 } }] }] })).toBe(203)
  })

  it('纸张宽度按 CSS 96px/in 换算，自定义与预设纸型都覆盖', () => {
    expect(paperWidthPx({ customWidth: 95 })).toBeCloseTo(95 * MM_TO_PX, 6)
    expect(paperWidthPx({ paperSize: 'A4', orientation: 'portrait' })).toBeCloseTo(210 * MM_TO_PX, 6)
    expect(paperWidthPx({ paperSize: 'A4', orientation: 'landscape' })).toBeCloseTo(297 * MM_TO_PX, 6)
    expect(paperWidthPx(undefined)).toBeCloseTo(210 * MM_TO_PX, 6)
  })

  it('适配档只给整数倍，且夹在 1~8 之间', () => {
    const paper = 95 * MM_TO_PX
    expect(fitZoom(800, paper)).toBe(2)
    expect(fitZoom(200, paper)).toBe(1)
    expect(fitZoom(5000, paper)).toBe(8)
    expect(fitZoom(0, paper)).toBe(1)
  })

  it('点阵档 = dpi/96，即 1 屏幕像素 = 1 打印点；无 dpi 时不给该档', () => {
    const withDpi = zoomPresets(203, 800, 95 * MM_TO_PX)
    expect(withDpi[0]!.key).toBe('dots')
    expect(withDpi[0]!.value).toBeCloseTo(203 / 96, 6)
    expect(zoomPresets(null, 800, 95 * MM_TO_PX)[0]!.key).toBe('fit')
  })

  it('默认档：能点对齐就先给点阵，否则适配', () => {
    expect(defaultZoomKey(203)).toBe('dots')
    expect(defaultZoomKey(null)).toBe('fit')
  })
})

describe('PrintHtmlPreview 档位状态', () => {
  // happy-dom 的 iframe 没有 contentWindow.document，缩放写进文档这一步只能在真实浏览器验；
  // 这里锁住可控的部分：默认档、档位表、切档与非法档位忽略，且缺文档时不抛错。
  async function make(templateJson: Record<string, any>) {
    const { default: PrintHtmlPreview } = await import('../components/PrintHtmlPreview.vue')
    const wrapper = mount(PrintHtmlPreview, { props: { templateJson } })
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('带 printerDpi 的模板默认落在点阵档，倍率 = dpi/96', async () => {
    const wrapper = await make(TEMPLATE_WITH_DPI)
    expect(wrapper.vm.zoomKey).toBe('dots')
    const dots = wrapper.vm.presets.find((p: any) => p.key === 'dots')
    expect(dots.value).toBeCloseTo(300 / 96, 6)
    wrapper.unmount()
  })

  it('没有 printerDpi 时不给点阵档，默认落到适配', async () => {
    const wrapper = await make({ elements: [{ options: {} }] })
    expect(wrapper.vm.zoomKey).toBe('fit')
    expect(wrapper.vm.presets.some((p: any) => p.key === 'dots')).toBe(false)
    wrapper.unmount()
  })

  it('点档位按钮切档，setViewZoom 忽略不在册的档位', async () => {
    const wrapper = await make(TEMPLATE_WITH_DPI)
    const btn = wrapper.findAll('.print-html-preview-zoom-btn').find(b => b.text() === '200%')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect(wrapper.vm.zoomKey).toBe('200')
    wrapper.vm.setViewZoom('nope')
    expect(wrapper.vm.zoomKey).toBe('200')
    wrapper.vm.setViewZoom('dots')
    expect(wrapper.vm.zoomKey).toBe('dots')
    wrapper.unmount()
  })

  it('错误态不渲染缩放条，避免在空文档上写档位', async () => {
    const { default: PrintHtmlPreview } = await import('../components/PrintHtmlPreview.vue')
    const wrapper = mount(PrintHtmlPreview, { props: { templateJson: null } })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.print-html-preview-zoom-btn').length).toBe(0)
    wrapper.unmount()
  })
})
