// 端到端取证：表格单元格图片在「剪裁」档必须与独立图片元素一样裁得动（真实 Chromium）。
// 旧现状是单元格里的 fit 与锚点整体空转：td 高度由内容决定，图把行撑高后 img 盒等于整张图，余量 0。
// 这里量三件事：钉盒后 img 盒高等于可用框（而不是整张图）、行高回到声明值、取顶与取底打出的像素不同；
// 再用独立模板做门控对照——contain 档不钉盒，图照旧把行撑高。
import { describe, it, expect } from 'vitest'
import { prepareDocument, createDomHostRuntime } from '@go-wind/print-core'
import type { PrintTemplateData } from '@go-wind/print-core'
import { loadExecutorBundle } from '@go-wind/print-core/node'
import type { Page } from 'playwright'
import { BrowserPool } from './browser-pool.js'
import { createPlaywrightDriverFactory } from './driver-playwright.js'

const MM_PX = 96 / 25.4

/** 60×90 三段分色带：顶红 (229,50,45)／中白／底蓝 (45,91,229)，采样即可判定取到哪一段 */
const BANDS = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAABaCAIAAABrM6JiAAAAfUlEQVR42u3YMQ2AMBRF0bZBwl8Q0QUT6EdEJfy9EwpIGpqcq+Dkja+Oq5fdamXDoKGhoaGhoaGhoaGhoaGhoaGhv1UjwtJLls5MS0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ/8/r+mqjvN+LA0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N/TYBjikGf+uq2q8AAAAASUVORK5CYII='

/** 三列表格（30/30/20mm），单数据行声明 12mm；格子按传入顺序排，空格用 { formatter:'' } 占位 */
function tableTemplate(cells: Array<Record<string, any>>): PrintTemplateData {
  return {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{
      id: 'tbl', type: 'table',
      options: {
        // static：模板里写的就是最终行，不走数据列表展开（dynamic 下 printData 为空会一行都不出）
        left: 10, top: 10, width: 80, tableMode: 'static', tableColWidths: [30, 30, 20],
        tableRows: [{
          id: 'tr1', type: 'data', height: 12,
          cells: cells.map((c, i) => ({ id: `tc${i}`, rowspan: 1, colspan: 1, ...c })),
        }],
      },
    } as any],
  } as unknown as PrintTemplateData
}

const COVERS = [
  { cellType: 'image', formatter: BANDS, fit: 'cover', objectPosition: '50% 0%' },
  { cellType: 'image', formatter: BANDS, fit: 'cover', objectPosition: '50% 100%' },
  { formatter: '' },
]
const CONTAIN = [
  { cellType: 'image', formatter: BANDS, fit: 'contain' },
  { formatter: '' },
  { formatter: '' },
]

const runtime = createDomHostRuntime(
  createPlaywrightDriverFactory(BrowserPool.getInstance()),
  loadExecutorBundle(),
)

/** 出纸口径必须在 print 媒体下量，且要等图片解码完才有 naturalWidth */
async function openPrintPage(page: Page, html: string) {
  await page.setViewportSize({ width: 1000, height: 1000 })
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  await page.emulateMedia({ media: 'print' })
  await page.evaluate(() => Promise.all(Array.from(document.images).map(i => (i.complete ? Promise.resolve() : i.decode()))))
}

/** 把截图字节回喂给浏览器采样：CSS 裁切的结果只有这条路能读到像素 */
async function sampleCenter(page: Page, clip: { x: number; y: number; width: number; height: number }) {
  const png = (await page.screenshot({ clip })).toString('base64')
  return page.evaluate(async (b64: string) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(img, 0, 0)
    const d = g.getImageData(Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2), 1, 1).data
    return [d[0], d[1], d[2]]
  }, png)
}

const pool = BrowserPool.getInstance()

describe('单元格图片剪裁（真实 Chromium）', () => {
  it('剪裁档：img 盒钉在可用框 10mm、行高回到声明 12mm，且仍有竖向可裁余量', async () => {
    const { html } = await prepareDocument({ templateJson: tableTemplate(COVERS), printData: {} }, runtime)
    const page = await pool.acquire()
    let m: any
    try {
      await openPrintPage(page, html)
      m = await page.evaluate(() => {
        const px = (el: Element) => el.getBoundingClientRect()
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('td img')).map(i => {
          const r = px(i)
          return { w: r.width, h: r.height, nw: i.naturalWidth, nh: i.naturalHeight }
        })
        return { imgs, trH: px(document.querySelector('tr')!).height }
      })
    } finally {
      await pool.release(page)
    }
    // 列宽 30mm − 左右各 1mm 内边距 = 28mm 宽；行高 12mm − 上下各 1mm = 10mm 高
    expect(m.imgs[0].h).toBeCloseTo(10 * MM_PX, 0)
    expect(m.trH).toBeCloseTo(12 * MM_PX, 0)
    // 可裁余量：等比铺满后的内容高远大于盒高
    expect(m.imgs[0].w * (m.imgs[0].nh / m.imgs[0].nw)).toBeGreaterThan(m.imgs[0].h + 1)
  }, 60000)

  it('取顶打出图顶端红带、取底打出图底端蓝带——锚点在单元格里真的换得了画面', async () => {
    const { html } = await prepareDocument({ templateJson: tableTemplate(COVERS), printData: {} }, runtime)
    const page = await pool.acquire()
    let boxes: any[]
    let top: number[]
    let bottom: number[]
    try {
      await openPrintPage(page, html)
      boxes = await page.evaluate(() => Array.from(document.querySelectorAll('td img')).map(i => {
        const r = i.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height }
      }))
      top = await sampleCenter(page, boxes[0]) as number[]
      bottom = await sampleCenter(page, boxes[1]) as number[]
    } finally {
      await pool.release(page)
    }
    expect(top).toEqual([229, 50, 45])
    expect(bottom).toEqual([45, 91, 229])
  }, 60000)

  it('门控对照：contain 档不钉盒，图按内在尺寸把行撑高（存量模板出纸不变）', async () => {
    const { html } = await prepareDocument({ templateJson: tableTemplate(CONTAIN), printData: {} }, runtime)
    const page = await pool.acquire()
    let c: any
    try {
      await openPrintPage(page, html)
      c = await page.evaluate(() => {
        const i = document.querySelector<HTMLImageElement>('td img')!
        const r = i.getBoundingClientRect()
        return { h: r.height, nh: i.naturalHeight, trH: document.querySelector('tr')!.getBoundingClientRect().height }
      })
    } finally {
      await pool.release(page)
    }
    expect(c.h).toBeCloseTo(c.nh, 0)
    expect(c.trH).toBeGreaterThan(12 * MM_PX)
  }, 60000)
})
