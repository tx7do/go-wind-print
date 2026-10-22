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
 * 新元素的默认字体族名：黑体。
 * 选它而不是继续走兜底栈（微软雅黑/苹方）的理由：后两者的 hinting 面向屏幕 ClearType、笔画偏细，
 * 在 203dpi（8 点/mm）的 1-bit 热敏上阈值化后发虚；黑体笔画均匀且本身更粗，落纸更实。
 * 该族名只在 Windows 与部分 mac 上存在，缺失时由 `toFontFamilyStack` 追加的兜底栈接住，
 * 每端都落到本平台最接近的黑体上，不会开天窗。
 */
export const DEFAULT_PRINT_FONT_FAMILY = 'SimHei'

/**
 * 免字体文件的本机系统字体候选（CSS 族名直接可用，不参与 @font-face）。
 *
 * **三端解析结果不同**：画布、浏览器直印与桌面客户端用「用户机」装了什么，服务端 PDF 用渲染容器
 * 装了什么（镜像内中文只有 fonts-noto-cjk）。所以这些档位是「零配置便捷档」，跨端字面不保证一致；
 * 要三端完全一致仍应走模板字体声明（@font-face）。
 *
 * label 文案会被下拉拼成「label（family）」，故这里不再带括号，只用 `·` 追加短标注，避免长串被截断。
 */
export const SYSTEM_FONT_OPTIONS: readonly FontCatalogOption[] = [
  { family: 'SimHei', label: '黑体 · 热敏推荐' },
  { family: 'Heiti SC', label: '黑体-简 · 热敏推荐' },
  { family: 'Hiragino Sans GB', label: '冬青黑体' },
  { family: 'Noto Sans CJK SC', label: '思源黑体 · 服务端' },
  { family: 'Microsoft YaHei', label: '微软雅黑 · 屏幕体' },
  { family: 'PingFang SC', label: '苹方 · 屏幕体' },
  { family: 'SimSun', label: '宋体 · 热敏慎用' },
  { family: 'KaiTi', label: '楷体 · 热敏慎用' },
  { family: 'FangSong', label: '仿宋 · 热敏慎用' },
]

/**
 * 合并下拉候选：宿主声明的模板字体在前（随模板分发、三端一致），系统候选在后。
 * 族名大小写不敏感去重，宿主命中时保留宿主自己的 label，不被系统档覆盖。
 */
export function withSystemFontOptions(
  host?: readonly (FontCatalogOption | null | undefined)[] | null,
): FontCatalogOption[] {
  const out: FontCatalogOption[] = []
  const seen = new Set<string>()
  for (const font of [...(host ?? []), ...SYSTEM_FONT_OPTIONS]) {
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
