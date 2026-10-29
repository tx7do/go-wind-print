import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CodeGroup from '../components/property/CodeGroup.vue'
import { createDefaultOptions } from '@go-wind/print-core/designer'
import type { RuntimeElement } from '@go-wind/print-core/designer'

function setup(type: 'barcode' | 'qrcode', options: Record<string, any> = {}) {
  const element = reactive({
    id: 'el-1',
    options: { ...createDefaultOptions(type), ...options },
    printElementType: { type, title: type },
  }) as unknown as RuntimeElement
  return { element, w: mount(CodeGroup, { props: { element } }) }
}

function rowOf(w: any, text: string) {
  const row = w.findAll('.pd-field').find((f: any) => f.find('.pd-label').exists() && f.find('.pd-label').text().includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

describe('条码组「恢复默认值」', () => {
  it('静区：出厂未设⇒灰态；设 4 后亮态，点击写回 undefined 并通知变更', async () => {
    const { element, w } = setup('barcode', { barQuietZone: 4 })
    const btn = rowOf(w, '静区').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    expect(btn.attributes('data-tip')).toBe('恢复默认值（10 模块）')
    await btn.trigger('click')
    expect(element.options.barQuietZone).toBeUndefined()
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('条宽：控件把 2 显示成当前值，但出厂是未设——设成 2 仍判为已偏离', async () => {
    const { element, w } = setup('barcode', { barWidth: 2 })
    const btn = rowOf(w, '条宽').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    expect(btn.attributes('data-tip')).toBe('恢复默认值')
    await btn.trigger('click')
    expect(element.options.barWidth).toBeUndefined()
  })

  it('文本字号提示带数字，纠错级别不带（渲染端无具名常量）', () => {
    const { w } = setup('barcode', { fontSize: 20 })
    expect(rowOf(w, '文本字号').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值（10 模块）')
    const q = setup('qrcode', { qrCodeLevel: 'H' })
    expect(rowOf(q.w, '纠错级别').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值')
  })

  it('二维码静区缺省是 0，提示要写成「恢复默认值（0 模块）」而不是被当成未声明', () => {
    const { w } = setup('qrcode', { qrQuietZone: 4 })
    expect(rowOf(w, '静区').find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值（0 模块）')
  })

  it('码制与显示文本：码制不挂（决定元素是什么），显示文本挂且删键回到"显示"', async () => {
    const { element, w } = setup('barcode', { barcodeType: 'EAN13', hideTitle: true })
    expect(rowOf(w, '码制').find('.pd-reset-btn').exists()).toBe(false)
    const btn = rowOf(w, '显示文本').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.hideTitle).toBeUndefined()
  })

  it('缩放模式仅二维码出这一行，且挂图标', () => {
    expect(rowOf(setup('qrcode', { fit: 'cover' }).w, '缩放模式').find('.pd-reset-btn').exists()).toBe(true)
    const bw = setup('barcode').w
    expect(bw.findAll('.pd-field').some(f => f.find('.pd-label').text().includes('缩放模式'))).toBe(false)
  })

  it('11 行都挂上图标，标签文本不被污染', () => {
    const { w } = setup('barcode', { barWidth: 3 })
    const withIcon = w.findAll('.pd-field').filter(f => f.find('.pd-reset-btn').exists())
    expect(withIcon.length).toBeGreaterThanOrEqual(7)
    for (const l of w.findAll('.pd-label')) expect(l.text()).not.toContain('默认')
  })
})
