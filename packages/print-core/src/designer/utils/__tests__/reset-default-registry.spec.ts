// 契约：注册表的 `default` 只能**引用**渲染端常量，不能抄字面值。
// 值相等测不出这件事（抄一个 0/10 进来照样相等），所以这里读源码断言符号来源，
// 再用 propertyDefault() 做一次运行时对账。
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  BARCODE_BAR_HEIGHT_MODULES, BARCODE_QUIET_ZONE_MODULES,
  BARCODE_TEXT_FONT_SIZE_MODULES, QR_DEFAULT_QUIET_MODULES,
} from '../../../render/barcode-dot'
import { CROP_SCALE_MIN } from '../../../render/crop-style'
import { DEFAULT_SHRINK_MIN_FONT_SIZE_PT } from '../../../render/text-fit'
import { propertyDefault } from '../property-search'

const SRC = readFileSync(fileURLToPath(new URL('../property-search.ts', import.meta.url)), 'utf8')

/** 注册表 key → 必须引用的常量名 */
const SYMBOLS: Record<string, string> = {
  'ap-shrink-min': 'DEFAULT_SHRINK_MIN_FONT_SIZE_PT',
  'ap-img-fit-scale': 'CROP_SCALE_MIN',
  'cd-bar-quiet-zone': 'BARCODE_QUIET_ZONE_MODULES',
  'cd-bar-height': 'BARCODE_BAR_HEIGHT_MODULES',
  'cd-font-size': 'BARCODE_TEXT_FONT_SIZE_MODULES',
  'cd-quiet-zone': 'QR_DEFAULT_QUIET_MODULES',
}

/** 取包含该 key 的条目片段：注册表一条可能是单行，也可能 `default` 折到下一行 */
function lineOf(key: string): string {
  const lines = SRC.split('\n')
  const i = lines.findIndex(l => l.includes(`key: '${key}'`))
  if (i < 0) throw new Error(`注册表里找不到 ${key}`)
  return [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join('\n')
}

describe('注册表纯提示字段 default 的来源约束', () => {
  for (const [key, symbol] of Object.entries(SYMBOLS)) {
    it(`${key} 的 default 引用 ${symbol} 而不是字面值`, () => {
      const line = lineOf(key)
      expect(line, `${key} 的 default 必须写常量名`).toContain(`default: ${symbol}`)
      // 反面对照：同一条目里不许出现 `default: <数字>` 这种抄字面值的写法
      expect(line, `${key} 的 default 疑似抄了字面值`).not.toMatch(/default:\s*-?\d/)
    })
  }

  it('运行时对账：六条都取得到值，且与常量本身一致', () => {
    const expected: [string, number | string][] = [
      ['ap-shrink-min', DEFAULT_SHRINK_MIN_FONT_SIZE_PT],
      ['ap-img-fit-scale', CROP_SCALE_MIN],
      ['cd-bar-quiet-zone', BARCODE_QUIET_ZONE_MODULES],
      ['cd-bar-height', BARCODE_BAR_HEIGHT_MODULES],
      ['cd-font-size', BARCODE_TEXT_FONT_SIZE_MODULES],
      ['cd-quiet-zone', QR_DEFAULT_QUIET_MODULES],
    ]
    for (const [key, value] of expected) {
      expect(propertyDefault(key)?.value, `${key} 的提示值漂了`).toBe(value)
    }
  })

  it('没有单一常量源的行不声明 default（提示就只写「恢复默认值」）', () => {
    for (const key of ['ap-font-size', 'ap-line-height', 'bb-border-width', 'bb-bg-color', 'tb-default-padding']) {
      expect(propertyDefault(key), `${key} 不该有 default`).toBeUndefined()
    }
  })
})
