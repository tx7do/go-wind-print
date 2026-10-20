// 裁剪锚点控件：DOM 对齐 canvas 的 property/CropAnchorField.vue
// （.pd-crop-anchor > .pd-field>.pd-label(+button.pd-help) + select.pd-select / .pd-stepper /
//  .pd-crop-note / .pd-crop-preview>img.pd-crop-thumb+div.pd-crop-win）。
// 判轴、档位表、行模型、提示文案全部取自 core 的 crop-anchor，两端不再各写一遍。
import {
  buildCropAnchor,
  CROP_SAMPLE_NOTE,
  cropAxisFields,
  cropAxisNote,
  cropPresetOptions,
  cropWindow,
  parseCropAnchor,
  propertyTip,
  resolveCropPreview,
  resolveCropTravel,
} from '@worm-vue3-print/core/designer'
import { h } from '../core/h'
import { labelHelp, stepper } from './controls'
import type { ShellCtx } from './controls'

/** 自然尺寸按 src 缓存：宿主每改一次属性就整台重绘，重量一次就是一次 load 回环 */
const sizeCache = new Map<string, { width: number; height: number }>()

export interface CropAnchorOpts {
  fieldKey: string
  label: string
  /** 已解析的图片地址（表达式由宿主求值后传入）；为空则回落内置示例图 */
  src: string
  widthMm: number
  heightMm: number
  /** 缩放模式（CSS object-fit 原值，缺省按 contain）：可挪余量按它逐轴结算 */
  fit?: string
  value?: string
  onCommit: (value: string | undefined) => void
}

/** 四位小数够定位红框，又不会把属性写成浮点长串 */
function pct(v: number): string {
  return `${Math.round(v * 10000) / 10000}%`
}

export function cropAnchorField(ctx: ShellCtx, o: CropAnchorOpts) {
  const parsed = parseCropAnchor(o.value)
  const keepRaw = parsed.kind === 'custom'
  const x = parsed.kind === 'axes' ? parsed.x : 50
  const y = parsed.kind === 'axes' ? parsed.y : 50
  const preview = resolveCropPreview(o.src)
  const size = sizeCache.get(preview.src)
  const box = {
    widthMm: o.widthMm,
    heightMm: o.heightMm,
    naturalWidth: size?.width,
    naturalHeight: size?.height,
    fit: o.fit,
  }
  /** 逐轴余量：cover 挪溢出、contain／原始尺寸／缩小 挪框内空位；拿不到尺寸给 null */
  const travel = resolveCropTravel(box)
  const win = cropWindow(box, x, y)

  // 下拉用真节点建：与 selectField 同因——匹配不到选项时要能落进「空白/自定义」态
  const select = document.createElement('select')
  select.className = 'pd-select'
  select.style.width = '100%'
  for (const p of cropPresetOptions(travel, x, y)) {
    const opt = document.createElement('option')
    opt.value = p.value
    opt.textContent = p.label
    select.appendChild(opt)
  }
  if (keepRaw) {
    const opt = document.createElement('option')
    opt.value = 'custom'
    opt.textContent = '自定义（保留原值）'
    select.appendChild(opt)
  }
  select.value = keepRaw ? 'custom' : `${x},${y}`
  if (select.selectedIndex < 0) select.selectedIndex = keepRaw ? select.options.length - 1 : 0
  select.addEventListener('change', () => {
    if (select.value === 'custom') return
    const [nx, ny] = select.value.split(',').map(Number)
    o.onCommit(buildCropAnchor(nx, ny))
  })

  const tip = propertyTip(o.fieldKey)
  const rows: unknown[] = [h('div', { class: 'pd-field', dataset: { field: o.fieldKey } }, [
    h('span', { class: 'pd-label' }, [o.label, labelHelp(tip)]),
    select,
  ])]
  for (const f of cropAxisFields(travel, x, y)) {
    rows.push(h('div', { class: 'pd-field', dataset: { field: o.fieldKey } }, [
      h('span', { class: 'pd-label', text: f.label }),
      stepper({
        value: f.value, min: 0, max: 100, step: 1,
        onCommit: v => o.onCommit(buildCropAnchor(f.name === 'horizontal' ? v : x, f.name === 'vertical' ? v : y)),
      }),
    ]))
  }

  const note = cropAxisNote(travel, keepRaw)
  if (note) rows.push(h('p', { class: 'pd-crop-note', text: note }))

  if (preview.isSample) rows.push(h('p', { class: 'pd-crop-note', text: CROP_SAMPLE_NOTE }))

  rows.push(h('div', { class: 'pd-crop-preview' }, [
    h('img', {
      class: 'pd-crop-thumb', src: preview.src, alt: preview.isSample ? '示例图' : '原图',
      onLoad: (ev: Event) => {
        const img = ev.target as HTMLImageElement
        if (!(img.naturalWidth > 0 && img.naturalHeight > 0)) return
        const hit = sizeCache.get(preview.src)
        if (hit && hit.width === img.naturalWidth && hit.height === img.naturalHeight) return
        sizeCache.set(preview.src, { width: img.naturalWidth, height: img.naturalHeight })
        ctx.repaint()
      },
    }),
    win ? h('div', {
      class: 'pd-crop-win',
      style: { left: pct(win.leftPct), top: pct(win.topPct), width: pct(win.widthPct), height: pct(win.heightPct) },
    }) : '',
  ]))

  return h('div', { class: 'pd-crop-anchor' }, rows)
}
