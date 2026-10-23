// packages/print-canvas/src/__tests__/useFontCatalog.spec.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import type { PrintFontDeclaration } from '@worm-vue3-print/core'
import { filterFontOptions, useFontCatalog, type FontOption } from '../composables/useFontCatalog'

const decl = (family: string, label?: string): PrintFontDeclaration => ({
  family,
  label,
  files: [{ url: `/fonts/${family}.woff2` }],
})

describe('useFontCatalog', () => {
  it('未声明字体时目录为空：设计器不陈列任何字体名', () => {
    const { catalog } = useFontCatalog(ref(undefined))
    expect(catalog.value).toEqual([])
  })

  it('目录只含宿主声明，顺序与展示名按声明保留', () => {
    const { catalog } = useFontCatalog(ref([decl('Ma Shan Zheng', '马善政毛笔楷书'), decl('Brand Sans')]))
    expect(catalog.value).toEqual([
      { family: 'Ma Shan Zheng', label: '马善政毛笔楷书' },
      { family: 'Brand Sans' },
    ])
  })

  it('去空白、丢空族名、族名大小写不敏感去重并保留首现 label', () => {
    const { catalog } = useFontCatalog(ref([
      decl('  Brand Sans  ', '品牌体'),
      decl(''),
      decl('brand sans'),
      decl('  ', '空族名'),
    ]))
    expect(catalog.value).toEqual([{ family: 'Brand Sans', label: '品牌体' }])
  })

  it('声明响应式变化后目录同步更新', () => {
    const declarations = ref<readonly PrintFontDeclaration[]>([decl('Brand Sans')])
    const { catalog } = useFontCatalog(declarations)
    declarations.value = [decl('Brand Serif', '品牌衬线体')]
    expect(catalog.value).toEqual([{ family: 'Brand Serif', label: '品牌衬线体' }])
  })
})

describe('filterFontOptions', () => {
  const fonts: FontOption[] = [
    { family: 'Microsoft YaHei' },
    { family: 'MS SimHei' },
    { family: 'SimSun' },
    { family: 'KaiTi' },
  ]

  it('查询为空时原样返回（保持声明顺序）', () => {
    expect(filterFontOptions(fonts, '')).toEqual(fonts)
    expect(filterFontOptions(fonts, '   ')).toEqual(fonts)
  })

  it('子串匹配，大小写与空格不敏感', () => {
    expect(filterFontOptions(fonts, 'yahei').map(f => f.family)).toEqual(['Microsoft YaHei'])
    expect(filterFontOptions(fonts, '  MICROSOFT   YAHEI ').map(f => f.family)).toEqual(['Microsoft YaHei'])
  })

  it('子序列匹配（首字母缩写）', () => {
    expect(filterFontOptions(fonts, 'msyh').map(f => f.family)).toEqual(['Microsoft YaHei'])
    expect(filterFontOptions(fonts, 'kt').map(f => f.family)).toEqual(['KaiTi'])
  })

  it('排序为 完全相等 > 前缀 > 子串 > 子序列，同档保持原顺序', () => {
    expect(filterFontOptions(fonts, 'sim').map(f => f.family)).toEqual([
      'SimSun',
      'MS SimHei',
    ])
    expect(filterFontOptions(fonts, 'SimSun').map(f => f.family)).toEqual(['SimSun'])
  })

  it('展示名（label）也参与匹配', () => {
    const withLabel: FontOption[] = [{ family: 'Ma Shan Zheng', label: '马善政毛笔楷书' }]
    expect(filterFontOptions(withLabel, '毛笔')).toEqual(withLabel)
  })

  it('无匹配时返回空数组', () => {
    expect(filterFontOptions(fonts, 'zzz')).toEqual([])
  })
})
