// packages/print-core/src/functions/format.ts

/**
 * 金额格式化：千分位 + 两位小数
 */
export function formatMoney(value: any): string {
  const num = Number(value)
  if (isNaN(num)) return String(value)

  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)
  const [intPart, decPart] = abs.toFixed(2).split('.')

  // 千分位
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${formatted}.${decPart}`
}

/**
 * 日期格式化
 * 支持: YYYY, MM, DD, HH, mm, ss
 */
export function formatDate(value: any, fmt: string): string {
  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'number') {
    date = new Date(value)
  } else if (typeof value === 'string') {
    date = new Date(value)
  } else {
    return String(value)
  }

  if (isNaN(date.getTime())) return String(value)

  const pad = (n: number) => String(n).padStart(2, '0')

  return fmt
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const CN_UNITS = ['', '拾', '佰', '仟']
const CN_GROUP_UNITS = ['', '万', '亿', '万亿', '亿亿']

/** 四位一节转大写（1~9999）；节内连续缺位只补一个「零」，节尾的零不写 */
function fourDigitToCapital(n: number): string {
  let out = ''
  let zeroPending = false
  for (let pos = 3; pos >= 0; pos--) {
    const d = Math.floor(n / 10 ** pos) % 10
    if (d === 0) {
      if (out) zeroPending = true
      continue
    }
    if (zeroPending) {
      out += '零'
      zeroPending = false
    }
    out += CN_DIGITS[d] + CN_UNITS[pos]
  }
  return out
}

/** 数字转大写金额（人民币票据规范：四位一节，万/亿 节单位不可缺） */
export function toUpperCaseAmount(value: any): string {
  const num = Number(value)
  if (isNaN(num)) return String(value)

  if (num === 0) return '零元整'

  const sign = num < 0 ? '负' : ''
  const [intStr, decStr] = Math.abs(num).toFixed(2).split('.')

  // 整数部分按四位一节从高位向下拼；group < 1000 说明本节千位缺失，
  // 与上一节之间必须补一个「零」，否则「壹亿贰仟…」会被写成「壹贰仟…」。
  const groupCount = Math.ceil(intStr.length / 4)
  let result = ''
  let zeroPending = false
  for (let groupIdx = groupCount - 1; groupIdx >= 0; groupIdx--) {
    const end = intStr.length - groupIdx * 4
    const group = parseInt(intStr.slice(Math.max(0, end - 4), end), 10)
    if (group === 0) {
      if (result) zeroPending = true
      continue
    }
    if (result && (zeroPending || group < 1000)) result += '零'
    zeroPending = false
    result += fourDigitToCapital(group) + (CN_GROUP_UNITS[groupIdx] ?? '')
  }
  result = `${result || '零'}元`

  const jiao = parseInt(decStr[0], 10)
  const fen = parseInt(decStr[1], 10)

  if (jiao === 0 && fen === 0) {
    result += '整'
  } else {
    // 角位为零而分位非零时，「元」后必须写「零」（票据与结算凭证填写规范）
    if (jiao === 0) result += '零'
    else result += CN_DIGITS[jiao] + '角'
    if (fen > 0) result += CN_DIGITS[fen] + '分'
  }

  return sign + result
}

/**
 * 条件判断函数
 */
export function ifFn(condition: any, trueVal: any, falseVal: any): any {
  return condition ? trueVal : falseVal
}
