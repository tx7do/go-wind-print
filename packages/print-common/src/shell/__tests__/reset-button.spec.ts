// @vitest-environment happy-dom
// common 侧「恢复默认值」原语验收：与 canvas 的 property/ResetButton.spec.ts 同一组判据。
// 本文件只测 controls.ts 的构造器，不依赖 property-panel.ts 的行级接入。
//
// 图标可见性不在这里断言：icons.ts 是 gen-icons.mjs 从 canvas 的 import 派生的产物，
// 派生步骤要求 canvas 先构建，属 Task 7 Step 3 的闸门（派生后由 class-audit 与浏览器
// 实看确认，因为 iconSvg 未命中时静默返回空串，按钮会空白而不报错）。
import { describe, it, expect } from 'vitest'
import { resetButton, field, fieldHelp } from '../controls'
import { render } from '../../core/h'

function mount(node: unknown): HTMLElement {
  const host = document.createElement('div')
  render(node, host)
  return host
}

function btn(host: HTMLElement) {
  return host.querySelector<HTMLButtonElement>('.pd-reset-btn')!
}

describe('resetButton 派生规则', () => {
  it('出厂未设且当前未设 ⇒ 无 is-dirty，点击不写回、不触发 onReset', () => {
    const target: Record<string, any> = {}
    let called = 0
    const host = mount(resetButton({ target, base: {}, propKey: 'k', onReset: () => { called++ } }))
    const b = btn(host)
    expect(b.classList.contains('is-dirty')).toBe(false)
    b.click()
    expect(target.k).toBeUndefined()
    expect(called).toBe(0)
  })

  it('当前值 !== 出厂值 ⇒ is-dirty，点击写回出厂值并触发 onReset', () => {
    const target: Record<string, any> = { k: 18 }
    let called = 0
    const host = mount(resetButton({ target, base: { k: 12 }, propKey: 'k', onReset: () => { called++ } }))
    const b = btn(host)
    expect(b.classList.contains('is-dirty')).toBe(true)
    b.click()
    expect(target.k).toBe(12)
    expect(called).toBe(1)
  })

  it('出厂未设、当前设了值 ⇒ 点击写回 undefined（删键回落）', () => {
    const target: Record<string, any> = { k: 2.5 }
    const host = mount(resetButton({ target, base: {}, propKey: 'k' }))
    btn(host).click()
    expect(target.k).toBeUndefined()
  })

  it('0 与 undefined 是两个状态：出厂 undefined、当前 0 ⇒ 亮态且可恢复', () => {
    const target: Record<string, any> = { k: 0 }
    const host = mount(resetButton({ target, base: {}, propKey: 'k' }))
    expect(btn(host).classList.contains('is-dirty')).toBe(true)
    btn(host).click()
    expect(target.k).toBeUndefined()
  })

  it('提示语三档：带单位数字／无数字／整条覆盖', () => {
    expect(btn(mount(resetButton({ target: {}, base: {}, propKey: 'k', tipValue: 10, tipUnit: '模块' }))).dataset.tip)
      .toBe('恢复默认值（10 模块）')
    expect(btn(mount(resetButton({ target: {}, base: {}, propKey: 'k' }))).dataset.tip).toBe('恢复默认值')
    expect(btn(mount(resetButton({ target: {}, base: {}, propKey: 'k', tipOverride: '恢复默认值（跟随表格默认）' }))).dataset.tip)
      .toBe('恢复默认值（跟随表格默认）')
  })

  it('按钮不得有任何文本子节点（属性搜索按 textContent 匹配标签）', () => {
    expect(btn(mount(resetButton({ target: { k: 1 }, base: {}, propKey: 'k' }))).textContent).toBe('')
  })
})

describe('field / fieldHelp 的标签行结构', () => {
  it('标签文字包进 .pd-label-t，textContent 与改造前完全一致', () => {
    const host = mount(field('字体大小', 'x'))
    expect(host.querySelector('.pd-label')!.textContent).toBe('字体大小')
    expect(host.querySelector('.pd-label-t')!.textContent).toBe('字体大小')
  })

  it('第 4 参传入 reset 时挂在 .pd-label 右端，且不混进标签文字', () => {
    const host = mount(field('行高', 'x', undefined, resetButton({ target: { k: 1 }, base: {}, propKey: 'k' })))
    expect(host.querySelectorAll('.pd-label > .pd-reset-btn').length).toBe(1)
    expect(host.querySelector('.pd-label')!.textContent).toBe('行高')
  })

  it('fieldHelp 的 ? 说明留在 .pd-label-t 内，reset 在其后', () => {
    const host = mount(fieldHelp('静区 (模块)', 'x', '说明', resetButton({ target: {}, base: {}, propKey: 'k' })))
    expect(host.querySelector('.pd-label-t')!.textContent).toBe('静区 (模块)')
    expect(host.querySelector('.pd-label-t .pd-help')!.getAttribute('aria-label')).toBe('字段说明')
    expect(host.querySelectorAll('.pd-label > .pd-reset-btn').length).toBe(1)
  })
})
