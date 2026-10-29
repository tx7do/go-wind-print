// print-canvas/src/__tests__/LayerPanelIcon.spec.ts
// 图层行的类型图标全覆盖：新增元素类型必须登记，否则落到 `?` 兜底（flowList 就漏过一次）。
// 同一张表在 print-common 的 shell/__tests__/flow-list.spec.ts 里按相同字面量断言，任一侧改动即红。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LayerPanel from '../components/LayerPanel.vue'
import type { ElementType, RuntimeElement } from '@go-wind/print-core/designer'

/** 与 common 侧 LAYER_ICON 同源的字面量表 */
const EXPECTED: Record<string, string> = {
  text: 'T', longText: '¶', table: '⊞', flowList: '⊟', image: '🖼', barcode: '≡', qrcode: '▣',
  hline: '—', vline: '|', rect: '□', oval: '○', html: '<>',
}

function mkEl(type: ElementType): RuntimeElement {
  return {
    id: `el-${type}`,
    options: { left: 0, top: 0, width: 10, height: 10, title: type },
    printElementType: { type, title: type },
  } as unknown as RuntimeElement
}

describe('图层面板类型图标', () => {
  it('12 类元素各有图标，flowList 是 ⊟ 而不是 ? 兜底', () => {
    const w = mount(LayerPanel, {
      props: { elements: Object.keys(EXPECTED).map(t => mkEl(t as ElementType)), selectedIds: new Set<string>() },
    })
    const icons = w.findAll('.layer-icon').map(n => n.text())
    expect(icons).toEqual(Object.values(EXPECTED))
    expect(icons).not.toContain('?')
  })
})
