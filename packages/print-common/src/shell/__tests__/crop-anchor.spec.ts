// @vitest-environment happy-dom
// 裁剪锚点 Common 端契约：与 canvas 同 DOM 结构、同判轴口径；顺带锁住单元格图片必须撑满内容盒。
import { describe, it, expect } from 'vitest'
import type { RuntimeElement } from '@worm-vue3-print/core/designer'
import { CROP_SAMPLE_IMAGE } from '@worm-vue3-print/core/designer'
import { DesignerStore } from '../../core/store'
import { FormatToolbar } from '../../core/format'
import { render } from '../../core/h'
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
function paintElement(type: Parameters<DesignerStore['addElement']>[0], options: Record<string, any>) {
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

  it('缺省（包含）档就出锚点行，带示意图容器；只有拉伸填满不给', () => {
    const { host } = paintElement('image', { src: 'a' })
    expect(rowOf(host, '裁剪锚点')).toBeTruthy()
    expect(host.querySelector('.pd-crop-preview')).toBeTruthy()

    const filled = paintElement('image', { src: 'a', fit: 'fill' })
    expect(rowOf(filled.host, '裁剪锚点')).toBeUndefined()
  })

  it('图片没设置时示意回落内置示例图，并说破这是示例图', () => {
    const { host } = paintElement('image', { fit: 'cover' })
    expect(host.querySelector<HTMLImageElement>('.pd-crop-thumb')!.getAttribute('src')).toBe(CROP_SAMPLE_IMAGE)
    expect(host.textContent).toContain('示例图')
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

  it('两框常驻：拿不到尺寸时也在，拿到后也不收掉挪不动的那一轴', () => {
    const { host } = paintElement('image', { src: 'a', fit: 'cover' })
    expect(rowOf(host, '水平位置')).toBeTruthy()
    expect(rowOf(host, '垂直位置')).toBeTruthy()

    loadSize(host, 600, 900)
    expect(rowOf(host, '水平位置')).toBeTruthy()
    expect(rowOf(host, '垂直位置')).toBeTruthy()
    // 档位仍只给能动的那一轴，提示逐轴报数
    expect(rowOf(host, '裁剪锚点')!.querySelector('select')!.value).toBe('50,50')
    expect(host.textContent).toContain('垂直可挪 7.5mm；水平这一轴已贴满，挪不动')
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
    // 容器类名与 canvas `TableCellGroup.vue` 同挂点（class-audit 反查 canvas 类名清单）
    expect(cropped.host.querySelector('.pd-cell-anchor')).toBeTruthy()
  })

  it('单元格台 cover 档也叫剪裁', () => {
    const { host } = cellHarness({ cellType: 'image', formatter: 'a' })
    expect(host.textContent).toContain('剪裁（等比铺满后裁边）')
    expect(host.textContent).not.toContain('覆盖（保持比例）')
  })

  it('剪裁档钉盒：外框钉在可用框高、img 撑满该盒（与 canvas、出纸同一口径）', () => {
    const { canvas } = cellHarness({ cellType: 'image', formatter: 'a', fit: 'cover', objectPosition: '50% 0%' })
    // 该 harness 行高 10mm、内边距缺省 1mm、无边框 → 可用框 8mm
    expect(canvas.querySelector<HTMLElement>('.cell-image')!.style.height).toBe('8mm')
    const img = canvas.querySelector<HTMLImageElement>('td img')!
    expect(img.style.width).toBe('100%')
    expect(img.style.height).toBe('100%')
    expect(img.style.objectPosition).toBe('50% 0%')
  })

  it('可挪量按可用内容框算（扣内边距），与出纸钉盒同一口径', () => {
    const { host } = cellHarness({ cellType: 'image', formatter: 'cell-box.png', fit: 'cover' })
    loadSize(host, 60, 90)
    // 格 50×10、内边距各 1mm → 可用框 48×8：scale 0.8，可挪 90×0.8−8=64mm（照原始 50×10 会报成 65mm）
    expect(host.textContent).toContain('64mm')
  })

  it('门控只在剪裁档：contain 不钉盒，td 高度仍由内容决定', () => {
    const { canvas } = cellHarness({ cellType: 'image', formatter: 'a', fit: 'contain' })
    expect(canvas.querySelector<HTMLElement>('.cell-image')!.style.height).toBe('')
    expect(canvas.querySelector<HTMLImageElement>('td img')!.style.width).toBe('')
  })

  it('示例图只进属性台：画布上的空图片仍是虚线「图片」占位', () => {
    const { canvas, host } = cellHarness({ cellType: 'image', fit: 'cover' })
    expect(canvas.querySelector('.cell-image img')).toBeNull()
    expect(canvas.querySelector('.cell-image .image-placeholder')?.textContent).toBe('图片')
    // 属性台那侧仍按内置示例图演示取位
    expect(host.querySelector<HTMLImageElement>('.pd-cell-anchor .pd-crop-thumb')!.getAttribute('src'))
      .toBe(CROP_SAMPLE_IMAGE)
  })
})
