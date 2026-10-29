// 设计态二维码：图形必须与出纸同源，且铺满元素盒
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import { browserCodeRenderer } from '@go-wind/print-core/browser'
import type { RuntimeElement } from '@go-wind/print-core/designer'
import QrcodeElement from '../components/elements/QrcodeElement.vue'

const SVG_SRC_PREFIX = 'data:image/svg+xml;charset=utf-8,'

function makeElement(options: Partial<RuntimeElement['options']> = {}): RuntimeElement {
  return {
    id: 'el-qrcode',
    options: { left: 0, top: 0, width: 60, height: 60, testData: 'qrcode', ...options },
    printElementType: { type: 'qrcode', title: '二维码' },
  }
}

async function mountQrcode(options: Partial<RuntimeElement['options']> = {}) {
  const element = reactive(makeElement(options))
  const wrapper = mount(QrcodeElement, { props: { element, designMode: true } })
  await flushPromises()
  return wrapper
}

function decls(wrapper: ReturnType<typeof mount>): string[] {
  const style = wrapper.find('img').attributes('style') ?? ''
  // DOM 序列化会在冒号后补空格（width: 100%），去掉空白再逐条比对
  return style.split(';').map(d => d.replace(/\s+/g, '')).filter(Boolean)
}

/** 取 img 里那份同源 SVG 的 viewBox 边长（静区改动只体现在这张方图上） */
function viewBoxSize(wrapper: ReturnType<typeof mount>): number {
  const src = wrapper.find('img').attributes('src') ?? ''
  const svg = decodeURIComponent(src.slice(SVG_SRC_PREFIX.length))
  const m = /viewBox="0 0 (\d+) \1"/.exec(svg)
  if (!m) throw new Error(`SVG 未按预期输出：${svg.slice(0, 60)}`)
  return Number(m[1])
}

describe('QrcodeElement 铺满元素盒', () => {
  it('img 显式给出 width/height:100%（只给 max-* 时停在内在像素尺寸，盒大于它就不铺满）', async () => {
    const wrapper = await mountQrcode()
    const list = decls(wrapper)
    expect(list).toContain('width:100%')
    expect(list).toContain('height:100%')
  })

  it('fit 未设置时按 contain 输出（与属性面板默认「包含」同口径）', async () => {
    const wrapper = await mountQrcode()
    expect(decls(wrapper)).toContain('object-fit:contain')
  })

  it('qrQuietZone 透传到图形：未设置即缺省 0（码面铺满），2 / 4 各自留白', async () => {
    // 码值 'qrcode' 在 M 级下为 21 模块，每模块 4 用户单位 → 码面 84
    const face = 21 * 4
    expect(viewBoxSize(await mountQrcode())).toBe(face)
    expect(viewBoxSize(await mountQrcode({ qrQuietZone: 0 }))).toBe(face)
    expect(viewBoxSize(await mountQrcode({ qrQuietZone: 2 }))).toBe(face + 2 * 2 * 4)
    expect(viewBoxSize(await mountQrcode({ qrQuietZone: 4 }))).toBe(face + 2 * 4 * 4)
  })

  it('设计态图形与出纸同源：src 解码后逐字等于 browserCodeRenderer 的输出', async () => {
    const wrapper = await mountQrcode({ testData: 'https://example.com/order/123', qrCodeLevel: 'H', qrQuietZone: 1 })
    const src = wrapper.find('img').attributes('src') ?? ''
    expect(src.startsWith(SVG_SRC_PREFIX), `设计态应出同源 SVG，实际 src 前缀：${src.slice(0, 40)}`).toBe(true)
    expect(decodeURIComponent(src.slice(SVG_SRC_PREFIX.length))).toBe(
      browserCodeRenderer.render('https://example.com/order/123', 'qrcode', { qrCodeLevel: 'H', qrQuietZone: 1 }),
    )
  })
})
