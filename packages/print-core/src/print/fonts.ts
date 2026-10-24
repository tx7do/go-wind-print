// packages/print-core/src/print/fonts.ts
// 字体栈与模板字体声明的唯一真实来源：浏览器设计器、服务端 PDF 渲染、桌面客户端打印共用。
// 本模块为纯逻辑，不做任何 IO、不依赖 DOM。

/** 模板声明的字体文件：`url` 以 '/' 开头时按渲染端 baseUrl 解析，绝对 URL 原样使用 */
export interface PrintFontFile {
  url: string
  /** CSS 字重；缺省 400。必须与模板里元素实际使用的字重一致，否则 Chromium 会合成粗体（度量不同） */
  weight?: number
  /** CSS 字型；缺省 normal */
  style?: 'normal' | 'italic'
}

/**
 * 模板级字体声明：随模板保存，服务端/客户端/浏览器据此生成同一份 @font-face，
 * 从而不依赖各端系统里装了什么字体。
 */
export interface PrintFontDeclaration {
  /** CSS 族名，必须与元素 options.fontFamily 的写法一致 */
  family: string
  /** 设计器下拉里的显示名；缺省用 family */
  label?: string
  files: readonly PrintFontFile[]
}

/**
 * 生成模板声明字体的 @font-face CSS。
 *
 * - `font-display: block`：测量与出图期间绝不能用兜底字体顶上，否则分页按兜底度量算。
 * - 无声明或声明不合法（无族名/无可用 url）时返回空串，调用方可直接拼接。
 */
export function buildFontFaceCss(fonts?: readonly PrintFontDeclaration[]): string {
  const blocks: string[] = []
  for (const font of fonts ?? []) {
    const family = font?.family?.trim()
    if (!family) continue
    const quoted = `"${family.replace(/"/g, '')}"`
    for (const file of font.files ?? []) {
      const url = file?.url?.trim()
      if (!url) continue
      const weight = Number.isFinite(file.weight) ? Number(file.weight) : 400
      const style = file.style === 'italic' ? 'italic' : 'normal'
      blocks.push(
        `@font-face{font-family:${quoted};src:url("${url}")${fontFormatHint(url)};` +
        `font-weight:${weight};font-style:${style};font-display:block;}`,
      )
    }
  }
  return blocks.length ? `${blocks.join('')}\n` : ''
}

/** 按扩展名给出 format 提示；无法判断时不写（让浏览器自行嗅探，避免提示错误导致整条 src 被拒） */
function fontFormatHint(url: string): string {
  const path = url.split(/[?#]/)[0]!.toLowerCase()
  if (path.endsWith('.woff2')) return ' format("woff2")'
  if (path.endsWith('.woff')) return ' format("woff")'
  if (path.endsWith('.ttf')) return ' format("truetype")'
  if (path.endsWith('.otf')) return ' format("opentype")'
  return ''
}

/**
 * 全局兜底字体栈，逐字对齐原 css-builder 中 body 的 font-family 输出。
 * 元素是可直接拼接的合法 CSS 片段：需要引号的族名自带引号，
 * 通用族名（sans-serif）绝不能加引号——加了会被解析为字面字体名而失效。
 */
export const FALLBACK_FONT_STACK: readonly string[] = [
  '"Microsoft YaHei"',
  '"PingFang SC"',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
]

/**
 * 把 CSS 值转义为可安全放入双引号包裹的内联样式属性（style="..."）的形式。
 * 属性值中直接出现 `"` 会提前闭合属性，导致其后的声明整条丢失
 * （实测：`style="font-family:"SimSun", Arial"` 解析后 fontFamily 为空串）。
 */
export function escapeInlineStyleValue(cssValue: string): string {
  return cssValue.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

/**
 * 生成 CSS font-family 值：显式族名 + 全局兜底栈。
 * - 未设置/空白 → 纯兜底栈
 * - 值已含逗号 → 视为调用方给出的完整栈，原样前置（不整体加引号，否则整串会变成一个字体名）
 * - 其余 → 作为单个族名加引号后前置
 */
export function toFontFamilyStack(family?: string): string {
  const name = family?.trim()
  if (!name) return FALLBACK_FONT_STACK.join(', ')
  const head = name.includes(',') ? name : `"${name.replace(/"/g, '')}"`
  return [head, ...FALLBACK_FONT_STACK].join(', ')
}

/**
 * 设计器画布用的 font-family：与出图端同一口径补兜底栈。
 * 画布若只写裸族名，本机缺该字体时会退到 UA 默认字体，而出纸走的是兜底栈——两端看到不同的字。
 * 未设置族名时返回 `inherit`，保持「交还 CSS 继承」的既有语义。
 */
export function resolveCanvasFontFamily(family?: string): string {
  return family ? toFontFamilyStack(family) : 'inherit'
}

/** 字体下拉的候选项：`family` 写入模板，`label` 仅供界面展示 */
export interface FontCatalogOption {
  family: string
  label?: string
}

/**
 * 整理字体下拉候选：候选只来自宿主声明的模板字体（随模板分发、三端一致，字体文件授权由使用者自负）。
 * 项目不内置任何字体名档位——替用户预置或陈列第三方授权字体会把版权风险转嫁给设计器与产出物。
 * 去空白、丢空值，族名大小写不敏感去重，保留声明顺序与首次出现的 label。
 */
export function normalizeFontCatalog(
  host?: readonly (FontCatalogOption | null | undefined)[] | null,
): FontCatalogOption[] {
  const out: FontCatalogOption[] = []
  const seen = new Set<string>()
  for (const font of host ?? []) {
    const family = font?.family?.trim()
    if (!family) continue
    const key = family.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const label = font?.label?.trim()
    out.push(label ? { family, label } : { family })
  }
  return out
}

/** 在候选中按族名查找（大小写不敏感） */
export function findFontOption(
  fonts: readonly FontCatalogOption[],
  family?: string,
): FontCatalogOption | undefined {
  const key = family?.trim().toLowerCase()
  if (!key) return undefined
  return fonts.find(f => f.family.trim().toLowerCase() === key)
}

/** 下拉选项文案：有展示名时补上真实族名（写入模板的值） */
export function fontOptionLabel(option: FontCatalogOption): string {
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

/** 族名与展示名取更优的一档；两者都不命中返回 -1 */
function fontMatchRank(font: FontCatalogOption, queryKey: string): number {
  const byFamily = matchRank(normalizeFontQuery(font.family), queryKey)
  if (!font.label) return byFamily
  const byLabel = matchRank(normalizeFontQuery(font.label), queryKey)
  if (byFamily < 0) return byLabel
  return byLabel < 0 ? byFamily : Math.min(byFamily, byLabel)
}

/**
 * 模糊过滤字体候选：完全相等 > 前缀 > 子串 > 子序列，同档保持候选原有顺序
 * （顺序由宿主声明决定，过滤不应打乱）。族名与展示名（label）都参与匹配，
 * 设计者按业务名搜也能命中。
 */
export function filterFontOptions(
  fonts: readonly FontCatalogOption[],
  query: string,
): FontCatalogOption[] {
  const queryKey = normalizeFontQuery(query.trim())
  if (!queryKey) return [...fonts]
  return fonts
    .map((font, index) => ({ font, index, rank: fontMatchRank(font, queryKey) }))
    .filter(item => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(item => item.font)
}
