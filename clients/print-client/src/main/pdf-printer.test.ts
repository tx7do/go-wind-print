// pdf-printer 参数构造单测：纸张（方向）与色彩模式必须显式下发给打印系统
import { describe, it, expect, vi, afterEach } from 'vitest'

// 出纸命令替换为桩，用于核对各平台分支真实下发的参数
vi.mock('node:child_process', () => ({
  execFile: vi.fn((_file: string, _args: string[], _opts: unknown,
    cb: (err: unknown, res: { stdout: string; stderr: string }) => void) => {
    cb(null, { stdout: '', stderr: '' })
  }),
}))
// SumatraPDF 探测路径改为恒存在，使 win32 分支可在非 Windows 宿主上跑
vi.mock('node:fs', () => ({ statSync: vi.fn(() => ({})) }))

import { execFile } from 'node:child_process'
import {
  buildCupsArgs,
  buildSumatraSettings,
  printPdfFile,
  resolveMediaOption,
  PT_PER_MM,
} from './pdf-printer.js'

describe('resolveMediaOption', () => {
  it('纵向页按标准纸型名下发（各平台一致）', () => {
    for (const platform of ['darwin', 'linux'] as const) {
      expect(resolveMediaOption({ width: 210, height: 297 }, undefined, platform)).toBe('media=A4')
      expect(resolveMediaOption({ width: 148, height: 210 }, undefined, platform)).toBe('media=A5')
      expect(resolveMediaOption({ width: 216, height: 279 }, undefined, platform)).toBe('media=Letter')
    }
  })

  it('横向页分平台：macOS 走纵向序纸型名 + 方向翻向，Linux 走 Custom 真实朝向', () => {
    expect(resolveMediaOption({ width: 297, height: 210 }, undefined, 'darwin')).toBe('media=A4')
    // macOS 的 orientation-requested 是「交换介质长宽」，所以纸型必须按纵向序声明，
    // 翻向后才等于页面真实尺寸；已按真序（横向）声明再翻会被打回纵向。
    expect(resolveMediaOption({ width: 100, height: 75 }, undefined, 'darwin'))
      .toBe('media=Custom.212.6x283.46')
    // Linux 没有可抵消旋转的方向 lever（orientation-requested 会被写成 /Rotate 270），
    // 报纵向纸型名等于把横向页钉在纵向介质上必被转，只能按页面真实朝向声明。
    expect(resolveMediaOption({ width: 297, height: 210 }, undefined, 'linux'))
      .toBe('media=Custom.841.89x595.28')
    expect(resolveMediaOption({ width: 100, height: 75 }, undefined, 'linux'))
      .toBe('media=Custom.283.46x212.6')
    expect(resolveMediaOption({ width: 279.4, height: 215.9 }, undefined, 'linux'))
      .toBe('media=Custom.792x612')
  })

  it('非标准尺寸（连续纸/自定义）用 Custom.<宽>x<高>（点）', () => {
    // 80×150mm → 226.77×425.2 点
    expect(resolveMediaOption({ width: 80, height: 150 })).toBe('media=Custom.226.77x425.2')
    expect(PT_PER_MM).toBeCloseTo(2.8346, 3)
  })

  it('宿主指定的驱动纸型优先（如针式打印机预置纸型）', () => {
    expect(resolveMediaOption({ width: 210, height: 297 }, '收据241x140')).toBe('media=收据241x140')
    expect(resolveMediaOption(undefined, '  A4  ')).toBe('media=A4')
  })

  it('尺寸缺失时不下发 media（交给驱动默认）', () => {
    expect(resolveMediaOption(undefined)).toBeUndefined()
    expect(resolveMediaOption({ width: 0, height: 0 })).toBeUndefined()
  })
})

describe('buildCupsArgs', () => {
  it('macOS 竖向自定义纸：声明 Custom 纸张 + 份数 + 目标打印机', () => {
    const args = buildCupsArgs('/tmp/job.pdf', {
      printerName: '热敏-80',
      copies: 2,
      paper: { width: 80, height: 150 },
    }, 'darwin')
    expect(args).toEqual([
      '-d', '热敏-80',
      '-n', '2',
      '-o', 'media=Custom.226.77x425.2',
      '/tmp/job.pdf',
    ])
  })

  it('macOS 横向页：纸型名是纵向介质，必须再请求横向，否则滤镜自动转 90°', () => {
    const args = buildCupsArgs('/tmp/job.pdf', { paper: { width: 297, height: 210 } }, 'darwin')
    expect(args).toContain('media=A4')
    expect(args).toContain('orientation-requested=4')
  })

  it('macOS 方向请求只跟页面长宽比走：纵向页与正方页不发', () => {
    // 实测 macOS：给纵向页发 landscape 会把介质翻成横向，正立内容反被转 90°
    for (const paper of [
      { width: 210, height: 297 },
      { width: 80, height: 500 },
      { width: 100, height: 100 },
    ]) {
      const args = buildCupsArgs('/tmp/job.pdf', { paper }, 'darwin')
      expect(args, JSON.stringify(paper)).not.toContain('orientation-requested=4')
    }
    expect(buildCupsArgs('/tmp/job.pdf', { paper: { width: 100, height: 75 } }, 'darwin')).toContain(
      'orientation-requested=4',
    )
  })

  it('macOS 宿主指定驱动纸型时不翻向（纸型朝向由驱动定义决定）', () => {
    const args = buildCupsArgs(
      '/tmp/job.pdf',
      { paperName: '标签100x75', paper: { width: 100, height: 75 } },
      'darwin',
    )
    expect(args).toContain('media=标签100x75')
    expect(args).not.toContain('orientation-requested=4')
  })

  it('Linux 一律不发方向请求：cups-filters 会写成 /Rotate 270 并交换 MediaBox，把标签打歪', () => {
    const args = buildCupsArgs('/tmp/job.pdf', { paper: { width: 100, height: 75 } }, 'linux')
    expect(args).toEqual(['-n', '1', '-o', 'media=Custom.283.46x212.6', '/tmp/job.pdf'])
    expect(
      buildCupsArgs('/tmp/job.pdf', { paper: { width: 297, height: 210 } }, 'linux'),
    ).not.toContain('orientation-requested=4')
  })

  it('Linux 横向 A4：按页面真实朝向声明 Custom，不报纵向纸型名', () => {
    const args = buildCupsArgs('/tmp/job.pdf', { paper: { width: 297, height: 210 } }, 'linux')
    expect(args).toEqual(['-n', '1', '-o', 'media=Custom.841.89x595.28', '/tmp/job.pdf'])
  })

  it('页面尺寸缺失时任何平台都不发方向请求', () => {
    for (const platform of ['darwin', 'linux'] as const) {
      expect(buildCupsArgs('/tmp/job.pdf', { printerName: '标签机' }, platform)).not.toContain(
        'orientation-requested=4',
      )
    }
  })

  it('双面与驱动纸型', () => {
    const args = buildCupsArgs('/tmp/job.pdf', {
      paperName: '收据241x140',
      duplex: true,
      paper: { width: 241, height: 140 },
    }, 'darwin')
    expect(args).toContain('media=收据241x140')
    expect(args).toContain('sides=two-sided-long-edge')
    expect(args[args.length - 1]).toBe('/tmp/job.pdf')
  })
})

describe('buildSumatraSettings', () => {
  it('份数前缀', () => {
    expect(buildSumatraSettings({ copies: 3 })).toBe('3x')
  })

  it('按页面长宽比显式声明方向：宽>高 → landscape，否则 portrait', () => {
    expect(buildSumatraSettings({ copies: 1, paper: { width: 100, height: 75 } })).toBe('1x,landscape')
    expect(buildSumatraSettings({ copies: 2, paper: { width: 75, height: 100 } })).toBe('2x,portrait')
    // 正方形归 portrait：SumatraPDF 只对「宽>高」加 90°，正方页声明 landscape 会被反向旋转
    expect(buildSumatraSettings({ paper: { width: 100, height: 100 } })).toBe('1x,portrait')
  })

  it('页面尺寸缺失时只下发份数（交给驱动默认）', () => {
    expect(buildSumatraSettings({ copies: 1 })).toBe('1x')
    expect(buildSumatraSettings({ paper: { width: 0, height: 0 } })).toBe('1x')
  })
})

describe('printPdfFile 出纸参数转发', () => {
  const REAL_PLATFORM = process.platform
  const setPlatform = (p: NodeJS.Platform): void => {
    Object.defineProperty(process, 'platform', { value: p, configurable: true })
  }
  afterEach(() => {
    setPlatform(REAL_PLATFORM)
    vi.mocked(execFile).mockClear()
  })

  function lastCall(): { file: string; args: string[] } {
    const [file, args] = vi.mocked(execFile).mock.calls.at(-1) as unknown as [string, string[]]
    return { file, args }
  }

  it('macOS：页面尺寸必须转发到 lp（否则 media 与方向声明形同虚设）', async () => {
    setPlatform('darwin')
    await printPdfFile('/tmp/job.pdf', {
      printerName: '标签机',
      copies: 2,
      paper: { width: 100, height: 75 },
    })
    const { file, args } = lastCall()
    expect(file).toBe('lp')
    expect(args).toEqual([
      '-d', '标签机',
      '-n', '2',
      '-o', 'media=Custom.212.6x283.46',
      '-o', 'orientation-requested=4',
      '/tmp/job.pdf',
    ])
  })

  it('Linux：同一路径但不带方向请求（避免 cups-filters 写 /Rotate）', async () => {
    setPlatform('linux')
    await printPdfFile('/tmp/job.pdf', {
      printerName: '标签机',
      copies: 2,
      paper: { width: 100, height: 75 },
    })
    const { file, args } = lastCall()
    expect(file).toBe('lp')
    expect(args).toEqual([
      '-d', '标签机',
      '-n', '2',
      '-o', 'media=Custom.283.46x212.6',
      '/tmp/job.pdf',
    ])
  })

  it('Windows：方向随页面尺寸转发（否则宽幅页面被 SumatraPDF 转 90°）', async () => {
    setPlatform('win32')
    await printPdfFile('/tmp/job.pdf', {
      printerName: '标签机',
      copies: 1,
      paper: { width: 100, height: 75 },
    })
    const { args } = lastCall()
    expect(args).toContain('-print-to')
    expect(args[args.indexOf('-print-settings') + 1]).toBe('1x,landscape')
  })
})
