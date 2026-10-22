// packages/print-core/tests/fonts.test.ts
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PRINT_FONT_FAMILY, FALLBACK_FONT_STACK, SYSTEM_FONT_OPTIONS,
  buildFontFaceCss, resolveCanvasFontFamily, toFontFamilyStack, withSystemFontOptions,
} from '../src/print/fonts.js'

describe('buildFontFaceCss', () => {
  it('按声明生成 @font-face，含字重/字型与 font-display:block', () => {
    const css = buildFontFaceCss([
      {
        family: 'Noto Sans SC',
        files: [
          { url: '/fonts/noto-400.woff2', weight: 400 },
          { url: '/fonts/noto-700.woff2', weight: 700 },
          { url: '/fonts/noto-italic.woff2', style: 'italic' },
        ],
      },
    ])
    expect(css).toContain('@font-face{font-family:"Noto Sans SC";src:url("/fonts/noto-400.woff2") format("woff2");font-weight:400;font-style:normal;font-display:block;}')
    expect(css).toContain('font-weight:700')
    expect(css).toContain('font-style:italic')
    expect(css.match(/@font-face/g)).toHaveLength(3)
  })

  it('缺省字重按 400，绝对 URL 原样保留，format 提示按扩展名推断', () => {
    const css = buildFontFaceCss([
      {
        family: 'Demo',
        files: [
          { url: 'https://cdn.example.com/demo.ttf' },
          { url: 'https://cdn.example.com/demo.woff?x=1' },
          { url: 'https://cdn.example.com/no-ext' },
        ],
      },
    ])
    expect(css).toContain('font-weight:400')
    expect(css).toContain('url("https://cdn.example.com/demo.ttf") format("truetype")')
    expect(css).toContain('url("https://cdn.example.com/demo.woff?x=1") format("woff")')
    expect(css).toContain('url("https://cdn.example.com/no-ext");')
  })

  it('无声明、空族名或空 url 时产出空串（可安全拼接）', () => {
    expect(buildFontFaceCss(undefined)).toBe('')
    expect(buildFontFaceCss([])).toBe('')
    expect(buildFontFaceCss([{ family: '  ', files: [{ url: '/a.woff2' }] }])).toBe('')
    expect(buildFontFaceCss([{ family: 'A', files: [{ url: '' }] }])).toBe('')
  })
})

describe('toFontFamilyStack', () => {
  it('无字体时返回纯兜底栈', () => {
    expect(toFontFamilyStack()).toBe(FALLBACK_FONT_STACK.join(', '))
  })

  it('显式族名加引号并前置兜底栈', () => {
    expect(toFontFamilyStack('SimSun')).toBe(`"SimSun", ${FALLBACK_FONT_STACK.join(', ')}`)
  })

  it('已含逗号的完整栈原样前置，不被整体加引号', () => {
    expect(toFontFamilyStack('SimSun, serif')).toBe(`SimSun, serif, ${FALLBACK_FONT_STACK.join(', ')}`)
  })

  it('空字符串与纯空白等同于未设置', () => {
    expect(toFontFamilyStack('   ')).toBe(FALLBACK_FONT_STACK.join(', '))
  })
})

describe('resolveCanvasFontFamily', () => {
  it('设置族名时与出图端同口径带兜底栈（画布不能只写裸族名）', () => {
    expect(resolveCanvasFontFamily('SimHei')).toBe(toFontFamilyStack('SimHei'))
  })

  it('未设置时交还 CSS 继承', () => {
    expect(resolveCanvasFontFamily()).toBe('inherit')
    expect(resolveCanvasFontFamily('')).toBe('inherit')
  })
})

describe('DEFAULT_PRINT_FONT_FAMILY', () => {
  it('默认黑体在系统候选里有档，面板才显示得出中文名', () => {
    expect(SYSTEM_FONT_OPTIONS.some(f => f.family === DEFAULT_PRINT_FONT_FAMILY)).toBe(true)
  })

  it('默认族名参与兜底栈：本机没装黑体也不会开天窗', () => {
    expect(toFontFamilyStack(DEFAULT_PRINT_FONT_FAMILY)).toBe(
      `"${DEFAULT_PRINT_FONT_FAMILY}", ${FALLBACK_FONT_STACK.join(', ')}`,
    )
  })
})

describe('SYSTEM_FONT_OPTIONS', () => {
  it('每条都带展示名，且族名不带引号（写进模板后由 toFontFamilyStack 统一加引号）', () => {
    for (const font of SYSTEM_FONT_OPTIONS) {
      expect(font.label?.trim()).toBeTruthy()
      expect(font.family).not.toMatch(/["']/)
      expect(font.family.trim()).toBeTruthy()
    }
  })

  it('族名不重复，避免下拉出现两条同名档位', () => {
    const keys = SYSTEM_FONT_OPTIONS.map(f => f.family.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('withSystemFontOptions', () => {
  it('宿主声明在前、系统候选在后（宿主字体随模板分发，优先级更高）', () => {
    const out = withSystemFontOptions([{ family: 'Noto Sans SC', label: '思源黑体' }])
    expect(out[0]).toEqual({ family: 'Noto Sans SC', label: '思源黑体' })
    expect(out[out.length - 1]!.family).toBe(SYSTEM_FONT_OPTIONS[SYSTEM_FONT_OPTIONS.length - 1]!.family)
  })

  it('同族名去重并保留宿主 label，大小写不敏感', () => {
    const out = withSystemFontOptions([{ family: 'simhei', label: '公司黑体' }])
    const hit = out.filter(f => f.family.toLowerCase() === 'simhei')
    expect(hit).toHaveLength(1)
    expect(hit[0]!.label).toBe('公司黑体')
  })

  it('宿主为空或未注入时回退纯系统候选，空值与空白族名被丢弃', () => {
    expect(withSystemFontOptions()).toEqual(SYSTEM_FONT_OPTIONS.map(f => ({ ...f })))
    const out = withSystemFontOptions([null, undefined, { family: '  ' }, { family: 'SimSun' }])
    expect(out.filter(f => f.family === 'SimSun')).toHaveLength(1)
    expect(out.some(f => f.family === 'SimHei')).toBe(true)
  })
})
