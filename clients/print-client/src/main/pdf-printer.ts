// PDF 打印工具（未接线的回退通路）：调用系统命令打印 PDF 文件，仅 macOS / Linux 走 `lp`。
// Windows 侧曾借外部 SumatraPDF 出纸，2026-10-17 随「出纸统一走 Chromium 原生打印」一并移除，
// 现在 win32 调用会直接抛错——不要为它再加回任何外部依赖。
//
// 已实测的坑：出纸方向的判据是「生效介质朝向 vs 页面朝向」，两个系统同源——CUPS 的 pdftops
// （macOS/Linux）都会给朝向不一致的页面补 90°。所以纸张必须显式声明（`-o media=…`：宿主指定驱动纸型
// → 标准纸型 → `Custom.<宽>x<高>`，单位：点，可带小数）；`A4/Letter` 这类纸型名本身是纵向介质，
// 横向页只声明它挡不住旋转。
// 抵消手段各系统不同：macOS 的标准纸型名（A4/Letter）本身就是纵向介质，横向页再补
// `-o orientation-requested=4`，滤镜会把内容转贴到这张纵向介质上（实测横向 A4 正立出在 A4 纸上）；
// `Custom.` 则两端都按页面真实朝向声明——实测 macOS（CUPS 2.3.4 + cgpdftopdf）该方向请求的实现
// 不是「交换介质长宽」，而是「按声明的介质朝向把内容转过去贴它」，给物理横向的标签按纵向序
// （短边×长边）声明，落盘介质就真成纵向（100×75 → 212x283pt）且内容被补 90°。
// Linux 不发方向请求（cups-filters 把它实现为「写 /Rotate 270 + 交换 MediaBox」，标签机反被打歪），
// 横向页也不再报纵向纸型名，改按页面真实朝向走 `Custom.`。队列 PPD 不支持自定义尺寸时 `Custom.`
// 会被静默忽略并回落队列默认纸张，此时只有驱动里已有的纸型名（`paperName`）可用。
//
// 各平台分支必须原样透传 options（尤其 paper）：曾按字段逐个转发，paper 被漏掉，
// media 声明从未真正下发。
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Logger } from './logger.js'

const execFileAsync = promisify(execFile)

/** 1mm = 72/25.4 点（PDF/CUPS 长度单位） */
export const PT_PER_MM = 72 / 25.4

/** 标准纸型（mm），用于把页面尺寸映射成驱动可识别的纸张名 */
const STANDARD_MEDIA: ReadonlyArray<{ name: string; width: number; height: number }> = [
  { name: 'A3', width: 297, height: 420 },
  { name: 'A4', width: 210, height: 297 },
  { name: 'A5', width: 148, height: 210 },
  { name: 'Letter', width: 215.9, height: 279.4 },
  { name: 'Legal', width: 215.9, height: 355.6 },
]

/** 尺寸匹配容差（mm）：驱动/渲染的取整误差范围内按标准纸型处理 */
const MEDIA_TOLERANCE_MM = 2

export interface PdfPrintOptions {
  printerName?: string
  copies?: number
  /** 驱动纸型名（如针式打印机的预置纸型），优先于按尺寸推断 */
  paperName?: string
  /** 页面尺寸（mm）：CUPS 用它声明 `media=` */
  paper?: { width: number; height: number }
  /** 是否双面打印 */
  duplex?: boolean
  /** 日志记录器 */
  logger?: Pick<Logger, 'info' | 'warn' | 'error' | 'debug'>
}

/** 页面尺寸 → CUPS `media` 选项值；无法确定时返回 undefined（交给驱动默认） */
export function resolveMediaOption(
  paper?: { width: number; height: number },
  paperName?: string,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  const named = paperName?.trim()
  if (named) return `media=${named}`
  if (!paper || !(paper.width > 0) || !(paper.height > 0)) return undefined

  // 标准纸型名在 PPD 里就是纵向介质。macOS 有 orientation-requested 可把内容转贴到它上面，
  // 所以横向页照报纸型名；Linux 没有这个 lever（被实现成写 /Rotate 270 + 交换 MediaBox），
  // 报纵向纸型名等于把横向页钉在纵向介质上、必被旋转，只能按页面真实朝向走 Custom。
  if (paper.width <= paper.height || platform === 'darwin') {
    const shortSide = Math.min(paper.width, paper.height)
    const longSide = Math.max(paper.width, paper.height)
    const matched = STANDARD_MEDIA.find(
      (m) =>
        Math.abs(Math.min(m.width, m.height) - shortSide) <= MEDIA_TOLERANCE_MM
        && Math.abs(Math.max(m.width, m.height) - longSide) <= MEDIA_TOLERANCE_MM,
    )
    if (matched) return `media=${matched.name}`
  }

  // Custom. 两端都按页面真实朝向声明：标签/卷纸这类自定义纸张物理上就是横向（宽>高），
  // 按纵向序声明再补方向请求，等于要求打印机换成一张并不存在的纵向纸（实测内容被转 90° 贴上去）。
  const round2 = (v: number) => Math.round(v * 100) / 100
  return `media=Custom.${round2(paper.width * PT_PER_MM)}x${round2(paper.height * PT_PER_MM)}`
}

/** 构造 CUPS（lp）命令行参数（纯函数，便于单测） */
export function buildCupsArgs(
  pdfPath: string,
  options: PdfPrintOptions = {},
  platform: NodeJS.Platform = process.platform,
): string[] {
  const { printerName, copies = 1, paperName, paper, duplex } = options
  const args: string[] = []
  if (printerName) args.push('-d', printerName)
  args.push('-n', String(copies))

  const media = resolveMediaOption(paper, paperName, platform)
  if (media) args.push('-o', media)
  if (
    platform === 'darwin'
    && !paperName
    && media
    // 只补在纵向介质的标准纸型名上；Custom. 已按页面真实朝向声明，再补就是要求换成纵向纸
    && !media.startsWith('media=Custom.')
    && paper
    && paper.width > paper.height
  ) {
    args.push('-o', 'orientation-requested=4')
  }
  if (duplex) args.push('-o', 'sides=two-sided-long-edge')

  args.push(pdfPath)
  return args
}

/**
 * 打印 PDF 文件（仅 macOS / Linux）。
 * 本模块是**未接线的回退通路**：只有把 `print-engine.ts` 的 `ACTIVE_PRINT_ROUTE` 改成 `'pdf'`
 * 才会走到这里；当前通路按模板尺寸向驱动显式声明纸张，见 html-printer.ts。
 */
export async function printPdfFile(
  pdfPath: string,
  options: PdfPrintOptions = {},
): Promise<void> {
  const platform = process.platform
  const { printerName, copies = 1, logger } = options

  logger?.info('开始打印 PDF', { pdfPath, platform, printerName, copies })

  try {
    if (platform === 'darwin') {
      await printOnMac(pdfPath, options)
    } else if (platform === 'win32') {
      // SumatraPDF 通路已随「出纸统一走 Chromium 原生打印」移除，不再引入任何外部依赖
      throw new Error('Windows 不支持 PDF 出纸通路，请保持 ACTIVE_PRINT_ROUTE 为 html（默认），或改用驱动/队列首选项定纸型')
    } else if (platform === 'linux') {
      await printOnLinux(pdfPath, options)
    } else {
      throw new Error(`不支持的操作系统平台: ${platform}`)
    }
    logger?.info('PDF 打印完成', { pdfPath })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger?.error('PDF 打印失败', { pdfPath, error: message })
    throw err
  }
}

/** macOS: 使用 lp 命令打印 */
async function printOnMac(
  pdfPath: string,
  options: PdfPrintOptions,
): Promise<void> {
  const args = buildCupsArgs(pdfPath, options, 'darwin')
  options.logger?.info('lp 出纸参数', { printerName: options.printerName, options: args.slice(0, -1) })
  await execFileAsync('lp', args, { timeout: 30000 })
}

/** Linux: 使用 lp 命令打印 */
async function printOnLinux(
  pdfPath: string,
  options: PdfPrintOptions,
): Promise<void> {
  const args = buildCupsArgs(pdfPath, options, 'linux')
  options.logger?.info('lp 出纸参数', { printerName: options.printerName, options: args.slice(0, -1) })
  await execFileAsync('lp', args, { timeout: 30000 })
}
