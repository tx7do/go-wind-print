import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ResetButton from '../components/property/ResetButton.vue'

function setup(target: Record<string, any>, base: Record<string, any>, extra: Record<string, unknown> = {}) {
  const t = reactive(target)
  const w = mount(ResetButton, { props: { target: t, base, propKey: 'k', ...extra } })
  return { t, w }
}

describe('ResetButton 派生规则', () => {
  it('出厂未设（base.k === undefined）且当前未设 ⇒ 灰态，点击不写回、不发 change', async () => {
    const { t, w } = setup({}, {})
    expect(w.classes()).not.toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
    expect(w.emitted('change')).toBeUndefined()
  })

  it('当前值 !== 出厂值 ⇒ 亮态，点击写回出厂值并 emit change', async () => {
    const { t, w } = setup({ k: 18 }, { k: 12 })
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBe(12)
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('出厂未设、当前设了值 ⇒ 亮态，点击写回 undefined（即删键回落）', async () => {
    const { t, w } = setup({ k: 2.5 }, {})
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
  })

  it('0 与 undefined 是两个状态：出厂 undefined、当前 0 ⇒ 亮态', async () => {
    const { t, w } = setup({ k: 0 }, {})
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
  })

  it('当前值恰等于出厂值 ⇒ 灰态（键留在模板里不消失，语义上已是默认）', () => {
    const { w } = setup({ k: 12 }, { k: 12 })
    expect(w.classes()).not.toContain('is-dirty')
  })

  it('提示语：有 tipValue 带数字与单位，没有则只写「恢复默认值」', () => {
    expect(setup({}, {}, { tipValue: 10, tipUnit: '模块' }).w.attributes('data-tip')).toBe('恢复默认值（10 模块）')
    expect(setup({}, {}).w.attributes('data-tip')).toBe('恢复默认值')
    expect(setup({}, {}, { tipOverride: '恢复默认值（跟随表格默认）' }).w.attributes('data-tip')).toBe('恢复默认值（跟随表格默认）')
  })

  it('给了 write 时走 write 而不是直接改 target（单元格整选区用）', async () => {
    const seen: any[] = []
    const { t, w } = setup({ k: 5 }, { k: 7 }, { write: (v: any) => seen.push(v) })
    await w.trigger('click')
    expect(seen).toEqual([7])
    expect(t.k).toBe(5)
  })

  it('禁止文本子节点：textContent 为空，标签文本匹配不被污染', () => {
    const { w } = setup({ k: 1 }, {})
    expect(w.text()).toBe('')
    expect(w.find('svg').exists()).toBe(true)
  })
})
