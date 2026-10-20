import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import TableCellGroup from '../components/property/TableCellGroup.vue'
import { TABLE_EDIT_KEY } from '../composables/useTableSelection'
import type { RuntimeElement, TableCell } from '@worm-vue3-print/core/designer'

function makeElement(cell: Partial<TableCell>): RuntimeElement {
  return reactive({
    id: 'el-table',
    options: {
      tableColWidths: [50],
      tableRows: [{
        id: 'r1',
        type: 'data',
        height: 10,
        cells: [{ id: 'c1', ...cell }],
      }],
    },
    printElementType: { type: 'table', title: '表格' },
  }) as unknown as RuntimeElement
}

function mountGroup(element: RuntimeElement) {
  return mount(TableCellGroup, {
    props: {
      element,
      selection: { elementId: 'el-table', r1: 0, c1: 0, r2: 0, c2: 0 },
      fields: [],
    },
    global: {
      provide: {
        [TABLE_EDIT_KEY as symbol]: { tableSelection: { value: null }, setTableSelection: () => {}, recordHistory: () => {} },
      },
    },
  })
}

/** 单元格分组内的下拉顺序：单元格类型（radio，非 select）→ 码制 → 打印机分辨率 → 边框样式 */
function selects(w: ReturnType<typeof mountGroup>) {
  return w.findAll('select')
}

describe('TableCellGroup 二维码单元格静区', () => {
  const quietField = (w: ReturnType<typeof mountGroup>) =>
    w.findAll('.pd-field').find(f => f.find('.pd-label').text() === '静区 (模块)')
  const cellOf = (el: RuntimeElement) => (el.options.tableRows as any[])[0].cells[0] as TableCell

  it('二维码单元格出「静区 (模块)」，条形码与文本单元格不出', () => {
    expect(quietField(mountGroup(makeElement({ cellType: 'qrcode' })))).toBeTruthy()
    expect(quietField(mountGroup(makeElement({ cellType: 'barcode' })))).toBeUndefined()
    expect(quietField(mountGroup(makeElement({ formatter: '文本' })))).toBeUndefined()
  })

  it('填 0 写进单元格（0 就是「无白边、码面铺满」，被假值判断归成未设置这档就没了）', async () => {
    const element = makeElement({ cellType: 'qrcode' })
    const input = quietField(mountGroup(element))!.find('input[type="number"]')
    await input.setValue('0')
    await input.trigger('change')
    expect(cellOf(element).qrQuietZone).toBe(0)
  })

  it('说明挂在标签后的帮助图标上（悬浮/点击显示），不常驻文字提示', () => {
    const field = quietField(mountGroup(makeElement({ cellType: 'qrcode' })))!
    const help = field.find('.pd-help')
    expect(help.exists(), '静区标签后应有帮助图标').toBe(true)
    expect(help.attributes('data-tip')).toContain('0 即不留白边')
    expect(field.find('.pd-hint').exists(), '说明不应常驻成一行文字').toBe(false)
  })

  it('缺省显示 2（与渲染器缺省档一致），单元格类型切走时清除该字段', async () => {
    const element = makeElement({ cellType: 'qrcode', qrQuietZone: 4 })
    const w = mountGroup(element)
    expect(quietField(w)!.find('input[type="number"]').element.value).toBe('4')

    await w.find('input[type="radio"][value="text"]').setValue()
    expect(cellOf(element).qrQuietZone).toBeUndefined()
  })
})

describe('TableCellGroup 条形码单元格打印机分辨率', () => {
  it('条形码单元格显示「打印机分辨率」，缺省为不对齐', () => {
    const w = mountGroup(makeElement({ cellType: 'barcode' }))
    expect(w.text()).toContain('打印机分辨率')
    const dpi = selects(w)[1]!
    expect((dpi.element as HTMLSelectElement).value).toBe('')
  })

  it('选中 dpi 写入 cell.printerDpi，选回「不对齐」清除字段', async () => {
    const element = makeElement({ cellType: 'barcode' })
    const w = mountGroup(element)
    const dpi = selects(w)[1]!
    await dpi.setValue('203')
    expect(element.options.tableRows![0]!.cells[0]!.printerDpi).toBe(203)

    await dpi.setValue('')
    expect(element.options.tableRows![0]!.cells[0]!.printerDpi).toBeUndefined()
  })

  it('条形码单元格不提供缩放模式，最大宽高作为结算上限始终可用', () => {
    const manual = mountGroup(makeElement({ cellType: 'barcode' }))
    const aligned = mountGroup(makeElement({ cellType: 'barcode', printerDpi: 203 }))
    // 下拉：码制 / 打印机分辨率 / 边框样式 → 与是否设置 dpi 无关（条形码无缩放模式）
    expect(selects(manual)).toHaveLength(3)
    expect(selects(aligned)).toHaveLength(3)
    // 最大宽度/最大高度并入可用框参与结算，两种模式下都保留
    expect(manual.text()).toContain('最大宽度')
    expect(aligned.text()).toContain('最大宽度')
    expect(aligned.text()).toContain('可用「最大宽高」限制上限')
  })

  it('非条形码单元格没有打印机分辨率（二维码模块数固定，图片无关）', () => {
    expect(mountGroup(makeElement({ cellType: 'qrcode' })).text()).not.toContain('打印机分辨率')
    expect(mountGroup(makeElement({ cellType: 'image' })).text()).not.toContain('打印机分辨率')
  })

  it('单元格类型切离条形码时清除 printerDpi', async () => {
    const element = makeElement({ cellType: 'barcode', printerDpi: 203 })
    const w = mountGroup(element)
    const radios = w.findAll('input[type="radio"]')
    await radios[2]!.setValue() // 二维码
    const cell = element.options.tableRows![0]!.cells[0]!
    expect(cell.cellType).toBe('qrcode')
    expect(cell.printerDpi).toBeUndefined()
  })
})

describe('单元格图片裁剪锚点（仅剪裁档）', () => {
  const anchorRow = (w: ReturnType<typeof mountGroup>) =>
    w.findAll('.pd-field').find(f => (f.find('.pd-label').text() || '').includes('裁剪锚点'))
  const cellOf = (el: RuntimeElement) => (el.options.tableRows![0] as any).cells[0] as TableCell

  it('未选剪裁时锚点行整个不出现', () => {
    const w = mountGroup(makeElement({ cellType: 'image', formatter: 'data:image/gif;base64,R0lGOD' }))
    expect(anchorRow(w)).toBeUndefined()
  })

  it('缩放模式里 cover 叫「剪裁」，旧文案不再出现', () => {
    const w = mountGroup(makeElement({ cellType: 'image' }))
    const fit = w.findAll('select').find(s => s.text().includes('剪裁（等比铺满后裁边）'))!
    expect(fit).toBeTruthy()
    expect(w.text()).not.toContain('覆盖（保持比例）')
  })

  it('选了剪裁才出锚点控件，选档写回 50% 0%', async () => {
    const el = makeElement({ cellType: 'image', formatter: 'data:image/gif;base64,R0lGOD', fit: 'cover' })
    const w = mountGroup(el)
    expect(anchorRow(w)).toBeTruthy()
    await w.find('[data-field="ap-img-object-position"] select').setValue('50,0')
    expect(cellOf(el).objectPosition).toBe('50% 0%')
  })

  it('回到居中即撤掉该属性，而不是留个空串', async () => {
    const el = makeElement({ cellType: 'image', fit: 'cover', objectPosition: '50% 0%' })
    const w = mountGroup(el)
    await w.find('[data-field="ap-img-object-position"] select').setValue('50,50')
    expect(cellOf(el).objectPosition).toBeUndefined()
  })

  it('二维码与文本单元格都不出锚点行（只有图片会裁）', () => {
    expect(anchorRow(mountGroup(makeElement({ cellType: 'qrcode', fit: 'cover' })))).toBeUndefined()
    expect(anchorRow(mountGroup(makeElement({ content: '文本' })))).toBeUndefined()
  })
})

describe('单元格水平对齐第 4 档（两端）', () => {
  function alignField(w: ReturnType<typeof mountGroup>) {
    return w.findAll('.pd-field').find(f => (f.find('.pd-label').text() || '').includes('水平对齐'))!
  }

  it('档位为 左/中/右/两端，值依次 left/center/right/justify', () => {
    const field = alignField(mountGroup(makeElement({ formatter: '名称' })))
    expect(field.findAll('input[type="radio"]').map(i => (i.element as HTMLInputElement).value))
      .toEqual(['left', 'center', 'right', 'justify'])
    expect(field.findAll('label span').map(s => s.text())).toEqual(['左', '中', '右', '两端'])
  })

  it('选「两端」把 justify 写进被选单元格', async () => {
    const el = makeElement({ formatter: '名称' })
    const w = mountGroup(el)
    await alignField(w).findAll('input[type="radio"]')[3].setValue('justify')
    expect((el.options.tableRows![0] as any).cells[0].align).toBe('justify')
  })

  it('已设为 justify 时第 4 档呈选中态（工具栏写入的值在面板可见）', () => {
    const field = alignField(mountGroup(makeElement({ formatter: '名称', align: 'justify' })))
    const checked = field.findAll('input[type="radio"]').filter(i => (i.element as HTMLInputElement).checked)
    expect(checked.map(i => (i.element as HTMLInputElement).value)).toEqual(['justify'])
  })
})
