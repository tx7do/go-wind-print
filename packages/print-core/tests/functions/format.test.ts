// packages/print-core/tests/functions/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatMoney, formatDate, toUpperCaseAmount, ifFn } from '../../src/functions/format.js'

describe('formatMoney', () => {
  it('formats positive number', () => {
    expect(formatMoney(1234.5)).toBe('1,234.50')
  })

  it('formats zero', () => {
    expect(formatMoney(0)).toBe('0.00')
  })

  it('formats negative number', () => {
    expect(formatMoney(-1234.5)).toBe('-1,234.50')
  })

  it('formats with no decimals', () => {
    expect(formatMoney(1000)).toBe('1,000.00')
  })

  it('formats large number', () => {
    expect(formatMoney(1234567.89)).toBe('1,234,567.89')
  })

  it('handles string input', () => {
    expect(formatMoney('1234.5')).toBe('1,234.50')
  })
})

describe('formatDate', () => {
  it('formats YYYY-MM-DD', () => {
    const d = new Date('2026-08-06T12:00:00')
    expect(formatDate(d, 'YYYY-MM-DD')).toBe('2026-08-06')
  })

  it('formats YYYY年MM月DD日', () => {
    const d = new Date('2026-08-06T12:00:00')
    expect(formatDate(d, 'YYYY年MM月DD日')).toBe('2026年08月06日')
  })

  it('formats HH:mm:ss', () => {
    const d = new Date('2026-08-06T14:30:45')
    expect(formatDate(d, 'HH:mm:ss')).toBe('14:30:45')
  })

  it('handles string date', () => {
    expect(formatDate('2026-08-06', 'YYYY/MM/DD')).toBe('2026/08/06')
  })

  it('handles timestamp', () => {
    const ts = new Date('2026-01-01').getTime()
    expect(formatDate(ts, 'YYYY-MM-DD')).toBe('2026-01-01')
  })
})

describe('toUpperCaseAmount', () => {
  it('converts zero', () => {
    expect(toUpperCaseAmount(0)).toBe('零元整')
  })

  it('converts simple number', () => {
    expect(toUpperCaseAmount(1)).toBe('壹元整')
  })

  it('converts with jiao and fen', () => {
    expect(toUpperCaseAmount(1.23)).toBe('壹元贰角叁分')
  })

  it('converts large number', () => {
    expect(toUpperCaseAmount(1234.56)).toBe('壹仟贰佰叁拾肆元伍角陆分')
  })

  it('converts negative', () => {
    expect(toUpperCaseAmount(-100)).toBe('负壹佰元整')
  })

  // Gitee IKOYG0：万/亿 节单位丢失或错位
  it('整万', () => {
    expect(toUpperCaseAmount(10000)).toBe('壹万元整')
  })

  it('万位带尾数（issue 原例 638247）', () => {
    expect(toUpperCaseAmount(638247)).toBe('陆拾叁万捌仟贰佰肆拾柒元整')
  })

  it('一万两千', () => {
    expect(toUpperCaseAmount(12345)).toBe('壹万贰仟叁佰肆拾伍元整')
  })

  it('八万', () => {
    expect(toUpperCaseAmount(80000)).toBe('捌万元整')
  })

  it('万节与个节之间补零（10500）', () => {
    expect(toUpperCaseAmount(10500)).toBe('壹万零伍佰元整')
  })

  it('两千万（万不得跑到最前）', () => {
    expect(toUpperCaseAmount(20000000)).toBe('贰仟万元整')
  })

  it('亿位', () => {
    expect(toUpperCaseAmount(100000000)).toBe('壹亿元整')
  })

  it('亿万千全节（123456789）', () => {
    expect(toUpperCaseAmount(123456789)).toBe('壹亿贰仟叁佰肆拾伍万陆仟柒佰捌拾玖元整')
  })

  it('亿内逐节补零（102030405）', () => {
    expect(toUpperCaseAmount(102030405)).toBe('壹亿零贰佰零叁万零肆佰零伍元整')
  })

  it('亿与个节之间整节为零（100000001）', () => {
    expect(toUpperCaseAmount(100000001)).toBe('壹亿零壹元整')
  })

  it('万亿', () => {
    expect(toUpperCaseAmount(1000000000000)).toBe('壹万亿元整')
  })

  it('角位为零、分位非零时元后补零（638247.09）', () => {
    expect(toUpperCaseAmount(638247.09)).toBe('陆拾叁万捌仟贰佰肆拾柒元零玖分')
  })

  it('不足一元仍带元位', () => {
    expect(toUpperCaseAmount(0.5)).toBe('零元伍角')
  })

  it('负数跨万节', () => {
    expect(toUpperCaseAmount(-638247)).toBe('负陆拾叁万捌仟贰佰肆拾柒元整')
  })

  // 文档与两处 help-content 的示例口径（docs/中文/指南/表达式引擎.md、help-content/features.ts）
  it('文档示例 69543.75', () => {
    expect(toUpperCaseAmount(69543.75)).toBe('陆万玖仟伍佰肆拾叁元柒角伍分')
  })
})

describe('ifFn', () => {
  it('returns true branch', () => {
    expect(ifFn(true, 'yes', 'no')).toBe('yes')
  })

  it('returns false branch', () => {
    expect(ifFn(false, 'yes', 'no')).toBe('no')
  })
})
