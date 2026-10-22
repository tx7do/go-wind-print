// 字体下拉的数据源：模板级字体声明（宿主经 PrintDesigner 的 fonts prop 传入），
// 再拼上 core 的静态系统字体候选（免字体文件、本机已装）。
// 声明随模板保存、由各端按 @font-face 加载；系统候选只做「零配置便捷档」，
// 三端装了什么字体各不相同（服务端容器内中文只有 Noto CJK），跨端字面不保证一致。
import { computed, inject, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { withSystemFontOptions, type PrintFontDeclaration } from '@worm-vue3-print/core'
import { FONT_CATALOG_KEY } from './useHostAdapter'

/** 下拉候选项：family 写入模板，label 仅用于界面展示 */
export interface FontOption {
  family: string
  label?: string
}

/** 空目录：宿主未声明字体时仍给出系统字体候选 */
export const EMPTY_FONT_CATALOG: ComputedRef<readonly FontOption[]> = computed(() => withSystemFontOptions())

/**
 * 由 PrintDesigner 调用：把模板字体声明整理为下拉候选项，并追加系统字体候选。
 * 去空白、丢空值、族名大小写不敏感去重，保留声明顺序（顺序即宿主期望的优先级）。
 */
export function useFontCatalog(
  declarations?: MaybeRefOrGetter<readonly PrintFontDeclaration[] | undefined>,
): { catalog: ComputedRef<readonly FontOption[]> } {
  const catalog = computed<readonly FontOption[]>(() => {
    const out: FontOption[] = []
    const seen = new Set<string>()
    for (const font of toValue(declarations) ?? []) {
      const family = font?.family?.trim()
      if (!family) continue
      const key = family.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const label = font.label?.trim()
      out.push(label ? { family, label } : { family })
    }
    // 宿主档在前、系统档在后；同族名以宿主声明为准（合并与去重在 core 单点）
    return withSystemFontOptions(out)
  })
  return { catalog }
}

/** 由深层组件调用（属性面板）：未注入时回退空目录，组件可独立挂载 */
export function useInjectedFontCatalog(): ComputedRef<readonly FontOption[]> {
  return inject(FONT_CATALOG_KEY, EMPTY_FONT_CATALOG)
}

/** 在目录中按族名查找（大小写不敏感） */
export function findFontOption(
  fonts: readonly FontOption[],
  family?: string,
): FontOption | undefined {
  const key = family?.trim().toLowerCase()
  if (!key) return undefined
  return fonts.find(f => f.family.trim().toLowerCase() === key)
}

/** 下拉选项文案：有展示名时补上真实族名（写入模板的值） */
export function fontOptionLabel(option: FontOption): string {
  return option.label ? `${option.label}（${option.family}）` : option.family
}

/** 匹配用键：小写并去掉全部空白，使用户输入 `ya hei` 与 `yahei` 等价 */
export function normalizeFontQuery(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

/**
 * 匹配档位，越小越靠前：
 * 0 完全相等 · 1 前缀 · 2 子串 · 3 子序列（首字母缩写式） · -1 不匹配
 */
function matchRank(nameKey: string, queryKey: string): number {
  if (nameKey === queryKey) return 0
  if (nameKey.startsWith(queryKey)) return 1
  if (nameKey.includes(queryKey)) return 2
  let cursor = 0
  for (const char of nameKey) {
    if (char === queryKey[cursor]) cursor++
    if (cursor === queryKey.length) return 3
  }
  return -1
}

/**
 * 模糊过滤字体目录：完全相等 > 前缀 > 子串 > 子序列，同档保持目录原有顺序
 * （目录顺序由宿主声明决定，过滤不应打乱）。
 * 族名与展示名（label）都参与匹配，设计者按业务名搜也能命中。
 */
export function filterFontOptions(
  fonts: readonly FontOption[],
  query: string,
): FontOption[] {
  const queryKey = normalizeFontQuery(query.trim())
  if (!queryKey) return [...fonts]
  return fonts
    .map((font, index) => ({ font, index, rank: fontMatchRank(font, queryKey) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.font)
}

/** 族名与展示名取更优的一档；两者都不命中返回 -1 */
function fontMatchRank(font: FontOption, queryKey: string): number {
  const byFamily = matchRank(normalizeFontQuery(font.family), queryKey)
  if (!font.label) return byFamily
  const byLabel = matchRank(normalizeFontQuery(font.label), queryKey)
  if (byFamily < 0) return byLabel
  return byLabel < 0 ? byFamily : Math.min(byFamily, byLabel)
}
