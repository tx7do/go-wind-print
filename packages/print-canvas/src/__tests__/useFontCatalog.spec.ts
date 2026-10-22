// packages/print-canvas/src/__tests__/useFontCatalog.spec.ts
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { SYSTEM_FONT_OPTIONS, type PrintFontDeclaration } from '@worm-vue3-print/core'
import { filterFontOptions, useFontCatalog, type FontOption } from '../composables/useFontCatalog'

const decl = (family: string, label?: string): PrintFontDeclaration => ({
  family,
  label,
  files: [{ url: `/fonts/${family}.woff2` }],
})

/** 目录尾部应当恰好是「系统候选减去与宿主重名的那几条」，顺序保持系统清单原序 */
const systemTail = (host: readonly string[]): FontOption[] =>
  SYSTEM_FONT_OPTIONS
    .filter(f => !host.some(h => h.toLowerCase() === f.family.toLowerCase()))
    .map(f => ({ ...f }))

describe('useFontCatalog', () => {
  it('未声明字体时目录即系统字体候选（免字体文件，本机可用）', () => {
    const { catalog } = useFontCatalog(ref(undefined))
    expect(catalog.value).toEqual(SYSTEM_FONT_OPTIONS.map(f => ({ ...f })))
  })

  it('宿主声明在前、系统候选在后，顺序与展示名按声明保留', () => {
    const { catalog } = useFontCatalog(ref([decl('Ma Shan Zheng', '马善政毛笔楷书'), decl('FangSong')]))
    expect(catalog.value.slice(0, 2)).toEqual([
      { family: 'Ma Shan Zheng', label: '马善政毛笔楷书' },
      { family: 'FangSong' },
    ])
    expect(catalog.value.slice(2)).toEqual(systemTail(['Ma Shan Zheng', 'FangSong']))
  })

  it('去空白、丢空族名、族名大小写不敏感去重（同族名以宿主声明为准）', () => {
    const { catalog } = useFontCatalog(ref([
      decl('  SimSun  ', '报馆宋体'),
      decl(''),
      decl('simsun'),
      decl('  ', '空族名'),
    ]))
    expect(catalog.value[0]).toEqual({ family: 'SimSun', label: '报馆宋体' })
    expect(catalog.value.filter(f => f.family.toLowerCase() === 'simsun')).toHaveLength(1)
    expect(catalog.value.slice(1)).toEqual(systemTail(['SimSun']))
  })

  it('声明响应式变化后目录同步更新', () => {
    const declarations = ref<readonly PrintFontDeclaration[]>([decl('SimSun')])
    const { catalog } = useFontCatalog(declarations)
    declarations.value = [decl('KaiTi', '楷体')]
    expect(catalog.value[0]).toEqual({ family: 'KaiTi', label: '楷体' })
    expect(catalog.value.slice(1)).toEqual(systemTail(['KaiTi']))
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
