// @vitest-environment happy-dom
// 裁剪锚点 Common 端契约：与 canvas 同 DOM 结构、同判轴口径；顺带锁住单元格图片必须撑满内容盒。
import { describe, it, expect } from 'vitest'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { h, render } from '../../core/h'
import type { ShellCtx, ShellState } from '../controls'
import { renderPropertyPanel } from '../property-panel'
import { tableCellGroup } from '../table-props'
import { renderTable } from '../table'

function makeState(): ShellState {
  return {
    leftTab: 'elements', leftCollapsed: false, propTab: 'element', propCollapsed: false,
    openDd: null, collapsedGroups: new Set(), renamingPage: null,
  }
}

/** 渲染元素台；repaint 走真实重绘，模拟宿主改一次 store 就整台重画 */
function paintElement(type: string, options: Record<string, any>) {
  const store = new DesignerStore()
  store.addElement(type, { left: 10, top: 10, width: 35, height: 45, ...options })
  store.selectOne(store.elements[0]!.id)
  const host = document.createElement('div')
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state: makeState(),
    repaint: () => { host.replaceChildren(); render(renderPropertyPanel(ctx), host) },
    fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  ctx.repaint()
  document.body.replaceChildren(host)
  return { host, ctx, el: store.elements[0]! }
}

const rowOf = (host: HTMLElement, text: string) =>
  Array.from(host.querySelectorAll<HTMLElement>('.pd-field'))
    .find(f => (f.querySelector('.pd-label')?.textContent ?? '').includes(text))

function cellHarness(cellOptions: Record<string, any>) {
  const store = new DesignerStore()
  store.addElement('table', { left: 10, top: 10, width: 60, height: 10 })
  const el: RuntimeElement = store.elements[0]!
  el.options.tableColWidths = [50]
  el.options.tableRows = [{
    id: 'r1', type: 'data', height: 10, cells: [{ id: 'c1', ...cellOptions }],
  } as never]
  store.setTableSelection({ elementId: el.id, r1: 0, c1: 0, r2: 0, c2: 0 })
  const host = document.createElement('div')
  const ctx: ShellCtx = {
    store, format: new FormatToolbar(store), state: makeState(),
    repaint: () => { host.replaceChildren(); render(tableCellGroup(ctx, el), host) },
    fire: () => {}, showHelp: true, isEdit: false, host: {},
  }
  ctx.repaint()
  document.body.replaceChildren(host)
  const canvas = document.createElement('div')
  render(renderTable(el, store, () => {}), canvas)
  return { host, canvas, cell: el.options.tableRows![0].cells[0] }
}

/** 给预览图喂自然尺寸并触发 load */
function loadSize(host: HTMLElement, w: number, h_: number) {
  const img = host.querySelector<HTMLImageElement>('.pd-crop-thumb')!
  Object.defineProperty(img, 'naturalWidth', { value: w, configurable: true })
  Object.defineProperty(img, 'naturalHeight', { value: h_, configurable: true })
  img.dispatchEvent(new Event('load'))
}

describe('元素台缩放模式与锚点', () => {
  it('cover 档对用户叫「剪裁」，旧文案不再出现', () => {
    const { host } = paintElement('image', { src: 'a' })
    expect(rowOf(host, '缩放模式')).toBeTruthy()
    expect(host.textContent).toContain('剪裁（等比铺满后裁边）')
    expect(host.textContent).not.toContain('覆盖（保持比例）')
  })

  it('未选剪裁时锚点行整个不出现', () => {
    const { host } = paintElement('image', { src: 'a' })
    expect(rowOf(host, '裁剪锚点')).toBeUndefined()
  })

  it('选了剪裁出锚点行，且带示意图容器', () => {
    const { host } = paintElement('image', { src: 'a', fit: 'cover' })
    expect(rowOf(host, '裁剪锚点')).toBeTruthy()
    expect(host.querySelector('.pd-crop-preview')).toBeTruthy()
  })

  it('锚点选档写入 objectPosition，选回居中撤键', () => {
    const { host, el } = paintElement('image', { src: 'a', fit: 'cover' })
    const select = rowOf(host, '裁剪锚点')!.querySelector('select')!
    select.value = '50,0'
    select.dispatchEvent(new Event('change'))
    expect(el.options.objectPosition).toBe('50% 0%')

    select.value = '50,50'
    select.dispatchEvent(new Event('change'))
    expect(el.options.objectPosition).toBeUndefined()
  })

  it('拿不到自然尺寸时两轴都给；拿到后只留能挪的那一轴', () => {
    const { host } = paintElement('image', { src: 'a', fit: 'cover' })
    expect(rowOf(host, '水平位置')).toBeTruthy()
    expect(rowOf(host, '垂直位置')).toBeTruthy()

    loadSize(host, 600, 900)
    expect(rowOf(host, '水平位置')).toBeUndefined()
    expect(rowOf(host, '垂直位置')).toBeTruthy()
    expect(rowOf(host, '裁剪锚点')!.querySelector('select')!.value).toBe('50,50')
  })

  it('可视窗按实测比例落位（竖图居中：占满宽、高 85.7143%、下移 7.1429%）', () => {
    const { host } = paintElement('image', { src: 'a', fit: 'cover' })
    loadSize(host, 600, 900)
    const win = host.querySelector<HTMLElement>('.pd-crop-win')!
    const decls = (win.getAttribute('style') ?? '').split(';').map(s => s.trim()).filter(Boolean)
    expect(decls).toContain('width: 100%')
    expect(decls).toContain('height: 85.7143%')
    expect(decls).toContain('top: 7.1429%')
    expect(decls).toContain('left: 0%')
  })

  it('表达不了的存量写法选中自定义且不改写模板值', () => {
    const { host, el } = paintElement('image', { src: 'a', fit: 'cover', objectPosition: 'left 4mm top 6mm' })
    const select = rowOf(host, '裁剪锚点')!.querySelector('select')!
    expect(select.value).toBe('custom')
    expect(el.options.objectPosition).toBe('left 4mm top 6mm')
  })
})

describe('单元格台与单元格出图', () => {
  it('图片单元格同样只在剪裁档出锚点行', () => {
    const plain = cellHarness({ cellType: 'image', formatter: 'a' })
    expect(rowOf(plain.host, '裁剪锚点')).toBeUndefined()

    const cropped = cellHarness({ cellType: 'image', formatter: 'a', fit: 'cover' })
    expect(rowOf(cropped.host, '裁剪锚点')).toBeTruthy()
  })

  it('单元格台 cover 档也叫剪裁', () => {
    const { host } = cellHarness({ cellType: 'image', formatter: 'a' })
    expect(host.textContent).toContain('剪裁（等比铺满后裁边）')
    expect(host.textContent).not.toContain('覆盖（保持比例）')
  })

  it('已知限制：单元格图片不撑满盒（td 高度由内容定，锚点在单元格里裁不动）', () => {
    const { canvas } = cellHarness({ cellType: 'image', formatter: 'a', fit: 'cover', objectPosition: '50% 0%' })
    const img = canvas.querySelector<HTMLImageElement>('td img')!
    const decls = (img.getAttribute('style') ?? '').split(';').map(s => s.trim()).filter(Boolean)
    expect(decls).not.toContain('width: 100%')
    expect(decls).not.toContain('height: 100%')
    expect(decls).toContain('object-position: 50% 0%')
  })
})
