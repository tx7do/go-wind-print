// 字体下拉的数据源：模板级字体声明（宿主经 PrintDesigner 的 fonts prop 传入）。
// 声明随模板保存、由各端按 @font-face 加载，字体文件的授权由宿主自负。
// 设计器不内置任何字体名档位：替用户预置或陈列第三方授权字体会把版权风险带进设计器与产出物。
// 目录整理与模糊匹配算法已下沉 core（print/fonts.ts），无框架外壳与本包共用同一份；本文件只留 Vue 侧包装。
import { computed, inject, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import { normalizeFontCatalog, type PrintFontDeclaration } from '@go-wind/print-core'
import { FONT_CATALOG_KEY } from './useHostAdapter'

export {
  filterFontOptions,
  findFontOption,
  fontOptionLabel,
  normalizeFontQuery,
} from '@go-wind/print-core'
export type { FontCatalogOption as FontOption } from '@go-wind/print-core'
import type { FontCatalogOption } from '@go-wind/print-core'

/** 空目录：宿主未声明字体时不陈列任何字体名，下拉只剩「默认」与手工输入 */
export const EMPTY_FONT_CATALOG: ComputedRef<readonly FontCatalogOption[]> = computed(() => normalizeFontCatalog())

/**
 * 由 PrintDesigner 调用：把模板字体声明整理为下拉候选项。
 * 去空白、丢空值、族名大小写不敏感去重，保留声明顺序（顺序即宿主期望的优先级），整理规则在 core 单点。
 */
export function useFontCatalog(
  declarations?: MaybeRefOrGetter<readonly PrintFontDeclaration[] | undefined>,
): { catalog: ComputedRef<readonly FontCatalogOption[]> } {
  const catalog = computed<readonly FontCatalogOption[]>(() => normalizeFontCatalog(toValue(declarations)))
  return { catalog }
}

/** 由深层组件调用（属性面板）：未注入时回退空目录，组件可独立挂载 */
export function useInjectedFontCatalog(): ComputedRef<readonly FontCatalogOption[]> {
  return inject(FONT_CATALOG_KEY, EMPTY_FONT_CATALOG)
}
