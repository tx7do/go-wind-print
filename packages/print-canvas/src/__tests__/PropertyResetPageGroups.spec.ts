import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WatermarkConfig from '../components/WatermarkConfig.vue'
import TilingConfig from '../components/property/TilingConfig.vue'
import { WATERMARK_DEFAULTS, TILE_DEFAULTS } from '@worm-vue3-print/core'

function rowOf(w: any, text: string) {
  const row = w.findAll('.pd-field').find((f: any) => f.find('.pd-label').exists() && f.find('.pd-label').text().includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

describe('水印「恢复默认值」', () => {
  function mountWm(overrides: Record<string, any> = {}) {
    return mount(WatermarkConfig, {
      props: {
        modelValue: { mode: 'fixed', content: '样张', ...overrides },
        fields: [],
      },
    })
  }

  it('出厂态（未显式设置）四项全灰', () => {
    const w = mountWm()
    for (const t of ['旋转角度', '颜色', '透明度']) {
      expect(rowOf(w, t).find('.pd-reset-btn').classes()).not.toContain('is-dirty')
    }
  })

  it('改过之后亮态，点击写回 WATERMARK_DEFAULTS 并落一次变更', async () => {
    const w = mountWm({ rotate: 0, color: '#ff0000', opacity: 0.5 })
    const btn = rowOf(w, '旋转角度').find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(w.emitted('update:modelValue')?.length).toBeGreaterThan(0)
    expect(rowOf(w, '旋转角度').find('.pd-reset-btn').classes()).not.toContain('is-dirty')
  })

  it('颜色恢复到的正是 WATERMARK_DEFAULTS.color', async () => {
    const w = mountWm({ color: '#ff0000' })
    await rowOf(w, '颜色').find('.pd-reset-btn').trigger('click')
    const payload = w.emitted('update:modelValue')?.at(-1)?.[0] as any
    expect(payload.color).toBe(WATERMARK_DEFAULTS.color)
  })

  it('水印表达式与测试值是内容不是样式默认，两行不挂图标', () => {
    expect(rowOf(mountWm(), '水印表达式').find('.pd-reset-btn').exists()).toBe(false)
    // 「测试值」只在表达式（binding）模式下渲染，用 fixed 模式查会误判成"找不到行"
    const binding = mount(WatermarkConfig, {
      props: { modelValue: { mode: 'binding', binding: '{order.no}' } as any, fields: [] },
    })
    expect(rowOf(binding, '测试值').find('.pd-reset-btn').exists()).toBe(false)
  })
})

describe('拼版「恢复默认值」', () => {
  const templateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] }, elements: [],
  } as any

  function mountTiling(tiling: Record<string, any>) {
    return mount(TilingConfig, { props: { modelValue: tiling as any, templateData } })
  }

  it('间距与留白挂图标，改过后点击回到 TILE_DEFAULTS', async () => {
    const w = mountTiling({ enabled: true, gapX: 6, sheetMargin: { top: 20, right: 10, bottom: 10, left: 10 } })
    const gap = rowOf(w, '横向间距').find('.pd-reset-btn')
    expect(gap.classes()).toContain('is-dirty')
    await gap.trigger('click')
    expect((w.emitted('update:modelValue')?.at(-1)?.[0] as any).gapX).toBe(TILE_DEFAULTS.gapX)

    await rowOf(w, '上').find('.pd-reset-btn').trigger('click')
    expect((w.emitted('update:modelValue')?.at(-1)?.[0] as any).sheetMargin.top).toBe(TILE_DEFAULTS.sheetMargin.top)
  })

  it('目标纸张与方向也挂图标', () => {
    const w = mountTiling({ enabled: true })
    expect(rowOf(w, '目标纸张').find('.pd-reset-btn').exists()).toBe(true)
    expect(rowOf(w, '目标纸方向').find('.pd-reset-btn').exists()).toBe(true)
  })

  /** 这两项的"默认"有两处口径：enabled 常量是 true 而组件把未配置读成 false；
   *  columns 在开启开关时按纸面收敛，不是恒等于 TILE_DEFAULTS.columns。本期按 spec 延后。 */
  it('启用拼版与列数不挂图标（两处口径不一致，本期延后）', () => {
    const w = mountTiling({ enabled: true })
    expect(rowOf(w, '列数').find('.pd-reset-btn').exists()).toBe(false)
    expect(w.find('.tiling-switch .pd-reset-btn').exists()).toBe(false)
  })

  it('自定义目标纸宽高是作者数据，不挂图标', () => {
    const w = mountTiling({ enabled: true, sheetPaperSize: 'CUSTOM' })
    expect(rowOf(w, '目标纸宽高').find('.pd-reset-btn').exists()).toBe(false)
  })
})
