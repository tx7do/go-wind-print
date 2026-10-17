// PDF 打印工具：调用系统命令打印 PDF 文件
// 支持 macOS (lp)、Windows (SumatraPDF)、Linux (lp)
//
// 已实测的坑：出纸方向的判据是「生效介质朝向 vs 页面朝向」，三个系统同源——CUPS 的
// pdftops（macOS/Linux）与 SumatraPDF 的 autoRotate（Windows）都会给朝向不一致的页面补
// 90°。所以纸张必须显式声明（`-o media=…`：宿主指定驱动纸型 → 标准纸型 → `Custom.<宽>x<高>`，
// 单位：点，可带小数）；`A4/Letter` 这类纸型名本身是纵向介质，横向页只声明它挡不住旋转。
// 抵消手段各系统不同：macOS 补 `-o orientation-requested=4`，其实现是**交换介质长宽**（实测
// do_rotate 由 90 变 0），所以 macOS 的 `Custom.` 也按纵向序（短边×长边）声明，翻一次才落回
// 页面真实尺寸；Linux 的 cups-filters 用「写 /Rotate 270 + 交换 MediaBox」实现
// 同一请求，标签机反被打歪，故 Linux 只声明纸张——横向页也就不走标准纸型名（那是纵向介质），
// 改按页面真实朝向走 `Custom.`。队列 PPD 不支持自定义尺寸时 `Custom.` 会被静默忽略并回落
// 队列默认纸张，此时只有驱动里已有的纸型名（`paperName`）可用。
//
// 各平台分支必须原样透传 options（尤其 paper）：曾按字段逐个转发，paper 被漏掉，
// media 声明从未真正下发。Windows 无 CUPS 的纸张声明可用，方向靠 SumatraPDF 的
// print-settings 显式声明（见 buildSumatraSettings）。
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
  /** 驱动纸型名（如针式打印机的预置纸型）；优先于按尺寸推断 */
  paperName?: string
  /** 页面尺寸（mm）；用于向 CUPS 声明纸张，避免横向页被旋转成纵向 */
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

  // 标准纸型名在 PPD 里就是纵向介质。macOS 还有 orientation-requested 能把介质翻成横向，
  // 所以照报纸型名；Linux 没有这个 lever（orientation-requested 被实现成写 /Rotate 270），
  // 给横向页报纵向纸型名等于把它钉在纵向介质上、必被旋转，只能按页面真实朝向走 Custom。
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

  // macOS 的 orientation-requested 实现是「交换介质长宽」，所以纸型一律按纵向序给出
  // （短边×长边），横向页再翻一次才等于页面真实尺寸；已经按真序（横向）声明再翻会被打回纵向。
  const round2 = (v: number) => Math.round(v * 100) / 100
  const w = platform === 'darwin'
    ? Math.min(paper.width, paper.height)
    : paper.width
  const h = platform === 'darwin'
    ? Math.max(paper.width, paper.height)
    : paper.height
  return `media=Custom.${round2(w * PT_PER_MM)}x${round2(h * PT_PER_MM)}`
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
    && paper
    && paper.width > paper.height
  ) {
    args.push('-o', 'orientation-requested=4')
  }
  if (duplex) args.push('-o', 'sides=two-sided-long-edge')

  args.push(pdfPath)
  return args
}

/** 构造 SumatraPDF 打印参数（纯函数，便于单测） */
export function buildSumatraSettings(options: PdfPrintOptions = {}): string {
  const { copies = 1, paper } = options
  const tokens = [`${copies}x`]
  // SumatraPDF 默认 autoRotate：对「宽>高」的页面无条件加 90°，只有方向判定为横向时才抵消回
  // 0°；不声明方向时该判定取驱动 DEVMODE 的默认值，宽幅标签页会被转 90° 出纸。
  // 故按页面自身长宽比显式声明（相等归 portrait——正方页声明 landscape 会被反向旋转 90°）。
  if (paper && paper.width > 0 && paper.height > 0) {
    tokens.push(paper.width > paper.height ? 'landscape' : 'portrait')
  }
  return tokens.join(',')
}

/**
 * 打印 PDF 文件
 * 根据操作系统调用相应的系统命令
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
      await printOnWindows(pdfPath, options)
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
  await execFileAsync('lp', buildCupsArgs(pdfPath, options, 'darwin'), { timeout: 30000 })
}

/** Windows: 使用 SumatraPDF 打印（需要预装） */
async function printOnWindows(
  pdfPath: string,
  options: PdfPrintOptions,
): Promise<void> {
  const { printerName } = options

  // SumatraPDF 路径（常见安装位置）
  const sumatraPaths = [
    'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
    'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\SumatraPDF\\SumatraPDF.exe` : '',
  ].filter(Boolean)

  let sumatraPath = ''
  for (const p of sumatraPaths) {
    try {
      const { statSync } = await import('node:fs')
      statSync(p)
      sumatraPath = p
      break
    } catch {
      // 继续尝试下一个路径
    }
  }

  if (!sumatraPath) {
    throw new Error(
      '未找到 SumatraPDF，请安装 SumatraPDF 或使用其他 PDF 打印方案。'
      + '下载地址: https://www.sumatrapdfreader.org/',
    )
  }

  const args = ['-print-to']
  if (printerName) {
    args.push(printerName)
  } else {
    args.push('default')
  }
  args.push('-print-settings', buildSumatraSettings(options))
  args.push('-silent')
  args.push(pdfPath)

  await execFileAsync(sumatraPath, args, { timeout: 60000 })
}

/** Linux: 使用 lp 命令打印 */
async function printOnLinux(
  pdfPath: string,
  options: PdfPrintOptions,
): Promise<void> {
  await execFileAsync('lp', buildCupsArgs(pdfPath, options, 'linux'), { timeout: 30000 })
}
