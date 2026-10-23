# 属性台「恢复默认值」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给属性台中所有"出厂值可确定"的属性行，在标签行右端加一枚常驻的「恢复默认值」图标，点击后把该属性恢复到该元素类型的出厂状态。

**Architecture:** 重置目标不新增存储，而是**派生**自各层已有的单一出口——元素级取 `createDefaultOptions(type)`、单元格级取 `{}`（出厂即未设）、水印/拼版取 `WATERMARK_DEFAULTS` / `TILE_DEFAULTS`。core 注册表只加两个**纯提示字段**（行为不读），canvas 新增一个 `ResetButton.vue` 承担求值/判定/写回三件事，common 侧由 `controls.ts` 产出逐字对齐的同构 DOM。图标与样式都走 canvas → 派生脚本 → common 的单向链。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript、vitest、`lucide-vue-next`、自研 `h()` 微型 hyperscript（common）、tsup/vite。

**Spec:** [docs/superpowers/specs/2026-10-23-property-reset-default-design.md](../specs/2026-10-23-property-reset-default-design.md)（commit `c1c7827` + `8787300`）。本计划逐条对应其第一至十一节，冲突时以 spec 为准。

## 全局约束（每个任务都隐含遵守）

- **派生规则**：`F = base[propKey]`；判据 `target[propKey] === F`；动作 `target[propKey] = F`。`F` 为 `undefined` 时天然即"删键"。**绝不允许**用"值 == 渲染端默认值"判定。
- **`0` 与 `undefined` 是两个不同状态**：比较一律用 `===`，禁止 `||` / `??` 归并；common 侧不得让 `orUndef` / `optNum` 把 `0` 折成 `undefined`。
- **图标**：lucide `RotateCcw`，`viewBox="0 0 24 24"`、`fill="none"`、`stroke="currentColor"`、`stroke-width="2"`、属性台内尺寸 **13**。canvas 的 `import` 语句是**唯一真源**，**禁止手改** `packages/print-common/src/core/icons.ts`（会被派生覆盖）。
- **图标按钮禁止任何文本子节点**（含"默认"二字），提示只走 `data-tip` + `aria-label`——属性搜索与宿主验收依赖 `.pd-label` 的 `textContent`。
- **用户可见文案一律中文且不出现技术标识**：提示写「恢复默认值（10 模块）」，不得出现 `barQuietZone` / `object-position` 这类字段名。
- **common 样式与图标只能派生**：`npm run styles -w @worm-vue3-print/common`；类名与 canvas 逐字对齐。
- **跨包改动后先重建 core**：`npm run build -w @worm-vue3-print/core`，否则 canvas/common 测试读到的还是旧 dist。
- **提交信息用中文描述式，不加 Conventional 前缀**（仓库实操口径，见 CONTRIBUTING 与既有 git log）。
- **外科手术式修改**：不混入无关重构；批量改属性行**禁用宽跨度正则**，逐处 `Edit`，同文件多个 `Edit` 必须串行。
- **本期不做**（spec 第十一节）：`default-config.ts` 常量上收；纸型 / 方向 / 输出旋转 / 页边距 / 页眉页脚；拼版 `enabled` 与 `columns`；设计背景 `rotation`；格式工具栏；分组级与元素级批量恢复。

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `packages/print-canvas/src/components/property/ResetButton.vue` | 唯一的重置控件：吃 `target` / `base` / `propKey`，自己求 `F`、判灰亮、写回。不感知元素类型，不依赖 factory |
| `packages/print-canvas/src/__tests__/ResetButton.spec.ts` | 该组件的灰/亮/写回/`0` 档/`textContent` 五断言 |

**修改**

| 文件 | 改什么 |
|---|---|
| `packages/print-core/src/designer/utils/property-search.ts` | `PropertyItem` 加 `default?` / `defaultUnit?`；给 6 个属性声明数值（引用常量） |
| `packages/print-core/src/render/barcode-dot.ts` | 接收从 browser 侧迁来的 `QR_DEFAULT_QUIET_MODULES` 并导出 |
| `packages/print-core/src/browser/browser-code-renderer.ts` | 删本地常量，改 import `render/barcode-dot.js` |
| `packages/print-canvas/src/styles/native-controls.css` | `.pd-label` 加 `justify-content: space-between`；新增 `.pd-label-t`、`.pd-reset-btn` |
| `packages/print-canvas/src/components/property/{Appearance,Code,BorderBg,Advanced,TableSettings,TableCell,TableRow}Group.vue`、`CropAnchorField.vue`、`PropertyPanel.vue`、`WatermarkConfig.vue`、`TilingConfig.vue` | 逐行接入。`FontSelect.vue` 与 `BindingControl.vue` **不改**（前者图标挂在外观组的行上，后者属排除清单） |
| `packages/print-common/src/shell/controls.ts` | `field()` / `fieldHelp()` 的 `.pd-label` 改嵌套结构；新增 `resetButton()` |
| `packages/print-common/src/shell/property-panel.ts`、`table-props.ts` | 逐行接入 |
| 测试 | `print-core/…/property-search.spec.ts`、`element-factory.spec.ts`；`print-common/…/property-search.spec.ts` 及各相关 spec |

---

### Task 1: core — 注册表加纯提示字段，并把二维码静区常量迁到同构层

**Files:**
- Modify: `packages/print-core/src/designer/utils/property-search.ts`
- Modify: `packages/print-core/src/render/barcode-dot.ts`
- Modify: `packages/print-core/src/browser/browser-code-renderer.ts`
- Test: `packages/print-core/src/designer/utils/__tests__/property-search.spec.ts`

**Interfaces:**
- Consumes：无
- Produces：`PropertyItem { key: string; keywords: string[]; tip?: string; default?: number | string; defaultUnit?: string }`；`propertyDefault(key: string): { value: number | string; unit?: string } | undefined`（与既有 `propertyTip()` 同形态的取数助手）；`QR_DEFAULT_QUIET_MODULES: number`（自 `render/barcode-dot.js` 导出）

- [ ] **Step 1: 写失败测试**

在 `packages/print-core/src/designer/utils/__tests__/property-search.spec.ts` 末尾追加（该文件已 `import { PROPERTY_REGISTRY } from '../property-search.js'`）：

```ts
import { BARCODE_QUIET_ZONE_MODULES, BARCODE_BAR_HEIGHT_MODULES, BARCODE_TEXT_FONT_SIZE_MODULES, QR_DEFAULT_QUIET_MODULES } from '../../../render/barcode-dot.js'
import { DEFAULT_SHRINK_MIN_FONT_SIZE_PT } from '../../../render/text-fit.js'
import { CROP_SCALE_MIN } from '../../../render/crop-style.js'

describe('注册表 default 字段：只能是渲染端常量的引用', () => {
  const items = PROPERTY_REGISTRY.flatMap(g => g.items)
  const itemOf = (key: string) => items.find(i => i.key === key)

  it('声明了 default 的六项，数值必须等于渲染端常量本身（防止抄字面量后漂移）', () => {
    expect(itemOf('cd-bar-quiet-zone')?.default).toBe(BARCODE_QUIET_ZONE_MODULES)
    expect(itemOf('cd-bar-height')?.default).toBe(BARCODE_BAR_HEIGHT_MODULES)
    expect(itemOf('cd-font-size')?.default).toBe(BARCODE_TEXT_FONT_SIZE_MODULES)
    expect(itemOf('cd-quiet-zone')?.default).toBe(QR_DEFAULT_QUIET_MODULES)
    expect(itemOf('ap-shrink-min')?.default).toBe(DEFAULT_SHRINK_MIN_FONT_SIZE_PT)
    expect(itemOf('ap-img-fit-scale')?.default).toBe(CROP_SCALE_MIN)
  })

  it('defaultUnit 只在有数值默认的属性上出现；无 default 的项不得出现 defaultUnit', () => {
    for (const it of items) {
      if (it.defaultUnit) expect(it.default).toBeDefined()
    }
  })

  it('首行缩进与自动换行不声明 default——渲染端没有具名常量，宁可提示不带数字', () => {
    expect(itemOf('ap-long-text-indent')?.default).toBeUndefined()
    expect(itemOf('ap-word-wrap')?.default).toBeUndefined()
  })

  it('propertyDefault 与 propertyTip 同形态：未声明返回 undefined，声明了带单位', () => {
    expect(propertyDefault('no-such-key')).toBeUndefined()
    expect(propertyDefault('cd-bar-quiet-zone')).toEqual({ value: BARCODE_QUIET_ZONE_MODULES, unit: '模块' })
    expect(propertyDefault('ap-img-fit-scale')?.value).toBe(CROP_SCALE_MIN)
  })
})
```

Step 1 的 import 行同时补上助手：

```ts
import { matchKeywords, searchProperties, PROPERTY_REGISTRY, propertyDefault } from '../property-search.js'
```

（把文件顶部原有的那行 import 替换成这一行，不要新增重复 import。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/core -- src/designer/utils/__tests__/property-search.spec.ts`
Expected: FAIL —— `QR_DEFAULT_QUIET_MODULES` 不是 `render/barcode-dot.js` 的导出（`SyntaxError` 或 `undefined`），且 `default` 全部为 `undefined`。

- [ ] **Step 3: 把二维码静区常量迁到同构层**

`browser-code-renderer.ts` 第 84 行附近是 `const QR_DEFAULT_QUIET_MODULES = 0`。`designer/` 不得反向依赖 `browser/`（会拖进 DOM 相关代码），故把该常量搬到同构的 `render/barcode-dot.ts`：

在 `packages/print-core/src/render/barcode-dot.ts` 的 `BARCODE_MARGIN_BOTTOM_MODULES` 之后加：

```ts
/** 二维码静区缺省模块数：0＝码面即整张图，铺满可用框（从 browser 侧上收到同构层，供 designer 注册表引用） */
export const QR_DEFAULT_QUIET_MODULES = 0
```

在 `browser-code-renderer.ts` 中删除本地 `const QR_DEFAULT_QUIET_MODULES = 0`，改为从已有的 `render/barcode-dot.js` import 里带上该名字（该文件已在 import 条码常量；若无则在顶部 import 块补一行 `import { QR_DEFAULT_QUIET_MODULES } from '../render/barcode-dot.js'`）。

- [ ] **Step 4: 扩接口并声明数值**

`property-search.ts` 顶部加 import（与文件既有 `../types.js` 写法一致，一律带 `.js` 后缀）：

```ts
import { BARCODE_QUIET_ZONE_MODULES, BARCODE_BAR_HEIGHT_MODULES, BARCODE_TEXT_FONT_SIZE_MODULES, QR_DEFAULT_QUIET_MODULES } from '../../render/barcode-dot.js'
import { DEFAULT_SHRINK_MIN_FONT_SIZE_PT } from '../../render/text-fit.js'
import { CROP_SCALE_MIN } from '../../render/crop-style.js'
```

`PropertyItem` 接口改为：

```ts
export interface PropertyItem {
  key: string
  keywords: string[]
  /** 字段说明文案：挂在标签后的帮助图标上（悬浮/点击显示），元素台与单元格台、canvas 与 common 共用同一份 */
  tip?: string
  /** 「恢复默认值」提示语里的数值。**仅用于生成文案，重置行为不读它**——
   *  落点一律派生自该元素类型的出厂值（createDefaultOptions / WATERMARK_DEFAULTS / TILE_DEFAULTS）。
   *  必须引用渲染端既有常量，不得重抄字面量：漂移最多说错数字，不会做错动作。 */
  default?: number | string
  /** 提示语单位，如 `模块` / `mm` / `pt` */
  defaultUnit?: string
}
```

给六项补字段（`ap-shrink-min` / `ap-img-fit-scale` 在 appearance 组，`cd-*` 四项在 code 组）：

```ts
{ key: 'ap-shrink-min', keywords: [...], tip: '…', default: DEFAULT_SHRINK_MIN_FONT_SIZE_PT, defaultUnit: 'pt' },
{ key: 'ap-img-fit-scale', keywords: [...], default: CROP_SCALE_MIN, defaultUnit: '%' },
{ key: 'cd-bar-quiet-zone', keywords: [...], tip: '…', default: BARCODE_QUIET_ZONE_MODULES, defaultUnit: '模块' },
{ key: 'cd-bar-height', keywords: [...], tip: '…', default: BARCODE_BAR_HEIGHT_MODULES, defaultUnit: '模块' },
{ key: 'cd-font-size', keywords: [...], default: BARCODE_TEXT_FONT_SIZE_MODULES, defaultUnit: '模块' },
{ key: 'cd-quiet-zone', keywords: [...], default: QR_DEFAULT_QUIET_MODULES, defaultUnit: '模块' },
```

`keywords` 与 `tip` 保持原值不动，只追加新字段。

在文件末尾既有 `propertyTip()` 之后，加同形态的取数助手（接入点一律走它，不得自己翻 `PROPERTY_REGISTRY` 数组）：

```ts
/** 「恢复默认值」提示语取数：只读注册表的纯提示字段，重置行为不经过这里 */
export function propertyDefault(key: string): { value: number | string; unit?: string } | undefined {
  for (const group of PROPERTY_REGISTRY) {
    for (const item of group.items) {
      if (item.key === key && item.default !== undefined) {
        return { value: item.default, unit: item.defaultUnit }
      }
    }
  }
  return undefined
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/core`
Expected: PASS（含既有 matchKeywords / searchProperties 用例，注册表新增可选字段不应破坏任何断言）

- [ ] **Step 6: 重建 dist 供下游消费**

Run: `npm run build -w @worm-vue3-print/core`
Expected: 构建成功，无 `designer → browser` 越界告警

- [ ] **Step 7: 提交**

```bash
git add packages/print-core/src/designer/utils/property-search.ts packages/print-core/src/render/barcode-dot.ts packages/print-core/src/browser/browser-code-renderer.ts packages/print-core/src/designer/utils/__tests__/property-search.spec.ts
git commit -m "属性注册表新增 default/defaultUnit 纯提示字段，二维码静区缺省常量上收至同构层" -- packages/print-core
```

---

### Task 2: canvas — ResetButton 组件、图标引入与标签行布局

**Files:**
- Create: `packages/print-canvas/src/components/property/ResetButton.vue`
- Modify: `packages/print-canvas/src/styles/native-controls.css`
- Test: `packages/print-canvas/src/__tests__/ResetButton.spec.ts`

**Interfaces:**
- Consumes：Task 1 的 `PropertyItem.default` / `defaultUnit`（经 `propertyTip` 同源的 `PROPERTY_REGISTRY` 读取）
- Produces：组件 `ResetButton.vue`，props `{ target: Record<string, any>; base: Record<string, any>; propKey: string; tipValue?: number | string; tipUnit?: string; tipOverride?: string; write?: (value: any) => void }`，`emits: { change: [] }`，根元素 `button.pd-reset-btn`（偏离态加 `.is-dirty`）。后续所有接入任务只用它。`write` 是给**单元格组**留的口子：那里的写回必须走分组自己的整选区 `write()`，不能让组件直接改单个 cell 对象。

- [ ] **Step 1: 写失败测试**

新建 `packages/print-canvas/src/__tests__/ResetButton.spec.ts`：

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import ResetButton from '../components/property/ResetButton.vue'

function setup(target: Record<string, any>, base: Record<string, any>, extra: Record<string, unknown> = {}) {
  const t = reactive(target)
  const w = mount(ResetButton, { props: { target: t, base, propKey: 'k', ...extra } })
  return { t, w }
}

describe('ResetButton 派生规则', () => {
  it('出厂未设（base.k === undefined）且当前未设 ⇒ 灰态，点击不写回、不发 change', async () => {
    const { t, w } = setup({}, {})
    expect(w.classes()).not.toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
    expect(w.emitted('change')).toBeUndefined()
  })

  it('当前值 !== 出厂值 ⇒ 亮态，点击写回出厂值并 emit change', async () => {
    const { t, w } = setup({ k: 18 }, { k: 12 })
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBe(12)
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('出厂未设、当前设了值 ⇒ 亮态，点击写回 undefined（即删键回落）', async () => {
    const { t, w } = setup({ k: 2.5 }, {})
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
  })

  it('0 与 undefined 是两个状态：出厂 undefined、当前 0 ⇒ 亮态', async () => {
    const { t, w } = setup({ k: 0 }, {})
    expect(w.classes()).toContain('is-dirty')
    await w.trigger('click')
    expect(t.k).toBeUndefined()
  })

  it('当前值恰等于出厂值 ⇒ 灰态（键留在模板里不消失，语义上已是默认）', () => {
    const { w } = setup({ k: 12 }, { k: 12 })
    expect(w.classes()).not.toContain('is-dirty')
  })

  it('提示语：有 tipValue 带数字与单位，没有则只写「恢复默认值」', () => {
    expect(setup({}, {}, { tipValue: 10, tipUnit: '模块' }).w.attributes('data-tip')).toBe('恢复默认值（10 模块）')
    expect(setup({}, {}).w.attributes('data-tip')).toBe('恢复默认值')
    expect(setup({}, {}, { tipOverride: '恢复默认值（跟随表格默认）' }).w.attributes('data-tip')).toBe('恢复默认值（跟随表格默认）')
  })

  it('给了 write 时走 write 而不是直接改 target（单元格整选区用）', async () => {
    const seen: any[] = []
    const { t, w } = setup({ k: 5 }, { k: 7 }, { write: (v: any) => seen.push(v) })
    await w.trigger('click')
    expect(seen).toEqual([7])
    expect(t.k).toBe(5)
  })

  it('禁止文本子节点：textContent 为空，标签文本匹配不被污染', () => {
    const { w } = setup({ k: 1 }, {})
    expect(w.text()).toBe('')
    expect(w.find('svg').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/ResetButton.spec.ts`
Expected: FAIL —— 找不到模块 `../components/property/ResetButton.vue`

- [ ] **Step 3: 写组件**

新建 `packages/print-canvas/src/components/property/ResetButton.vue`：

```vue
<!-- 属性级「恢复默认值」：落点派生自该层出厂值 base[propKey]，不新增默认值存储 -->
<template>
  <button
    type="button"
    class="pd-reset-btn"
    :class="{ 'is-dirty': dirty }"
    :data-tip="tip"
    :aria-label="tip"
    @click="reset"
  ><RotateCcw :size="13" /></button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  /** 当前承载对象：element.options / cell / 水印或拼版配置对象 */
  target: Record<string, any>
  /** 该层出厂值对象。元素级传 createDefaultOptions(type)，单元格级传 {}，水印拼版传对应 DEFAULTS */
  base: Record<string, any>
  propKey: string
  /** 提示语数值：来自注册表 default，仅用于文案，不参与判定 */
  tipValue?: number | string
  tipUnit?: string
  /** 覆盖整条提示（单元格级固定用「跟随表格默认」，因为回落目标是该表自己的默认） */
  tipOverride?: string
  /** 覆盖写回通道：单元格组必须走分组自己的整选区 write()，不能让组件直接改单个 cell 对象 */
  write?: (value: any) => void
}>()

const emit = defineEmits<{ change: [] }>()

/** 出厂值：undefined 即"未设"，写回它天然等于删键 */
const factory = computed(() => props.base?.[props.propKey])

/** 判据必须用 === 比出厂值；0 与 undefined 是两个状态，不得用 ?? / || 归并 */
const dirty = computed(() => props.target?.[props.propKey] !== factory.value)

const tip = computed(() => {
  if (props.tipOverride) return props.tipOverride
  if (props.tipValue === undefined) return '恢复默认值'
  return `恢复默认值（${props.tipValue}${props.tipUnit ? ' ' + props.tipUnit : ''}）`
})

function reset() {
  if (!dirty.value) return
  if (props.write) props.write(factory.value)
  else props.target[props.propKey] = factory.value
  emit('change')
}
</script>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/ResetButton.spec.ts`
Expected: PASS，7 个用例全绿

- [ ] **Step 5: 改标签行布局与图标样式**

`packages/print-canvas/src/styles/native-controls.css` 中，`.pd-label` 现有规则是 `display: inline-flex; align-items: center; position: relative;`。改为在其后追加两行声明，并在该规则块之后新增两条规则：

```css
.pd-label {
  /* …原有声明保留… */
  justify-content: space-between;
  gap: 6px;
}
/* 标签文字与说明图标包一层：space-between 才不会把文字推到最左、图标推到最右之外 */
.pd-label-t {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
/* 「恢复默认值」：常驻，等于出厂值时置灰（灰＝没什么可恢复） */
.pd-reset-btn {
  flex: none;
  width: 15px;
  height: 15px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--pd-text-faint, #b4b9c4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color .14s ease, border-color .14s ease, background .14s ease;
}
.pd-reset-btn.is-dirty {
  color: var(--pd-text, #2a2e37);
}
.pd-reset-btn:hover {
  color: var(--pd-accent, #165DFF);
  border-color: var(--pd-accent, #165DFF);
  background: var(--pd-accent-soft, rgba(22, 93, 255, .09));
}
```

`.pd-help` 的 `margin-left: 4px` 保留不动（现在由 `.pd-label-t` 的 `gap` 承担，重复的 4px 无害且不必改）。

- [ ] **Step 6: 冒烟验证布局不塌**

Run: `npm run test -w @worm-vue3-print/canvas`
Expected: 全绿。若 `AppearanceGroup.spec.ts` / `CodeGroup.spec.ts` 里有按 `.pd-label` 结构取节点的断言，属预期变化，按新结构（`.pd-label > .pd-label-t`）就地更新，**不得改文本内容**。

- [ ] **Step 7: 提交**

```bash
git add packages/print-canvas/src/components/property/ResetButton.vue packages/print-canvas/src/__tests__/ResetButton.spec.ts packages/print-canvas/src/styles/native-controls.css
git commit -m "新增 ResetButton 属性级恢复默认值控件与标签行右端布局" -- packages/print-canvas
```

---

### Task 3: canvas — 外观组接入

**Files:**
- Modify: `packages/print-canvas/src/components/property/AppearanceGroup.vue`
- Test: `packages/print-canvas/src/__tests__/AppearanceGroup.spec.ts`

**Interfaces:**
- Consumes：Task 2 的 `ResetButton.vue`；Task 1 的 `propertyDefault()`；core 的 `createDefaultOptions(type)`（`@worm-vue3-print/core/designer` 已导出）
- Produces：外观组内每个纳入行的 DOM 形态 `<span class="pd-label"><span class="pd-label-t">…</span><button class="pd-reset-btn">…</button></span>`，后续分组照此复制

- [ ] **Step 1: 写失败测试**

在 `AppearanceGroup.spec.ts` 追加（沿用该文件已有的 mount 辅助；下例自带最小 mount，避免依赖他人辅助的命名）：

```ts
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import AppearanceGroup from '../components/property/AppearanceGroup.vue'
import { createDefaultOptions } from '@worm-vue3-print/core/designer'

function mountAppearance(type: 'text' | 'longText' | 'image', options: Record<string, any> = {}) {
  const element = reactive({
    id: 'el-t', options: { ...createDefaultOptions(type), ...options },
    printElementType: { type, title: type },
  })
  return { element, w: mount(AppearanceGroup, { props: { element, isTextType: type !== 'image' } }) }
}

const labelOf = (w: ReturnType<typeof mount>, text: string) =>
  w.findAll('.pd-field').find(f => f.find('.pd-label-t').text().includes(text))

describe('外观组「恢复默认值」', () => {
  it('字体大小：出厂 12，改成 18 后亮态，点击写回 12（不是删键）', async () => {
    const { element, w } = mountAppearance('text', { fontSize: 18 })
    const row = labelOf(w, '字体大小')!
    const btn = row.find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.fontSize).toBe(12)
  })

  it('行高：text 出厂未设 ⇒ 灰态；设成 0 仍判为已偏离（0 与 undefined 是两个状态）', () => {
    expect(labelOf(mountAppearance('text').w, '行高')!.find('.pd-reset-btn').classes()).not.toContain('is-dirty')
    expect(labelOf(mountAppearance('text', { lineHeight: 0 }).w, '行高')!.find('.pd-reset-btn').classes()).toContain('is-dirty')
  })

  it('longText 的行高出厂即 18，改成别的值才亮——同一 key 的落点随元素类型派生', async () => {
    const { element, w } = mountAppearance('longText', { lineHeight: 30 })
    const btn = labelOf(w, '行高')!.find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.lineHeight).toBe(18)
  })

  it('标签 textContent 不含"默认"二字，属性搜索的文本匹配不被图标污染', () => {
    const { w } = mountAppearance('text', { fontSize: 18 })
    for (const l of w.findAll('.pd-label')) expect(l.text()).not.toContain('默认')
  })

  it('提示语带数字：最小字号 6 pt', () => {
    const { w } = mountAppearance('text', { textFit: 'shrink' })
    expect(labelOf(w, '最小字号')!.find('.pd-reset-btn').attributes('data-tip')).toBe('恢复默认值（6 pt）')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/AppearanceGroup.spec.ts`
Expected: FAIL —— `labelOf` 取不到 `.pd-label-t`（该结构尚不存在）

- [ ] **Step 3: 逐行接入**

`AppearanceGroup.vue` 顶部 import 块补两行：

```ts
import ResetButton from './ResetButton.vue'
import { createDefaultOptions, propertyDefault } from '@worm-vue3-print/core/designer'
```

> 注意：该文件第 109 行已从 `@worm-vue3-print/core/designer` 有一行 import，把 `createDefaultOptions`、`propertyDefault` **合并进那一行**，不要新增重复 import 语句。

在 `props` 定义之后加两个共用派生量（整组复用，避免每行重复调用）：

```ts
/** 该元素类型的出厂 options——所有「恢复默认值」的落点都从这里派生 */
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type as any))
const def = (key: string) => propertyDefault(key)
```

然后按下表逐行改造。**每行只做两件事**：把原 `<span class="pd-label">文字</span>` 包一层 `.pd-label-t`，并在其后、`.pd-label` 闭合前插入 `ResetButton`。

| 行 | `prop-key` | `tipValue` / `tipUnit` 来源 | 备注 |
|---|---|---|---|
| 字体 | `ap-font-family` | 无 | 出厂未设 |
| 字体大小 | `ap-font-size` | 无 | 出厂 `12`（写回字面值） |
| 字体粗细 | `ap-font-weight` | 无 | |
| 对齐 | `ap-align` | 无 | 出厂 `'left'` |
| 垂直对齐 | `ap-vertical-align` | 无 | |
| 颜色 / 背景色 | `ap-color` / `ap-bg-color` | 无 | 两行各挂一个 |
| 行高 | `ap-line-height` | 无 | 出厂随类型：text 未设 / longText `18` |
| 字间距 | `ap-letter-spacing` | 无 | |
| 文字溢出 | `ap-text-fit` | 无 | |
| 最小字号 (pt) | `ap-shrink-min` | 注册表 | 提示带 `6 pt` |
| 首行缩进 (字符) | `ap-long-text-indent` | 无 | 不声明 default |
| 自动换行 | `ap-word-wrap` | 无 | |
| 缩放模式 | `ap-img-fit` | 无 | 出厂 `'contain'` |
| 裁剪倍率（`CropAnchorField` 内） | `ap-img-fit-scale` | 注册表 | 见 Step 4 |

三个完整示例（其余照此机械改）：

```html
<!-- 无说明图标的行 -->
<div class="pd-field" v-show="showItem('ap-font-size')"><span class="pd-label"><span class="pd-label-t">字体大小</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="fontSize" :tip-value="def('ap-font-size')?.value" :tip-unit="def('ap-font-size')?.unit" />
</span>
  <StepperInput v-model="element.options.fontSize" :min="8" :max="72" />
</div>

<!-- 带 ? 说明的行：说明留在 .pd-label-t 内，图标在其后 -->
<div class="pd-field" v-show="showItem('ap-shrink-min')"><span class="pd-label"><span class="pd-label-t">最小字号 (pt)</span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="shrinkMinFontSize" :tip-value="def('ap-shrink-min')?.value" :tip-unit="def('ap-shrink-min')?.unit" />
</span>
  <StepperInput :model-value="element.options.shrinkMinFontSize" :min="1" :max="72" :step="0.5" placeholder="默认 6"
    @update:model-value="element.options.shrinkMinFontSize = $event ?? undefined" />
</div>
```

**注意 `prop-key` 的两种含义**：`prop-key` 传给 `ResetButton` 的是 **`options` 上的字段名**（如 `shrinkMinFontSize`），而 `showItem()` / `propertyDefault()` 用的是**注册表键**（如 `ap-shrink-min`）。两者不要混。

- [ ] **Step 4: 裁剪倍率行（在 CropAnchorField 内）**

`packages/print-canvas/src/components/property/CropAnchorField.vue` 第 16 行附近的倍率 `StepperInput` 所属 `.pd-field`，同样包 `.pd-label-t` 并挂 `ResetButton`，`prop-key` 为 `fitScale`、`tip-value` 走 `propertyDefault('ap-img-fit-scale')`。`base` 由该组件的调用方（外观组）以 prop 传入 `factoryOptions`，避免子组件重复 import factory。

- [ ] **Step 5: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/AppearanceGroup.spec.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add packages/print-canvas/src/components/property/AppearanceGroup.vue packages/print-canvas/src/components/property/CropAnchorField.vue packages/print-canvas/src/__tests__/AppearanceGroup.spec.ts
git commit -m "外观组逐行接入「恢复默认值」：落点派生自该元素类型出厂值" -- packages/print-canvas
```

---

### Task 4: canvas — 条码组、高级组、表格设置组接入

**Files:**
- Modify: `packages/print-canvas/src/components/property/CodeGroup.vue`
- Modify: `packages/print-canvas/src/components/property/AdvancedGroup.vue`
- Modify: `packages/print-canvas/src/components/property/TableSettingsGroup.vue`
- Test: `packages/print-canvas/src/__tests__/CodeGroup.spec.ts`、`TableSettingsGroup.spec.ts`

**Interfaces:**
- Consumes：Task 2 组件、Task 1 `propertyDefault()`、`createDefaultOptions`
- Produces：带 `emitChange()` 链的接入写法（条码组有 `change` 事件，其余两组直接改 reactive）

- [ ] **Step 1: 写失败测试**

在 `CodeGroup.spec.ts` 追加（沿用该文件已有的 `makeElement` / `mountCodeGroup`）：

```ts
describe('条码组「恢复默认值」', () => {
  it('静区：出厂未设⇒灰态；设 4 后亮态，点击写回 undefined 并通知变更', async () => {
    const element = makeElement('barcode', { barQuietZone: 4 })
    const w = mountCodeGroup(element)
    const row = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes('静区'))!
    const btn = row.find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    expect(btn.attributes('data-tip')).toBe('恢复默认值（10 模块）')
    await btn.trigger('click')
    expect(element.options.barQuietZone).toBeUndefined()
    expect(w.emitted('change')).toHaveLength(1)
  })

  it('条宽：出厂未设，步进到 2（等于渲染回落值）仍判为已偏离', async () => {
    const element = makeElement('barcode', { barWidth: 2 })
    const w = mountCodeGroup(element)
    const btn = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes('条宽'))!.find('.pd-reset-btn')
    expect(btn.classes()).toContain('is-dirty')
    await btn.trigger('click')
    expect(element.options.barWidth).toBeUndefined()
  })

  it('码制行不挂图标（决定"这是什么元素"，不是样式默认值）', () => {
    const w = mountCodeGroup(makeElement('barcode', {}))
    const row = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes('码制'))!
    expect(row.find('.pd-reset-btn').exists()).toBe(false)
  })
})
```

在 `TableSettingsGroup.spec.ts` 追加：

```ts
it('表格默认字号：出厂 10，改成 14 后点击写回 10（删键会掉进 CSS 继承，故必须写字面值）', async () => {
  const element = makeTable('table', { tableDefaultFontSize: 14 })
  const w = mountTableSettings(element)
  const btn = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes('默认字号'))!.find('.pd-reset-btn')
  await btn.trigger('click')
  expect(element.options.tableDefaultFontSize).toBe(10)
})

it('数据源字段与列宽两组不挂图标', () => {
  const w = mountTableSettings(makeTable('table', {}))
  for (const t of ['列表数据源字段', '列宽']) {
    expect(w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes(t))!.find('.pd-reset-btn').exists()).toBe(false)
  }
})
```

> 若 `TableSettingsGroup.spec.ts` 尚无 `makeTable` / `mountTableSettings` 辅助，照 `CodeGroup.spec.ts` 的 `makeElement` 写法在文件内补一个，options 用 `{ ...createDefaultOptions('table'), ...options }` 起手——**必须带出厂值**，否则 `base` 与 `target` 对不上。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/CodeGroup.spec.ts src/__tests__/TableSettingsGroup.spec.ts`
Expected: FAIL —— `.pd-label-t` 不存在

- [ ] **Step 3: 条码组接入**

`CodeGroup.vue` import 块补 `ResetButton`，并把 `createDefaultOptions`、`propertyDefault` 合并进已有的 `@worm-vue3-print/core/designer` import；在 `props` 之后加与 Task 3 同名的两个派生量：

```ts
const factoryOptions = computed(() => createDefaultOptions(props.element.printElementType.type as any))
const def = (key: string) => propertyDefault(key)
```

逐行改造（`options` 字段名 ≠ 注册表键，右列已标明）：

| 行 | 注册表键 | `prop-key` | 挂图标 | 提示数值 |
|---|---|---|---|---|
| 码制 | `cd-type` | — | **否** | 排除项 |
| 打印机分辨率 | `cd-dpi` | `dpi` | 是 | 无 |
| 条宽（倍率） | `cd-bar-width` | `barWidth` | 是 | 无 |
| 静区 (模块) | `cd-bar-quiet-zone` | `barQuietZone` | 是 | 注册表 `10 模块` |
| 条高 (mm) | `cd-bar-height` | `barHeight` | 是 | 注册表 `30 模块` |
| 显示文本 | `cd-show-text` | `hideTitle` | 是 | 无 |
| 文本字号 | `cd-font-size` | `fontSize` | 是 | 注册表 `10 模块` |
| 二维码：纠错级别 | `cd-ec-level` | `qrCodeLevel` | 是 | 无 |
| 二维码：静区 | `cd-quiet-zone` | `qrQuietZone` | 是 | 注册表 `0 模块` |
| 自定义设置：最大宽/高 | `cd-max-width` / `cd-max-height` | `maxWidth` / `maxHeight` | 是 | 无 |

条码组的行改完后必须带 `@change="emitChange()"`，与既有写回链一致：

```html
<div class="pd-field" v-show="showItem('cd-bar-quiet-zone')"><span class="pd-label"><span class="pd-label-t">静区 (模块)<button type="button" class="pd-help" :data-tip="barQuietTip" aria-label="字段说明" /></span>
  <ResetButton :target="element.options" :base="factoryOptions" prop-key="barQuietZone" :tip-value="def('cd-bar-quiet-zone')?.value" :tip-unit="def('cd-bar-quiet-zone')?.unit" @change="emitChange()" />
</span>
  <StepperInput :model-value="element.options.barQuietZone" :min="0" :max="20" placeholder="默认 10"
    @update:model-value="element.options.barQuietZone = $event ?? undefined; emitChange()" />
</div>
```

- [ ] **Step 4: 高级组与表格设置组接入**

`AdvancedGroup.vue`：锁定 `locked`、每页重复 `fixed`、层级 `zIndex` 三行接入（`ad-delete` 那行不挂）；该组件无 `change` 事件，省掉 `@change`。

`TableSettingsGroup.vue`：默认字体 `tableDefaultFontFamily`、默认字号 `tableDefaultFontSize`、默认文字颜色 `tableDefaultColor`、默认内边距 `tableDefaultPadding` 四行接入；「列表数据源字段」与「列宽 (mm)」两行**不挂**。提示数值均不声明（出厂值本身就是数字，`base` 已含）。

- [ ] **Step 5: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/canvas`
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add packages/print-canvas/src/components/property packages/print-canvas/src/__tests__
git commit -m "条码/高级/表格设置三组接入「恢复默认值」，码制与数据源与列宽按排除清单不挂" -- packages/print-canvas
```

---

### Task 5: canvas — 边框背景组、单元格组接入（整选区写回）

**Files:**
- Modify: `packages/print-canvas/src/components/property/BorderBgGroup.vue`
- Modify: `packages/print-canvas/src/components/property/TableCellGroup.vue`
- Test: `packages/print-canvas/src/__tests__/TableCellGroup.spec.ts`、`BorderBgGroup.spec.ts`

> **`TableRowGroup.vue` 已撤出本任务**，理由见本任务 Step 5 末段。

**Interfaces:**
- Consumes：Task 2 组件的 `write` prop、`tipOverride`
- Produces：单元格组的「整选区恢复」写法，以及单元格提示语固定文案 `恢复默认值（跟随表格默认）`

- [ ] **Step 1: 先枚举三个分组的属性行，再动手**

Run:
```bash
cd packages/print-canvas/src/components/property
grep -n 'class="pd-label"' BorderBgGroup.vue TableRowGroup.vue TableCellGroup.vue
```
把输出行号与下表逐一对齐后再改。**表里没有的行不动**（避免误挂排除项）。

- [ ] **Step 2: 写失败测试**

`TableCellGroup.spec.ts` 已有 `makeElement(cell)`（造一张 `tableColWidths:[50]`、单行单格的表）与 `mountGroup(element)`（selection 固定 `{ elementId:'el-table', r1:0,c1:0,r2:0,c2:0 }`）。**复用它们**，只补一个跨格挂载与一个取行辅助：

```ts
/** 取指定标签文本的属性行；接入后标签文字在 .pd-label-t 内 */
function rowOf(w: ReturnType<typeof mountGroup>, text: string) {
  const row = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes(text))
  if (!row) throw new Error(`未找到属性行：${text}`)
  return row
}

/** 单行三格、选区覆盖全部三格 */
function mountCells(cells: Partial<TableCell>[]) {
  const element = reactive({
    id: 'el-table',
    options: {
      tableColWidths: cells.map(() => 50),
      tableRows: [{ id: 'r1', type: 'data', height: 10, cells: cells.map((c, i) => ({ id: `c${i + 1}`, ...c })) }],
    },
    printElementType: { type: 'table', title: '表格' },
  }) as unknown as RuntimeElement
  return mount(TableCellGroup, {
    props: { element, selection: { elementId: 'el-table', r1: 0, c1: 0, r2: 0, c2: cells.length - 1 }, fields: [] },
    global: { provide: { [TABLE_EDIT_KEY as symbol]: { tableSelection: { value: null }, setTableSelection: () => {}, recordHistory: () => {} } } },
  })
}

describe('单元格「恢复默认值」', () => {
  it('字号提示不带数字，固定「跟随表格默认」', () => {
    expect(rowOf(mountGroup(makeElement({ fontSize: 14 })), '字号').find('.pd-reset-btn').attributes('data-tip'))
      .toBe('恢复默认值（跟随表格默认）')
  })

  it('点击走整选区写回：三格字号一起回到未设（回落表格级默认）', async () => {
    const w = mountCells([{ fontSize: 14 }, { fontSize: 14 }, { fontSize: 9 }])
    await rowOf(w, '字号').find('.pd-reset-btn').trigger('click')
    const cells = (w.props('element') as any).options.tableRows[0].cells
    expect(cells.every((c: any) => c.fontSize === undefined)).toBe(true)
  })

  it('边框草稿态不挂图标（不是模板属性）', () => {
    const w = mountGroup(makeElement({}))
    for (const t of ['边框样式', '边框宽度', '边框颜色']) {
      expect(rowOf(w, t).find('.pd-reset-btn').exists()).toBe(false)
    }
  })
})
```

> 若 `rowOf` 在「边框样式」上抛 `未找到属性行`，说明该行的标签文字与预期不同——以 `grep -n 'class="pd-label"' TableCellGroup.vue` 的实际文字为准调整用例里的字符串，**不要为了过测试去改标签文案**。

- [ ] **Step 3: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/TableCellGroup.spec.ts`
Expected: FAIL —— 无 `.pd-reset-btn`

- [ ] **Step 4: 单元格组接入**

`TableCellGroup.vue` 的 `props` 之后加两个共用量：

```ts
/** 单元格出厂即"未设"：任何键的落点都是 undefined ⇒ 回落到该表格自己的表格级默认 */
const CELL_FACTORY: Record<string, any> = {}
const CELL_TIP = '恢复默认值（跟随表格默认）'
```

每行的写法（`target` 传**当前展示用的首个选中格** `cell0`，写回走分组自己的 `write()`，二者缺一不可）：

```html
<div class="pd-field"><span class="pd-label"><span class="pd-label-t">字号 (pt)</span>
  <ResetButton :target="cell0" :base="CELL_FACTORY" prop-key="fontSize" :tip-override="CELL_TIP"
    :write="(v) => write(c => { c.fontSize = v })" />
</span>
  <StepperInput :model-value="cell0.fontSize" :min="0" :max="72" placeholder="默认"
    @update:model-value="write(c => { c.fontSize = $event ?? undefined })" />
</div>
```

需接入的单元格键共 **24 项**（`prop-key` 用 cell 上的真实字段名；原计划写"九项"是严重低估，已按源码 `c.*` 全量对账更正）：

`align`、`valign`、`fontFamily`、`fontSize`、`fontWeight`、`color`、`backgroundColor`、`textFit`、`shrinkMinFontSize`、`wordWrap`、`padding`、`fit`、`objectPosition`、`fitScale`、`maxWidth`、`maxHeight`、`printerDpi`、`barWidth`、`barQuietZone`、`barHeight`、`barFontSize`、`showBarcodeText`、`qrCodeLevel`、`qrQuietZone`。

**不接入 4 项**：`cellType`（单元格类型，决定"这格是什么"）、`barcodeType`（码制）、`formatter`（内容表达式）、`borders`（边框结构与草稿态）。

两处必须注意的字段名差异，元素级与单元格级**不同名**，不要照抄：

| 语义 | 元素级 `options` | 单元格级 `cell` |
|---|---|---|
| 显示文本 | `hideTitle`（反义：`!== true` 为显示） | `showBarcodeText`（正义） |
| 条码文本字号 | `fontSize` | `barFontSize` |

`showBarcodeText` 的极性**已开源码核实**（原列为实施期待验证项，现关闭）：单元格侧按 `!== false` 读，**未设即"显示"**——`TableElement.vue` 传 `:show-text="cell.showBarcodeText !== false"`，`TableCellGroup.vue` 的复选框也是 `:checked="mainCell.showBarcodeText !== false"`，`CellBarcode.vue` 注释明确"缺省视为显示"。因此删键回到出厂态是安全的，不会把文本关掉。

但**元素级与单元格级的键根本不同名也不同极性**：元素级走 `hideTitle`（反义，`!== true` 为显示），单元格级走 `showBarcodeText`（正义）。`html-generator.ts` 的 `showText: opts.hideTitle !== undefined ? !opts.hideTitle : opts.showBarcodeText` 一行同时读两者，是元素路径的合并口径。实施时两处的恢复动作必须分别落在自己的键上，**写串会让一格条码文本永久消失**——给这两行各留一条"恢复后复选框状态与出厂一致"的断言。

- [ ] **Step 5: 边框背景组接入**

`BorderBgGroup.vue`：线型 `borderStyle`（勘误 E-3）、边框宽度 `borderWidth`、边框颜色 `borderColor`、背景色 `backgroundColor` 四行接入，`base` 用 `createDefaultOptions(element.printElementType.type)`（矩形/椭圆的 `borderWidth`、`borderColor` 出厂即 `1` / `#333`，会自动走写回；`borderStyle` 出厂未设 ⇒ 删键）；「无边框 / 单边」这类**预设按钮行不挂**。注意该文件 `.pd-field` 有嵌套，测试辅助要先判直接命中。

**`TableRowGroup.vue` 整组撤出本期**（原计划写"行高接入，base 取 createDefaultTable() 行高 8"，经核实是错的）：

- `insertRow` 用 `height: ref.height` 让新行**继承相邻行**（`table-matrix.ts`），行高没有统一出厂值——按索引回查 factory 会把作者插入的行错误重置成 8mm。
- `repeatOnPage` 表头行出厂 `true`、数据行未设；`type` 出厂由行位置决定。
- 派生规则的前提是"该层存在单一出厂对象"，行层不满足。

撤出后 Task 5 只剩 `BorderBgGroup` 与 `TableCellGroup` 两个文件，本任务的测试步骤里删去行组相关用例。

- [ ] **Step 6: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/canvas`
Expected: 全绿

- [ ] **Step 7: 提交**

```bash
git add packages/print-canvas/src/components/property packages/print-canvas/src/__tests__
git commit -m "边框背景/表格行/单元格接入「恢复默认值」，单元格走整选区写回且提示不带数字" -- packages/print-canvas
```

---

### Task 6: canvas — 水印、拼版接入与页面背景色换图标

**Files:**
- Modify: `packages/print-canvas/src/components/WatermarkConfig.vue`
- Modify: `packages/print-canvas/src/components/property/TilingConfig.vue`
- Modify: `packages/print-canvas/src/components/PropertyPanel.vue`
- Test: `packages/print-canvas/src/__tests__/TilingConfig.spec.ts`（无则新建）、`PropertyPanel-multipage.spec.ts` 或新建 `PropertyPanel-pagebg.spec.ts`

**Interfaces:**
- Consumes：`WATERMARK_DEFAULTS`（`@worm-vue3-print/core` 根入口）、`TILE_DEFAULTS`（同上）
- Produces：页面背景色行的文字按钮「默认」消失，改为同一枚图标

- [ ] **Step 1: 写失败测试**

```ts
it('拼版间距 gapX：改成非出厂值后亮态，点击写回 TILE_DEFAULTS.gapX', async () => {
  const cfg = reactive({ ...TILE_DEFAULTS, gapX: 6 })
  const w = mount(TilingConfig, { props: { modelValue: cfg } })
  const btn = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes('水平间距'))!.find('.pd-reset-btn')
  expect(btn.classes()).toContain('is-dirty')
  await btn.trigger('click')
  expect(cfg.gapX).toBe(TILE_DEFAULTS.gapX)
})

it('拼版开关 enabled 与列数 columns 不挂图标（两处口径不一致，本期延后）', () => {
  const w = mount(TilingConfig, { props: { modelValue: reactive({ ...TILE_DEFAULTS }) } })
  for (const t of ['每行列数', '启用拼版']) {
    const row = w.findAll('.pd-field').find(f => f.find('.pd-label-t')?.text().includes(t))
    expect(row?.find('.pd-reset-btn').exists() ?? false).toBe(false)
  }
})
```

页面背景色行——照 `CodeGroup.spec.ts` 里 `mount(PropertyPanel, { props: { element, templateData, fields: [], activeTab, collapsed } })` 的既有写法，把 `activeTab` 换成 `'page'` 即可（`element` 传一个文本元素占位，`templateData` 用该文件同款 `tpl()` 并带上 `pageBackground`）：

```ts
it('页面背景色：文字按钮「默认」已换成图标；设过颜色后亮态并可恢复', async () => {
  const w = mount(PropertyPanel, {
    props: {
      element: makeElement('text'),
      templateData: { ...tpl(), pageBackground: '#ff0000' },
      fields: [], activeTab: 'page', collapsed: false,
    },
  })
  const btn = w.find('.page-bg-row .pd-reset-btn')
  expect(btn.exists()).toBe(true)
  expect(w.find('.page-bg-row').text()).not.toContain('默认')   // 文字按钮彻底消失
  expect(btn.classes()).toContain('is-dirty')
  await btn.trigger('click')
  expect((w.emitted('update')?.at(-1)?.[0] as any).pageBackground).toBeUndefined()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm run test -w @worm-vue3-print/canvas -- src/__tests__/TilingConfig.spec.ts`
Expected: FAIL

- [ ] **Step 3: 水印与拼版接入**

`WatermarkConfig.vue`：`base` 直接用已 import 的 `WATERMARK_DEFAULTS`，接入 `color` / `opacity` / `rotate` / `tileWidth` / `tileHeight` 五行；写回走该组件既有的 patch 通道（若组件是 `emit('update:modelValue')` 语义，则给 `ResetButton` 传 `:write`，在回调里 emit 合并后的新对象——**不要直接改 props 里的对象**）。

`TilingConfig.vue`：`base` 用已 import 的 `TILE_DEFAULTS`，接入 `sheetPaperSize` / `sheetOrientation` / `sheetMargin` 四边 / `gapX` / `gapY`；**`enabled` 与 `columns` 不接入**（spec 第十一节）。

- [ ] **Step 4: 页面背景色换图标**

`PropertyPanel.vue` 页面属性区那一行（现为 `<button type="button" class="pd-reset" title="恢复为默认白色" @click="onPageBackgroundReset">默认</button>`）改为：

```html
<div class="pd-field"><span class="pd-label"><span class="pd-label-t">页面背景色</span>
  <ResetButton :target="{ pageBackground: pageBackgroundModel }" :base="{ pageBackground: undefined }" prop-key="pageBackground" @change="onPageBackgroundReset" />
</span>
```

**更稳妥的写法**：`ResetButton` 只负责显隐与提示，写回仍交给既有 `onPageBackgroundReset()`——给它传 `:write="() => onPageBackgroundReset()"`，`target` / `base` 仅用于判定：

```html
<ResetButton :target="{ pageBackground: pageBackgroundModel }" :base="{ pageBackground: undefined }"
  prop-key="pageBackground" :write="() => onPageBackgroundReset()" />
```

同时删掉 `.pd-reset` 的 CSS 规则（`PropertyPanel.vue` 的 `<style scoped>` 内，约在 `.page-bg-row` 之后），以及 common 侧派生出来的同名规则会随 `npm run styles` 自动消失。**保留 `.page-bg-row` 与 `.page-bg-picker`**（布局仍需要）。

- [ ] **Step 5: 跑测试确认通过**

Run: `npm run test -w @worm-vue3-print/canvas`
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add packages/print-canvas/src/components
git commit -m "水印与拼版接入恢复默认值，页面背景色文字按钮统一换成图标" -- packages/print-canvas
```

---

### Task 7: common — 同构接入与样式/图标派生

**Files:**
- Modify: `packages/print-common/src/shell/controls.ts`
- Modify: `packages/print-common/src/shell/property-panel.ts`
- Modify: `packages/print-common/src/shell/table-props.ts`
- Modify（派生产物）: `packages/print-common/src/core/icons.ts`、`packages/print-common/src/styles/designer.css`
- Test: `packages/print-common/src/shell/__tests__/property-search.spec.ts`

**Interfaces:**
- Consumes：canvas 已构建的 `dist/canvas.css`（`gen-styles.mjs` 的输入）、Task 1 的 `propertyDefault`
- Produces：`resetButton(opts)` 助手；`field()` / `fieldHelp()` 的新 `.pd-label` 结构

- [ ] **Step 1: 先构建 canvas，让新样式进入派生输入**

Run: `npm run build -w @worm-vue3-print/canvas`
Expected: 成功产出 `packages/print-canvas/dist/canvas.css`，其中含 `.pd-reset-btn` 规则

- [ ] **Step 2: 改 controls.ts 的行结构与新增助手**

`field()` 与 `fieldHelp()` 的 `.pd-label` 改为嵌套结构（`textContent` 必须与改前完全一致）：

```ts
/** 属性行：pd-field > pd-label(.pd-label-t + 恢复默认值) + 控件 */
export function field(label: string, control: unknown, hint?: string, reset?: unknown) {
  return h('div', { class: 'pd-field' }, [
    h('span', { class: 'pd-label' }, [h('span', { class: 'pd-label-t', text: label }), reset ?? '']),
    control,
    hint ? h('p', { class: 'pd-hint', text: hint }) : '',
  ].filter(Boolean) as never)
}

export function fieldHelp(label: string, control: unknown, tip: string, reset?: unknown) {
  return h('div', { class: 'pd-field' }, [
    h('span', { class: 'pd-label' }, [h('span', { class: 'pd-label-t' }, [label, labelHelp(tip)]), reset ?? '']),
    control,
  ])
}
```

新增与 canvas `ResetButton.vue` 逐字同构的按钮助手（灰/亮在每次 paint 时求值，common 本来就是全量重绘）：

```ts
/** 「恢复默认值」：落点派生自 base[propKey]，与 canvas 的 property/ResetButton.vue 同一判据 */
export function resetButton(o: {
  target: Record<string, any>, base: Record<string, any>, propKey: string,
  tipValue?: number | string, tipUnit?: string, tipOverride?: string,
  onReset?: () => void,
}) {
  const f = o.base?.[o.propKey]
  const dirty = o.target?.[o.propKey] !== f
  const tip = o.tipOverride ?? (o.tipValue === undefined ? '恢复默认值'
    : `恢复默认值（${o.tipValue}${o.tipUnit ? ' ' + o.tipUnit : ''}）`)
  return h('button', {
    type: 'button', class: `pd-reset-btn${dirty ? ' is-dirty' : ''}`,
    'data-tip': tip, 'aria-label': tip, html: iconSvg('RotateCcw', 13),
    onClick: () => { if (!dirty) return; o.target[o.propKey] = f; o.onReset?.() },
  })
}
```

- [ ] **Step 3: 跑派生，让图标与样式进 common**

Run: `npm run styles -w @worm-vue3-print/common`
Expected: `src/core/icons.ts` 出现 `RotateCcw` 键；`src/styles/designer.css` 出现 `.pd-reset-btn` 规则

Run: `node demo-common/scripts/class-audit.mjs`
Expected: 无"派生 CSS 有规则但本包源码无挂点"报告

- [ ] **Step 4: 逐行接入两个构造器**

`property-panel.ts`：元素台各行调用 `field(...)` / `fieldHelp(...)` 处补第 4 个实参 `resetButton({ target: o, base: createDefaultOptions(type), propKey: 'fontSize', ...propertyDefaultArgs('ap-font-size') })`，其中：

```ts
/** 把注册表的纯提示字段摊平成 resetButton 的两个入参 */
const propertyDefaultArgs = (key: string) => {
  const d = propertyDefault(key)
  return d ? { tipValue: d.value, tipUnit: d.unit } : {}
}
```

`table-props.ts`：表格级默认四项 `base` 用 `createDefaultOptions('table')`；单元格九项 `base` 用 `{}`、`tipOverride: '恢复默认值（跟随表格默认）'`、`onReset` 走该文件既有的整选区写回函数。

**排除清单与延后项照 spec 第七节与第十一节，一处不多一处不少。** common 侧特别注意：`orUndef` / `optNum` 不得作为 `target` 的取值方式（会把 `0` 折成 `undefined`），要直接读原始对象字段。

- [ ] **Step 5: 更新 DOM 签名断言并跑测试**

Run: `npm run test -w @worm-vue3-print/common -- src/shell/__tests__/property-search.spec.ts`
Expected: 先 FAIL（`.pd-label` 结构变了）→ 把该文件里取标签文本的断言改走 `.pd-label-t`（**文本内容不得改**），再跑至 PASS

Run: `npm run test -w @worm-vue3-print/common`
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add packages/print-common/src
git commit -m "common 同构接入恢复默认值图标并派生 RotateCcw 图标与样式，DOM 签名断言随结构更新" -- packages/print-common
```

---

### Task 8: 出纸回归、全量构建与四宿主实看

**Files:**
- Test: `packages/print-core/src/render/__tests__/`（新建 `reset-default-parity.test.ts`）
- Test: `packages/print-core/src/designer/utils/__tests__/element-factory.spec.ts`

**Interfaces:**
- Consumes：Task 1–7 全部产物
- Produces：派生规则的核心承诺——**恢复到出厂值后的渲染结果，与新建出厂模板逐字节相同**

- [ ] **Step 1: 写渲染一致性回归测试**

新建 `packages/print-core/src/render/__tests__/reset-default-parity.test.ts`。夹具照 `typography-issue4.test.ts` 的 `renderOne`（固定 `el-1`、固定版面，输出天然确定）：

```ts
// print-core/src/render/__tests__/reset-default-parity.test.ts
// 「恢复默认值」落纸契约：恢复到出厂值后，渲染结果必须与新建出厂模板逐字节相同
import { describe, it, expect } from 'vitest'
import { generateHtml } from '../html-generator.js'
import { createDefaultOptions } from '../../designer/utils/element-factory.js'
import type { ElementType, PageLayout, TemplateData } from '../types.js'

function renderOne(type: ElementType, options: Record<string, any>): string {
  const template: TemplateData = {
    paperSize: 'A4', orientation: 'portrait',
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    header: { height: 0, elements: [] }, footer: { height: 0, elements: [] },
    elements: [{ id: 'el-1', type, options: { left: 0, top: 0, width: 60, height: 20, ...options } } as any],
  }
  const layouts: PageLayout[] = [{ pageIndex: 0, sections: [{ elementId: 'el-1', type: 'element' }] }]
  return generateHtml(template, layouts, {})
}

/** 模拟 ResetButton 的写回动作：把 dirty 里每个键恢复成该类型的出厂值 */
function restore(type: ElementType, dirty: Record<string, any>): string {
  const factory = createDefaultOptions(type) as Record<string, any>
  const restored = { ...factory, ...dirty }
  for (const k of Object.keys(dirty)) restored[k] = factory[k]
  return renderOne(type, restored)
}

describe('恢复默认值 ⇒ 与出厂模板同形', () => {
  it.each([
    ['text', { fontSize: 18, lineHeight: 2, letterSpacing: 1 }],
    ['longText', { lineHeight: 30, longTextIndent: 2 }],
    ['image', { fit: 'cover', fitScale: 250, objectPosition: '30% 70%' }],
    ['barcode', { barWidth: 4, barQuietZone: 0, barHeight: 60, fontSize: 20 }],
    ['qrcode', { qrQuietZone: 4, qrCodeLevel: 'H' }],
    ['table', { tableDefaultFontSize: 14, tableDefaultColor: '#ff0000', tableDefaultPadding: 3 }],
  ] as const)('%s 偏离后恢复，落纸等于出厂模板', (type, dirty) => {
    expect(restore(type, { ...dirty })).toBe(renderOne(type, createDefaultOptions(type) as Record<string, any>))
  })

  it('反面对照：不恢复时确实不同——证明断言不是恒真', () => {
    expect(renderOne('text', { ...(createDefaultOptions('text') as any), fontSize: 18 }))
      .not.toBe(renderOne('text', createDefaultOptions('text') as Record<string, any>))
  })
})
```

> 那条**反面对照是必需的**：如果脏值和出厂值渲染结果本来就一样，上面的 `toBe` 会假绿。

- [ ] **Step 2: 跑测试**

Run: `npm run test -w @worm-vue3-print/core -- src/render/__tests__/reset-default-parity.test.ts`
Expected: PASS。若 `table` 那条 FAIL，说明 `tableDefaultFontSize` / `Color` 的写回被误做成了删键——回到 Task 4 检查 `base` 是否真的来自 `createDefaultOptions('table')`。

- [ ] **Step 3: 钉住"出厂值即落点"的耦合**

在 `element-factory.spec.ts` 追加：

```ts
it('出厂默认值即「恢复默认值」落点：改动这些键必须同步 spec 与提示语', () => {
  expect(createDefaultOptions('text')).toMatchObject({ fontSize: 12, textAlign: 'left' })
  expect(createDefaultOptions('longText')).toMatchObject({ fontSize: 12, lineHeight: 18 })
  expect(createDefaultOptions('image')).toMatchObject({ fit: 'contain' })
  expect(createDefaultOptions('table')).toMatchObject({ tableDefaultFontSize: 10, tableDefaultColor: '#333333', tableDefaultPadding: 1 })
})
```

Run: `npm run test -w @worm-vue3-print/core`
Expected: 全绿

- [ ] **Step 4: 渲染服务与客户端回归**

Run: `npm run test -w @worm-vue3-print/render`
Expected: 全绿（spec 验收清单要求）

- [ ] **Step 5: 全量构建**

Run: `npm run build`
Expected: 六个包全部成功

- [ ] **Step 6: 浏览器实看（不可省略，渲染类问题看图才算证据）**

起 canvas demo 与 demo-common 四宿主（`demo-common` 不在 root workspaces，走根脚本起），按下列清单逐项看：

1. 选中文本元素 → 外观组每行右侧都有图标；刚新建的元素**全灰**。
2. 把字号从 12 改成 18 → 该行图标变蓝；点击 → 回到 12 且图标变灰。
3. 悬停图标 → 气泡文案为「恢复默认值」或「恢复默认值（10 模块）」，**不出现字段名**。
4. 长标签行（「文本字号（相对条高，条高为 30）」）在 280px 面板下不把 `?` 挤到第二行。
5. 搜「字体」→ 结果列表与改前一致（验证 `textContent` 未被污染）。
6. common 四宿主各看一遍：图标**不是空白**（`iconSvg` 未命中会静默返回空串，这是最容易漏的红灯）。
7. 表格：选中多个单元格 → 点字号图标 → 全部格子的字号回到表级默认。
8. 页面页签：背景色那行是图标而非文字「默认」；纸型/页边距等行**没有**图标。

- [ ] **Step 7: 同步文档并提交**

按仓库惯例更新 `docs/中文/CHANGELOG.md` 与 `docs/en/CHANGELOG.en.md`（版本标题沿用 `## V1.3.11(YYYY-MM-DD)` 形态）、`docs/中文/指南/模板设计器.md` 的属性台小节，然后：

```bash
git add docs packages
git commit -m "属性台恢复默认值：补出纸一致性回归与四宿主实测，同步中英 CHANGELOG 与指南"
```

---

## 计划自审对照（实施者不必执行，供评审）

| spec 要求 | 落在哪个任务 |
|---|---|
| 第三节派生规则与边界 1（`0` vs `undefined`） | Task 2 Step 1 用例 4、Task 3 Step 1 用例 3、Task 7 Step 4 的 `orUndef` 禁令 |
| 第三节注册表 `default` / `defaultUnit` 纯提示字段 | Task 1 |
| 第四节 `ResetButton` + `.pd-label-t` + 样式 | Task 2 |
| 第四节接入面 12 个文件 | Task 3–6 |
| 第五节 common 同构与派生链 | Task 7 |
| 第六节三层回落 | 元素级 Task 3/4、表格级 Task 4、单元格级 Task 5 |
| 第七节排除清单 | Task 3/4/5 各表的"不挂"行 + Task 6 拼版两项 |
| 第八节验收 1–8 | Task 1(1)、Task 8 Step 3(2)、Task 2(3)、Task 3–5(4)、Task 7 Step 5(5)、Task 8 Step 1(6)、Task 8 Step 6(7)、Task 8 Step 5(8) |
| 第十一节延后项 | Task 6 Step 4（拼版两项）、Task 8 Step 6 清单第 8 条（页级行无图标） |

**执行期新增的三条硬约束（续跑时必须遵守）**见下方「执行进度」；下列勘误来自把注册表 **56 个键**逐一对到计划表格的对账，**优先级高于原任务表中的对应行**。

---

## 计划勘误（56 键逐一对账后）

注册表实际有 9 组 56 键（`position-size` 4、`appearance` 16、`flow-list` 5、`code` 12、`content` 6、`border-bg` 4、`binding` 2、`pagination` 3、`advanced` 4）。对账后原计划漏了三行、少了一条显式排除、且完全没提 flow-list：

| # | 键 | 原计划 | 更正 | 依据 |
|---|---|---|---|---|
| E-1 | `ap-img-object-position` | Task 3 只接了 CropAnchorField 里的**倍率**行，漏了**锚点**本身 | **补接**：Task 3 Step 4 同一文件内的锚点行也挂图标，`prop-key` 为 `objectPosition`，提示**不带数字**（其缺省是"正中间"这一语义，不是某个百分比） | 注册表 tip 原文：「缺省取正中间（保住证件照头顶就选顶部）」 |
| E-2 | `cd-fit` | Task 4 条码表**未列** | **补接**：`prop-key` 为 `fit`，factory 未预置 ⇒ 落点是删键 | 该键 keywords 为「缩放模式/拉伸/等比/fit/contain/cover」，是条码自定义设置的缩放模式 |
| E-3 | `bb-border-style` | Task 5 只写了宽度/颜色/背景色 | **补接**：`prop-key` 为 `borderStyle`，factory 未预置 ⇒ 删键。注意与"无边框/单边**预设按钮**"区分——按钮行仍不挂 | 该键是线型下拉（实线/虚线/点线/双线），属模板属性 |
| E-4 | `ct-title` | 排除清单只写了「内容/表达式绑定」，未点名 | **显式排除**：`ct-title` 就是内容键（keywords「内容/文本/title」），且 barcode/qrcode 的 factory 预置了 `title:'条形码'`——删掉它会清空用户文本，属危险操作 | `element-factory.ts` 的 barcode/qrcode 分支 |
| E-5 | `flow-list` 整组 5 键 | 计划成文时不存在（他方在途新增） | **本期不做，也不得顺手接**：流式列表元素尚未落地到本设计的基线，其 `fl-columns` / `fl-row-height` / `fl-gap-x` / `fl-auto-span` / `fl-max-span` 的落点需另立口径（`fl-auto-span` 的"默认关"在 factory 里是写死的 `false`，属字面值型）。待其提交后单独评估 | `property-search.ts` 的 flow-list 组 + factory 的 `flowList` 分支 |

两处键↔行映射说明，避免实施时按 1:1 硬套：

- `ct-table-font` 一个键覆盖「默认字号 / 默认颜色 / 默认内边距」**三行**（该键 keywords 即这三项）。Task 4 Step 4 的三行共用同一个 `showItem('ct-table-font')` 门控，但各自挂**独立**图标。
- `cd-font-size` 在条码语境里是「文本字号」，与 `ap-font-size`（文本元素的字体大小）是**两个不同键、两个不同 options 字段**（前者在未设时由 `BARCODE_TEXT_FONT_SIZE_MODULES` 兜底）。不要合并处理。

修正后的纳入总数：**Task 3 外观组 16 行**（含锚点与倍率）、**Task 4 条码 11 + 高级 3 + 表格设置 4**、**Task 5 边框背景 4 + 单元格 24**、**Task 6 水印 5 + 拼版 6 + 页面背景色 1**。合计 **74 个图标位**（TableRowGroup 三项已撤出，见下）。

## 勘误的落地核实（已开源码确认，E-1 需再加细）

三处补接都确认为真实存在的行：

- **E-2** `CodeGroup.vue` 的 `cd-fit` 行标签是「缩放模式」，绑定 `element.options.fit || 'contain'`，且带 `v-if="!isBarcode"`——**只在二维码元素上出现**，条码元素不出这一行。
- **E-3** `BorderBgGroup.vue` 的 `bb-border-style` 行标签是「线型」，绑定 `element.options.borderStyle || 'solid'`。
  **⚠️ 本条勘误在实施时被推翻**：`git diff` 证明「线型」这一行是**另一会话未提交的新增**，HEAD 里不存在。
  因此它不是"我漏接的既有行"，而是他人 in-flight 功能的一部分，**不由本设计接入**。
  该文件的 import 区也被对方整体重写，与我要插入的位置冲突，故 `BorderBgGroup` 的三行
  （边框宽度 / 边框颜色 / 背景色，这三行 HEAD 里确实存在）一并**顺延到基线干净**，
  不强行用 inline 写法绕开冲突区制造第二套形态。
- **E-1** `CropAnchorField.vue` **不是一行而是四类行、共用两个键**，原勘误说"锚点行也挂图标"不够精确。逐行清单：

| 该组件内的行 | 对应的键 | 是否挂图标 |
|---|---|---|
| 主行（`{{ label }}`，即"裁剪锚点"）+ 其下的位置档下拉 | `objectPosition` | **挂一个**，放在主行标签右端 |
| 放大比例行（`CROP_SCALE_LABEL`） | `fitScale` | 挂（Task 3 Step 4 已计） |
| 水平微调行、垂直微调行（`{{ row.label }}` 两行） | 同属 `objectPosition` | **不挂**——与主行是同一个键的两个分量，挂三个图标会互相争抢同一状态 |

即 `CropAnchorField` 共 **2 个图标**（锚点主行 + 放大比例行），不是 4 个。

**反复出现的显示陷阱（三处同型）**：`barWidth ?? 2`、`fit || 'contain'`、`borderStyle || 'solid'` 都在**未设时把缺省值显示成当前值**。这正是全局约束里"判据一律 `=== base[propKey]`、绝不 `== 渲染端默认值`"的来由——这三行的出厂值是 `undefined`，所以未设时必须是灰态，尽管框里显示着 `2` / `contain` / `solid`。实施时给这三行各留一条"未设即灰"的断言。

**测试定位注意**：`BorderBgGroup.vue` 的「边框宽度 / 边框颜色 / 背景色」等 `.pd-field` 是**嵌套在父 `.pd-field` 内**的，按标签文本找行的辅助函数要先判"该行自身的 `.pd-label` 直接命中"，否则父行会因包含子行文字而被误匹配。

---

## 执行进度（2026-10-23 就地执行，master 分支）

**已完成并验证**（core 1052 用例、canvas 605 用例全绿，`vue-tsc` 无错）：

| 提交 | 覆盖 |
|---|---|
| `21b96bf` | **Task 2 全量**：`ResetButton.vue`（含 `write` 通道）、`.pd-label-t` / `.pd-reset-btn` 样式、8 条组件单测 |
| `b2aeb45` | Task 1 前半：`QR_DEFAULT_QUIET_MODULES` 上收至同构 `render/barcode-dot.ts` |
| `56427b1` | Task 4 部分：高级组 + 表格设置组接入，7 条用例 |
| `d09c155` | Task 6 前半：水印五项 + 拼版六项接入；修 `resetTo` 的 TS7053 |
| `5adf0c3` | Task 8 Step 1 + Step 3：落纸一致性回归 15 条（每条正向配反面对照） |
| `b080146` | **Task 7 Step 2**：common `controls.ts` 的 `resetButton()` 原语 + `field`/`fieldHelp` 改 `.pd-label-t` 嵌套，9 条用例 |

Task 7 的 Step 2 已单独落地并验证向后兼容：`textContent` 逐字不变，common 全量 20 文件 227 用例（含并发的流式列表在途用例）全绿、`tsc` 无错。

**后续续跑（同日晚，采用「同一脚本双跑 + 临时索引 commit-tree + CAS」处理混改文件）**：

| 提交 | 覆盖 |
|---|---|
| `4615108` | Task 1 后半：注册表 `default`/`defaultUnit` + `propertyDefault()`，契约测试放新文件 |
| `c129e22` | Task 3：外观组 14 行 + 裁剪锚点 2 处（`CropAnchorField` 新 props 做成可选，避免打断 `TableCellGroup`） |
| `3155565` | Task 4：条码组 11 行 |
| `ca2a9dc` | Task 6 尾：页面背景色换图标 + 删遗留 `.pd-reset` 样式 |
| `6bcc72e` | Task 5：common 之外的单元格组 22 行（整选区 write、提示不带数字） |
| `9a20d8a` | Task 7：common 单元格组 21 处 + 三个行构造器透传 reset |
| `c576fed` | Task 7：common 表格级默认 4 行（写回字面值而非删键） |
| `af1749a` | Task 7：common 元素台外观组 14 行 |

**当前验证态**：core 1058、canvas 628、common 244 全绿；`vue-tsc` 与 `tsc` 无错；`npm run build` 退出码 0；render 真实 Chromium 30 用例通过。每笔混改文件提交后均复验 `git diff HEAD` 恰等于他方原有改动量（`property-search.ts` +32/0、`TableCellGroup` +2/1、`table-props` +2/0、`property-panel` +95/2），他方在途工作一行未损。

**仍未完成**：common 条码组 11 行 / 边框与高级组 / 水印拼版页面级；canvas `BorderBgGroup` 三行（顺延）；Task 8 的四宿主浏览器实看与 CHANGELOG。

## 「边框与背景」组在两侧都不是漏接（E-3 的最终结论）

上一轮记的 E-3 只说了 canvas。本轮查 common 侧发现**同一结论适用于 `property-panel.ts`**：
`bb-border-*` 整段（`borderFields()` / `applyBorderPresetTo()` / `toggleBorderEdge()` / 线型行）
是他方未提交的新增，HEAD 里不存在。所以该组在 canvas 与 common 两侧**一并顺延**，
等对方落地后按其最终形态统一接入——不是本设计的缺口。

## 剩余工作的精确清单（续跑者照此做，不必重新勘察）

| 待办 | 位置 | 状态与做法 |
|---|---|---|
| common 条码组 11 行 | `property-panel.ts` 的 `group(ctx,'code'…)` | 行都在 HEAD 里，可直接接。`cd-dpi`/`cd-bar-width`/`cd-ec-level`/`cd-fit` 是多行 `selectField`，`cd-bar-quiet-zone`/`cd-bar-height`/`cd-quiet-zone` 是多行 `fieldHelp`——**先取完整原文再定锚点**，别用截断行 |
| common 水印 / 拼版 / 页面级 | `page-extras.ts`、`watermark.ts`、`pagePane` | 与 canvas 同一套 `base`（`WATERMARK_DEFAULTS` / `TILE_DEFAULTS`）；页面级仍受边界 4 约束，只做页面背景色那一行 |
| canvas `BorderBgGroup` | — | 已确认顺延（他方重写） |
| 四宿主浏览器实看 | `demo` + `demo-common` | **需用户同意读图**（AGENTS.md）。八条清单见 Task 8 Step 6 |
| CHANGELOG 与指南 | `docs/中文/CHANGELOG.md`、`docs/en/CHANGELOG.en.md`、`docs/中文/指南/模板设计器.md` | 三个文件当前都载有他方未提交改动，须走同一「双跑 + 临时索引」流程 |

**混改文件的标准操作顺序（本轮起固化）**：`git show HEAD:<file> > /tmp/x` → 脚本先跑 `/tmp/x` → 通过后再跑工作区 → `tsc` → `vitest` → `commit-tree` + CAS `update-ref` → `git reset -q HEAD -- <file>` → 复验 `git diff HEAD` 等于他方原有量。顺序反了会在断言失败时已经写过工作区一次。

## 停摆状态（第 17 轮，预算将尽）

**已提交 32 笔，工作树处于可续跑的干净态**：我名下的新建/独改文件全部已入库；未提交的只剩他方在途内容，且量级与其原始改动逐文件一致——
`property-search.ts` +32/0、`property-panel.ts` +95/−2、`table-props.ts` +2/0、`PropertyPanel.vue` +9/−1、
`AppearanceGroup.vue` 与 `CodeGroup.vue` 为 0（说明那两文件的混改已全数提走，未夹带他人内容）。
无残留临时脚本。三包测试 core 1058 / canvas 628 / common 248 全绿，`tsc`+`vue-tsc` 无错，`npm run build` 退出码 0。

**已落地图标位（约 100 处）**：canvas 侧全部（外观 14、条码 11、高级 3、表格设置 4、单元格 22、水印 5、拼版 6、页面背景色 1）；
common 侧原语 + 单元格 21 + 表格级默认 4 + 外观 14 + 高级 3 + 条码 11。

**明确未完成（三项，均需外部条件或剩余预算）**：

1. **common 的水印 / 拼版 / 页面级行**——纯工作量，无阻塞。做法与已完成的 common 组完全相同：
   `base` 传 `WATERMARK_DEFAULTS` / `TILE_DEFAULTS`，走「双跑 + 临时索引」流程。
2. **`BorderBgGroup`（canvas）与 `bb-border-*`（common）**——**已确认不是本设计缺口**：该组整段
   （线型行、`borderFields()` / `applyBorderPresetTo()` / `toggleBorderEdge()`）是另一会话未提交的新增，
   HEAD 里不存在。须等流式列表/边框那笔工作落地后，按其最终形态统一接入。
3. **四宿主浏览器实看 + CHANGELOG 与指南**——浏览器实测需用户授权读图（AGENTS.md）；
   三个 docs 文件当前也载有他方未提交改动，须走同一套混改流程。

**恢复执行的前置判断（任一为真即可解锁第 2、3 项）**：
`list_chat_sessions` 查「检查 GitHub Issue 5」会话——若它已提交，则基线转干净，剩余工作全部退化为普通开发；
若它仍在写，则第 2 项继续等待，第 1、3 项仍可推进。

**被阻塞的剩余工作**——全部要改下列 8 个文件，而它们当前载有另一项在途功能（流式列表）的**未提交**改动，直接提交会把别人的工作打进我的 commit message：

`property-search.ts`（Task 1 后半 + Task 3/4 的提示数值来源）、其 spec、`element-factory.ts` 及其 spec、`PropertyPanel.vue`（Task 6 页面背景色）、`TableCellGroup.vue` + `BorderBgGroup.vue` + `TableCellGroup.spec.ts`（Task 5）、common 的 `property-panel.ts` + `table-props.ts`（Task 7）。

## 执行期新增的三条硬约束（续跑时必须遵守）

1. **~~`npm run styles` 只能在干净基线上跑~~（此约束已被推翻）**。实施期查证 `.gitignore` 第 24/25 行：
   `packages/print-common/src/core/icons.ts` 与 `src/styles/designer.css` **都是被忽略的构建产物，不入仓库**。
   因此跑派生永远不会把他人样式"烘进提交"——它只影响本地所见。派生可随时跑、CI 每次 build 也会跑。
   仍然成立的只有它的**反面**：这两个文件不能手写，改了也会被下次派生覆盖。
   本约束原先是错的，导致 Task 7 的派生步骤被无谓顺延了一轮。
2. **canvas 每次提交前必须跑 `npx vue-tsc -p tsconfig.build.json`**（在 `packages/print-canvas/` 下）。vitest 不做类型检查：`56427b1` 就是这样带着一个 TS7053 过了 597 条用例（`ElementOptions` 无索引签名），到 `d09c155` 才修掉。
3. **落纸一致性测试的覆盖边界**：`generateHtml` 在无 `codeRenderer` 时对码类直接走 fallback，且无数据上下文时表格不出 `<td>`——所以 barcode / qrcode / table 三类的属性**在 HTML 层没有鉴别力**。首版 13 条正向断言里有 3 条是假绿，靠反面对照才暴露。这三类已改在 options 与结算函数层断言，其真实落纸一致性**必须**由 Task 8 Step 4（render 服务回归）与 Step 6（浏览器实看）覆盖，不能算已由单测证明。

## 阻塞状态更新（第 7 轮实测）

占用文件的会话「检查 GitHub Issue 5」经 `list_chat_sessions` 查得 `runtimeState: "cold"`、`pendingInteractionCount: 0`。**它不会自行提交，"等它提交"等于无限等待。** 且该功能尚未注册进 `PrintDesigner.vue` 与 common `print-designer.ts`，属半成品，不能替它提交。

因此 A 方案需由用户主动去恢复那个会话；否则只能在 B（隔离 worktree）与 D（临时索引只提我的 hunk）之间选。AGENTS.md 规定隔离须由用户明确提出，故本计划不自行选择。

## Task 1 后半待落补丁（基线一通即可套用，无需再设计）

目标文件 `packages/print-core/src/designer/utils/property-search.ts`。该文件当前载有他方 `flow-list` 组的 32 行未提交新增，**与本补丁的三处改动位置不重叠**（他方插在 old-line 63 之后与 109 之后；本补丁动的是文件头接口、appearance/code 组内的六个条目、以及文件末尾新函数）。

**① 文件头 import**（插在 `export interface PropertyItem` 之前）：

```ts
import { BARCODE_QUIET_ZONE_MODULES, BARCODE_BAR_HEIGHT_MODULES, BARCODE_TEXT_FONT_SIZE_MODULES, QR_DEFAULT_QUIET_MODULES } from '../../render/barcode-dot.js'
import { DEFAULT_SHRINK_MIN_FONT_SIZE_PT } from '../../render/text-fit.js'
import { CROP_SCALE_MIN } from '../../render/crop-style.js'
```

**② `PropertyItem` 接口尾部追加两个可选字段**（`tip?` 之后）：

```ts
  /** 「恢复默认值」提示语里的数值。**仅用于生成文案，重置行为不读它**——
   *  落点一律派生自该元素类型的出厂值（createDefaultOptions / WATERMARK_DEFAULTS / TILE_DEFAULTS）。
   *  必须引用渲染端既有常量，不得重抄字面量：漂移最多说错数字，不会做错动作。 */
  default?: number | string
  /** 提示语单位，如 `模块` / `mm` / `pt` */
  defaultUnit?: string
```

**③ 六个条目补字段**（只追加，`key` / `keywords` / `tip` 原值不动）：

| 条目 | 追加 |
|---|---|
| `ap-shrink-min` | `default: DEFAULT_SHRINK_MIN_FONT_SIZE_PT, defaultUnit: 'pt'` |
| `ap-img-fit-scale` | `default: CROP_SCALE_MIN, defaultUnit: '%'` |
| `cd-bar-quiet-zone` | `default: BARCODE_QUIET_ZONE_MODULES, defaultUnit: '模块'` |
| `cd-bar-height` | `default: BARCODE_BAR_HEIGHT_MODULES, defaultUnit: '模块'` |
| `cd-font-size` | `default: BARCODE_TEXT_FONT_SIZE_MODULES, defaultUnit: '模块'` |
| `cd-quiet-zone` | `default: QR_DEFAULT_QUIET_MODULES, defaultUnit: '模块'` |

**④ 文件末尾追加助手**（与既有 `propertyTip()` 同形态）：

```ts
/** 「恢复默认值」提示语取数：只读注册表的纯提示字段，重置行为不经过这里 */
export function propertyDefault(key: string): { value: number | string; unit?: string } | undefined {
  for (const group of PROPERTY_REGISTRY) {
    for (const item of group.items) {
      if (item.key === key && item.default !== undefined) {
        return { value: item.default, unit: item.defaultUnit }
      }
    }
  }
  return undefined
}
```

**测试放新文件**，不进他方占用的 `__tests__/property-search.spec.ts`：新建 `packages/print-core/src/designer/utils/__tests__/property-defaults.spec.ts`，内容即 Task 1 Step 1 那三段用例（常量引用一致性、`defaultUnit` 依附于 `default`、`propertyDefault` 三态）。`QR_DEFAULT_QUIET_MODULES` 的上收已完成（`b2aeb45`），此补丁直接可用。

落完这一步，Task 3 / Task 4 条码组 / Task 5 / Task 7 Step 4 全部解除依赖。

## Task 7 元素台（common `property-panel.ts`）：一次失败的尝试与正确做法

**已尝试并回退**（工作区 `git diff` 恢复为他方原有的 95+/2−，common 238 用例复绿）。失败原因值得记下来，否则下次还会踩：

1. **reset 必须挂在 `field()` / `fieldHelp()` 上，不是挂在里面的控件构造函数上。**
   `field('对齐', radioGroup('ta', [...], cur, onChange))` 这一行里，`radioGroup` 只有
   `(name, options, current, onChange, twoCol)` 五个形参——把 `reset` 追加到它的实参尾部
   既超出它的签名、又改错了层级。正确做法是给外层 `field` 补第 4 参，即
   `field('对齐', radioGroup(...), undefined, reset(...))`。
   `selectField` / `switchField` / `numField` 内部已经是 `field(label, ctrl, undefined, reset)` 的透传，
   所以这三类调用点可以直接加尾参；**唯独模板里直接写 `field(... radioGroup ...)` 的两行（对齐、垂直对齐）要改外层**。
2. **靠"尾部若干个右括号"做锚点极易算错。** 本次 `})))),` 与 `}))))),` 的差别就是一个括号，
   直接造成 8 个 spec 连带语法崩溃。改这类嵌套调用要**逐层数括号并写注释**，不要凭感觉补。
3. **双跑法本身是对的，保留为标准做法**：同一套带 `split()===1` 断言的脚本，先跑在
   `git show HEAD:<file>` 导出的纯净副本上得到 mine-only blob，再跑在工作区上。
   这样不需要"减法"，也不依赖他方改动行数多少。
4. **跑完必须 `tsc` 才算数**：本次 vitest 是整片崩（语法错）才发现的；但若只是参数错位，
   vitest 可能照常绿而 `tsc` 报错。顺序固定为 `tsc` → `vitest` → 提交。

**尚未接的 common 行**：元素台外观组 14 行、条码组 11 行、边框/高级组、水印/拼版/页面背景色。
已完成的 common 部分：`controls.ts` 原语（含 `write` 通道）、单元格组 21 处、表格级默认 4 行。

## 停摆状态更新（第 18 轮，common 三组已补齐）

上面那段「尚未接的 common 行」已被后续提交作废，实际进度以本段为准。

**common 侧新增落地**（提交 `af1749a`→`6ec7a59`，共 6 笔）：外观组 14 行、条码组 11 行、高级组 3 行、
水印区段 5 行（`5d3a3cc` + 断言 `f45e6e4`）、拼版区段 8 行（`a5706d4`，`enabled`/`columns` 按排除清单不接）、
页面背景色 1 行（`6ec7a59`，同时把原内联文字按钮「默认」移到标签行右端，完成 T1 两端同形）。
水印的脏判定基准改用「已落值视图」而非裸 `wm`，因为 `commit()` 一次写满五个键，
拿裸 `wm` 会出现「显示 −30 却不亮」与 canvas `localConfig` 不一致。

**图标位总计约 130 处**：canvas 全部组（外观 14、条码 11、高级 3、表格设置 4、单元格 22、水印 5、拼版 6、页面背景 1）；
common 全部组（原语 + 单元格 21 + 表格级默认 4 + 外观 14 + 高级 3 + 条码 11 + 水印 5 + 拼版 8 + 页面背景 1）。

**当前质量门**：37 笔提交；core 1058 / canvas 628 / common 253 全绿；`vue-tsc` 与 `tsc` 零错；
`npm run build` 退出码 0；render 服务 30 条在真实 Chromium 下绿。他方在途 222 行逐文件量级复验未变，仍未提交。

**仅剩两项**：

1. **`BorderBgGroup`（canvas）+ `bb-border-*`（common）**——该整段是他方未提交新增，HEAD 里不存在，等其落地后按最终形态接入。
2. **Task 8 Step 6 四宿主浏览器实看**——AGENTS.md 规定图像判读需用户先同意；DOM 级断言与类名审计已可自证，
   像素级观感由用户确认。CHANGELOG 与指南三项文档随本步一并更新（走同一套双跑 + 临时索引流程）。

