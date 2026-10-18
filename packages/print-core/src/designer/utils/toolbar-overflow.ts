/**
 * 顶部工具栏自适应收纳的纯计算部分：给定可用宽与各收纳单元的自然宽度，
 * 按收纳优先级链得出哪些单元应移入「更多」下拉。
 *
 * 放在框架无关内核而非某个 UI 包：canvas 与 common 两套设计器宿主必须同链同序，
 * 复制两份会出现「同一宽度下收起的分组不同」。
 */

export interface OverflowUnitInput {
  /** 单元标识，同时作为「更多」面板内落位容器的 key */
  id: string
  /** 收纳优先级：数值小者先被收进「更多」 */
  order: number
  /** 实测自然宽度（px）；<=0 表示尚未上报 */
  width: number
}

export interface ToolbarOverflowInput {
  /** 工具栏可用内容宽（px） */
  available: number
  /** 常驻不外收单元的合计宽（含其分隔） */
  pinned: number
  /** 「更多」触发钮宽度，仅在确有收纳时计入 */
  moreTriggerWidth: number
  /** flex 子项间距，与工具栏的 gap 同源 */
  gap?: number
  units: OverflowUnitInput[]
}

export interface ToolbarOverflowResult {
  /** 收纳顺序（优先级链从先到后） */
  movedIds: string[]
  /** 收纳用尽仍放不下，需由样式兜底 */
  overflowRemains: boolean
}

const DEFAULT_GAP = 2

export function resolveToolbarOverflow(input: ToolbarOverflowInput): ToolbarOverflowResult {
  const gap = input.gap ?? DEFAULT_GAP
  const chain = [...input.units].sort((a, b) => a.order - b.order)

  // 宽高度量未就绪时保守全展开：布局引擎未跑（如单测环境）或首帧未测得，
  // 此时收纳判断无意义，且可避免刷新瞬间整条工具栏塌进「更多」。
  if (input.available <= 0) return { movedIds: [], overflowRemains: false }
  if (chain.some((u) => u.width <= 0)) return { movedIds: [], overflowRemains: false }

  const fits = (moved: Set<string>) => {
    const inline = chain.filter((u) => !moved.has(u.id))
    const used = input.pinned
      + inline.reduce((sum, u) => sum + u.width + gap, 0)
      + (moved.size > 0 ? input.moreTriggerWidth + gap : 0)
    return used <= input.available
  }

  if (fits(new Set())) return { movedIds: [], overflowRemains: false }

  const moved = new Set<string>()
  for (const unit of chain) {
    moved.add(unit.id)
    if (fits(moved)) return { movedIds: [...moved], overflowRemains: false }
  }

  return { movedIds: [...moved], overflowRemains: true }
}
