import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CellImage from '../components/elements/CellImage.vue'

/** 逐条比对内联声明，否则 'max-width: 100%' 会让 'width: 100%' 的断言假绿 */
function decls(style?: string): string[] {
  return (style ?? '').split(';').map(s => s.trim()).filter(Boolean)
}

describe('CellImage', () => {
  it('renders placeholder when no value', () => {
    const wrapper = mount(CellImage, {
      props: { value: '' }
    })
    expect(wrapper.find('.image-placeholder').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders image when value is provided', () => {
    const wrapper = mount(CellImage, {
      props: { value: '/test-image.png' }
    })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe('/test-image.png')
  })

  it('applies fit style', () => {
    const wrapper = mount(CellImage, {
      props: { value: '/test-image.png', fit: 'cover' }
    })
    expect(wrapper.find('img').attributes('style')).toContain('object-fit: cover')
  })

  it('applies max width and height', () => {
    const wrapper = mount(CellImage, {
      props: { value: '/test-image.png', maxWidth: 50, maxHeight: 30 }
    })
    expect(wrapper.find('img').attributes('style')).toContain('max-width: 50mm')
    expect(wrapper.find('img').attributes('style')).toContain('max-height: 30mm')
  })

  it('剪裁档钉盒：外框钉在可用框高、img 撑满，锚点在单元格里才裁得动（与独立元素同构）', () => {
    const wrapper = mount(CellImage, {
      props: { value: '/test-image.png', fit: 'cover', objectPosition: '50% 0%', boxHeightMm: 6 }
    })
    expect(decls(wrapper.find('.cell-image').attributes('style'))).toContain('height: 6mm')
    const d = decls(wrapper.find('img').attributes('style'))
    expect(d).toContain('width: 100%')
    expect(d).toContain('height: 100%')
    expect(d).toContain('object-position: 50% 0%')
  })

  it('剪裁放大：画面按锚点推大，超出钉盒的部分由 .cell-image 的 overflow 裁掉', () => {
    const wrapper = mount(CellImage, {
      props: { value: '/test-image.png', fit: 'cover', objectPosition: '50% 100%', fitScale: 150, boxHeightMm: 6 }
    })
    const d = decls(wrapper.find('img').attributes('style'))
    expect(d).toContain('transform: scale(1.5)')
    expect(d).toContain('transform-origin: 50% 100%')
  })

  it('放大只给剪裁档：contain 塞了比例也不出 transform（与出纸同一门禁）', () => {
    const wrapper = mount(CellImage, { props: { value: '/test-image.png', fit: 'contain', fitScale: 150 } })
    expect(decls(wrapper.find('img').attributes('style')).some(s => s.startsWith('transform'))).toBe(false)
  })

  it('门控只在剪裁档：不给可用框高时逐字保持现状（td 高度仍由内容决定）', () => {
    for (const fit of [undefined, 'contain', 'fill']) {
      const wrapper = mount(CellImage, { props: { value: '/test-image.png', fit, boxHeightMm: undefined } })
      expect(wrapper.find('.cell-image').attributes('style') ?? '').toBe('')
      const d = decls(wrapper.find('img').attributes('style'))
      expect(d).not.toContain('width: 100%')
      expect(d).not.toContain('height: 100%')
    }
  })
})