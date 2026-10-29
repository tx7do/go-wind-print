// print-canvas/src/__tests__/PropertyResetPageBackground.spec.ts
// 页面背景色的「恢复默认值」点亮判据：出厂值是「未设置」，所以未设色时必须呈灰态。
// 此前把带 `|| '#ffffff'` 兜底的取色器模型当 target，未设色也恒点亮且点击空操作，
// 现与 print-common 外壳（shell/property-panel.ts 的 resetButton）同判据：比的是原始值。
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PropertyPanel from '../components/PropertyPanel.vue'
import type { TemplateData } from '@go-wind/print-core/designer'

function pageTemplate(over: Partial<TemplateData> = {}): TemplateData {
  return {
    paperSize: 'A4',
    orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] },
    footer: { height: 0, elements: [] },
    elements: [],
    ...over,
  } as TemplateData
}

function mountPanel(over: Partial<TemplateData> = {}) {
  return mount(PropertyPanel, {
    props: {
      element: null,
      templateData: pageTemplate(over),
      fields: [],
      activeTab: 'page',
      collapsed: false,
    },
  })
}

const resetBtn = (wrapper: ReturnType<typeof mountPanel>) =>
  wrapper.findAll('.pd-field')
    .find(f => f.find('.pd-label').exists() && f.find('.pd-label').text().includes('页面背景色'))!
    .find('.pd-reset-btn')

describe('页面背景色的「恢复默认值」', () => {
  it('未设置背景色时呈灰态（反面对照：取色器兜底的 #ffffff 不参与判据）', () => {
    const btn = resetBtn(mountPanel())
    expect(btn.exists()).toBe(true)
    expect(btn.classes()).not.toContain('is-dirty')
  })

  it('设过背景色才点亮，点击写回「未设」即删键', async () => {
    const wrapper = mountPanel({ pageBackground: '#ff0000' })
    const btn = resetBtn(wrapper)
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    const payload = wrapper.emitted('update:templateData')?.at(-1)?.[0] as TemplateData
    expect('pageBackground' in payload).toBe(true)
    expect(payload.pageBackground).toBeUndefined()
  })
})
