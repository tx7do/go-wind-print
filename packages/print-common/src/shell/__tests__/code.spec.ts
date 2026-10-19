// @vitest-environment happy-dom
// 元素级码类绘制：二维码图形必须与出纸同源，且铺满元素盒
import { describe, it, expect } from 'vitest'
import { browserCodeRenderer } from '@worm-vue3-print/core/browser'
import type { RuntimeElement, TableRow } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { hydrateCodes, renderQrcode } from '../code'
import { renderPropertyPanel } from '../property-panel'
import { tableCellGroup } from '../table-props'

const SVG_SRC_PREFIX = 'data:image/svg+xml;charset=utf-8,'

function makeElement(options: Partial<RuntimeElement['options']> = {}): RuntimeElement {
  return {
    id: 'el-qrcode',
    options: { left: 0, top: 0, width: 60, height: 60, testData: 'qrcode', ...options },
    printElementType: { type: 'qrcode', title: '二维码' },
  }
}

/** 走真实渲染路径：renderQrcode 出壳 → hydrateCodes 补图（异步，等一轮定时器） */
async function paintQrcode(options: Partial<RuntimeElement['options']> = {}) {
  const el = makeElement(options)
  const host = document.createElement('div')
  document.body.replaceChildren(host)
  render(renderQrcode(el), host)
  hydrateCodes(host as unknown as ShadowRoot, [el])
  await new Promise(r => setTimeout(r, 300))
  return host
}

function qrcodeImg(host: HTMLElement): HTMLImageElement {
  const img = host.querySelector('img')
  if (!img) throw new Error('二维码未出图')
  return img as HTMLImageElement
}

describe('common 元素级二维码', () => {
  it('img 显式给出 width/height:100%（只给 max-* 时停在内在像素尺寸，盒大于它就不铺满）', async () => {
    const img = qrcodeImg(await paintQrcode())
    expect(img.style.width).toBe('100%')
    expect(img.style.height).toBe('100%')
  })
  it('qrQuietZone 透传到图形：未设置即缺省 0（码面铺满），2 / 4 各自留白', async () => {
    // 码值 'qrcode' 在 M 级下为 21 模块，每模块 4 用户单位 → 码面 84
    const face = 21 * 4
    const viewBoxSize = async (options: Partial<RuntimeElement['options']>) => {
      const src = qrcodeImg(await paintQrcode(options)).getAttribute('src') ?? ''
      const m = /viewBox="0 0 (\d+) \1"/.exec(decodeURIComponent(src.slice(src.indexOf(',') + 1)))
      if (!m) throw new Error('SVG 未按预期输出')
      return Number(m[1])
    }
    expect(await viewBoxSize({})).toBe(face)
    expect(await viewBoxSize({ qrQuietZone: 2 })).toBe(face + 2 * 2 * 4)
    expect(await viewBoxSize({ qrQuietZone: 4 })).toBe(face + 2 * 4 * 4)
  })

  it('设计态图形与出纸同源：src 解码后逐字等于 browserCodeRenderer 的输出', async () => {
    const src = qrcodeImg(await paintQrcode({ testData: 'https://example.com/x', qrCodeLevel: 'Q' })).src
    const encoded = src.slice(src.indexOf(',') + 1)
    expect(src.startsWith(SVG_SRC_PREFIX), `实际 src 前缀：${src.slice(0, 40)}`).toBe(true)
    expect(decodeURIComponent(encoded)).toBe(
      browserCodeRenderer.render('https://example.com/x', 'qrcode', { qrCodeLevel: 'Q' }),
    )
  })
})

describe('common 单元格二维码静区（属性台）', () => {
  /** 只渲染单元格分组：其余 ctx 字段按面板要求补齐 */
  function paintCellProps(cellPatch: Record<string, any>) {
    const store = new DesignerStore()
    const rows: TableRow[] = [{
      id: 'r1', type: 'static', height: 8,
      cells: [{ id: 'c1', formatter: 'QR', cellType: 'qrcode', ...cellPatch } as never],
    }]
    store.addElement('table', {
      left: 10, top: 10, width: 100, height: 8, tableColWidths: [100], tableRows: rows,
    } as never)
    const el = store.elements[0]!
    store.selectOne(el.id)
    store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2: 0 } as never)
    const ctx: ShellCtx = {
      store,
      format: new FormatToolbar(store),
      state: {
        leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
        openDd: null, collapsedGroups: new Set<string>(), renamingPage: null,
      } as unknown as ShellState,
      repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: { fonts: [] },
    } as unknown as ShellCtx
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    render(tableCellGroup(ctx, el), host)
    const cell = () => (store.elements[0]!.options.tableRows as TableRow[])[0]!.cells[0]!
    return { host, cell }
  }

  function quietField(host: HTMLElement): HTMLElement | undefined {
    return Array.from(host.querySelectorAll<HTMLElement>('.pd-field'))
      .find(f => f.querySelector('.pd-label')?.textContent === '静区 (模块)')
  }
  const quietInput = (host: HTMLElement) => quietField(host)?.querySelector('input[type="number"]') as HTMLInputElement | undefined

  it('说明挂在标签后的帮助图标上（悬浮/点击显示），不常驻文字提示', () => {
    const field = quietField(paintCellProps({}).host)!
    expect(field, '应存在静区字段').toBeTruthy()
    const help = field.querySelector('.pd-help')
    expect(help, '静区标签后应有帮助图标').toBeTruthy()
    expect(help!.getAttribute('data-tip')).toContain('0 即不留白边')
    expect(field.querySelector('.pd-hint'), '说明不应常驻成一行文字').toBeNull()
  })

  it('从 4 改回 0 会真写进单元格（显式存 0，不被 orUndef 那类假值判断归并成未设置）', () => {
    const { host, cell } = paintCellProps({ qrQuietZone: 4 })
    const input = quietInput(host)
    expect(input, '单元格属性台应出「静区 (模块)」').toBeTruthy()
    expect(input!.value).toBe('4')
    input!.value = '0'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    input!.dispatchEvent(new Event('change', { bubbles: true }))
    expect(cell().qrQuietZone).toBe(0)
  })

  it('未设置显示 0（与渲染器缺省档一致），已设置按存值显示', () => {
    expect(quietInput(paintCellProps({}).host)!.value).toBe('0')
    expect(quietInput(paintCellProps({ qrQuietZone: 4 }).host)!.value).toBe('4')
  })
})

describe('common 二维码元素静区（元素属性台）', () => {
  it('元素面板的静区字段同样把说明挂到帮助图标上，且无常驻文字提示', () => {
    const store = new DesignerStore()
    store.addElement('qrcode', { left: 10, top: 10, width: 40, height: 40 } as never)
    store.selectOne(store.elements[0]!.id)
    const ctx: ShellCtx = {
      store,
      format: new FormatToolbar(store),
      state: {
        leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
        openDd: null, collapsedGroups: new Set<string>(), renamingPage: null,
      } as unknown as ShellState,
      repaint: () => {}, fire: () => {}, showHelp: true, isEdit: false, host: { fonts: [] },
    } as unknown as ShellCtx
    const host = document.createElement('div')
    document.body.replaceChildren(host)
    render(renderPropertyPanel(ctx), host)

    const field = Array.from(host.querySelectorAll<HTMLElement>('.pd-field'))
      .find(f => f.querySelector('.pd-label')?.textContent === '静区 (模块)')
    expect(field, '元素属性台应出「静区 (模块)」').toBeTruthy()
    const help = field!.querySelector('.pd-help')
    expect(help, '静区标签后应有帮助图标').toBeTruthy()
    expect(help!.getAttribute('data-tip')).toContain('数值越大白边越宽')
    expect(field!.querySelector('.pd-hint'), '说明不应常驻成一行文字').toBeNull()
  })
})
