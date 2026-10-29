# 属性台「恢复默认值」重置位 — 设计说明

日期：2026-10-23　影响版本：`@worm-vue3-print/{core,canvas}` 1.3.10 → 1.3.11（新增能力，非破坏）、`@go-wind/print-common` 预览版随主线单独升号（不进 `latest`）

## 一、需求与裁决

用户要求：属性台中**所有存在可重置默认值的属性项**，在最右侧增加重置图标，带「恢复默认值」提示；图标来源与顶部工具栏一致。

经视觉伴侣两轮点选 + 终端补充，七项定档：

| 项 | 定档 | 含义 |
|---|---|---|
| ① 落位 | **A** | 标签行右端，`justify-content: space-between`，控件满宽不侵占 |
| ② 出现时机 | **K1** | 常驻显示；等于默认时置灰，被改过时高亮可点 |
| ③ 批量入口 | **G1** | 只做单属性逐项，不加分组级/元素级批量 |
| ④ 既有「默认」按钮 | **T1** | 统一换成同一枚图标，「默认」二字消失，提示走 `data-tip` |
| ⑤ 范围 | **R2 + 派生规则** | 元素属性台（外观/条码/边框/高级/表格/单元格）+ 水印/拼版全纳入；几何与数据类排除；**出厂值有两处来源的页级行延后**（见第三节边界 4 修订） |
| ⑥ 表格层级 | **C2** | 元素级 / 表格级默认 / 单元格级三层各自可恢复 |
| ⑦ 写回语义 | **派生规则**（取代原 `omit`/`literal` 双模式） | 重置目标 = 该元素类型的出厂值 |

**派生规则是本轮实施中最重要的一处改口**：原设计拟在注册表声明 `reset: 'omit' | 'literal'` 双模式，逐项摊开后发现同一属性键在不同元素类型下的出厂状态不同（`ap-line-height` 在 longText 上出厂即写 `18`、在 text 上未设），按属性划范围会划出一条随元素类型漂移的线。改为单一派生规则后，四类特例（`ap-font-size`、`ap-img-fit`、`tableDefaultFontSize`、`tableDefaultColor`）自动落到正确动作上。

**2026-10-23 二次修订（用户指令）**：第三节**边界 4 的常量上收本期不实施**。连带后果不是"整个页面页签停做"，而是**按出厂值来源逐行判定**：纸型、方向、输出旋转、页边距、页眉页脚这些行的 `F` 目前有两个来源（`default-config.ts` 预设 + `PropertyPanel.vue` 组件内硬编码），不收口就没有可信的 `base` 可传给 `ResetButton`，硬做等于把第三处真源固化进重置逻辑——**这些行延后**。而**水印与拼版仍在本期**，因为 `WatermarkConfig.vue` 与 `TilingConfig.vue` 已经直接 import core 的 `WATERMARK_DEFAULTS` / `TILE_DEFAULTS` 作唯一回落源，单一出口天然成立。详见第四节表格。

页面背景色那一行**仍按 T1 换成图标**：它的 `F` 就是 `undefined`（现有代码写的正是 `pageBackground: undefined`，渲染端回落白色），判据 `pageBackground === undefined` **不需要任何常量上收**即可成立。若连这行也一并延后，本期就只有元素属性台带重置图标、页面那行仍是文字「默认」，T1 想消除的"两种形态并存"会重新出现——要砍这条例外请回一句。

## 二、现有代码事实（按符号复核，行号会漂）

- **图标真源**：顶部工具栏用 `lucide-vue-next`，`print-canvas` 的 import 语句是唯一真源；`print-common/scripts/gen-icons.mjs` 扫 `print-canvas/src` 派生出 `print-common/src/core/icons.ts`（文件头标注"自动生成，请勿手改"）。`iconSvg(name, size, cls)` 未命中时**静默返回空串**。属性台与格式栏以外目前**零 lucide 导入**：下拉箭头是 CSS 三角、步进是 `−`/`+` 文本、字段说明是 `::before` 画的 `?`。
- **既有唯一属性级重置**：`PropertyPanel.vue` 页面背景色行的 `.pd-reset` 文字按钮「默认」，行为 `emitUpdate({ pageBackground: undefined })`，提示用原生 `title`；common 侧 `property-panel.ts` 的 `pageBackground` 行同构。
- **注册表**：`print-core/src/designer/utils/property-search.ts` 的 `PropertyItem = { key, keywords[], tip? }`，`PROPERTY_REGISTRY` 共 9 组 53 项。无 label、无控件类型、无默认值字段。canvas 与 common 共用这份（common 的 `shell/property-search.ts` 只做 `data-prop-key` 挂点接线）。
- **出厂值来源**：`element-factory.ts` 的 `createDefaultOptions(type)`、`table-matrix.ts` 的 `createDefaultTable()`、`default-config.ts` 纸型预设、`watermark.ts` 的 `WATERMARK_DEFAULTS`、`tiling.ts` 的 `TILE_DEFAULTS`。
- **渲染端回落不对称**（`html-generator.ts` 的 `matrixCellStyle`）：`padding` 有 `?? opts.tableDefaultPadding ?? 1` 字面兜底，而 `fontSize` / `color` / `fontFamily` 只到 `opts.tableDefault*` 为止，再空则 `if (…)` 整条不输出 → **删这三个键会改变出纸**（落到 CSS 继承）。这是原 `omit` 语义无法覆盖表格级默认的硬证据。
- **"值等于默认"不可作判据**：`CodeGroup.vue` 条宽绑的是 `element.options.barWidth ?? 2`，控件在键未设时就把 2 显示成当前值，用值比较分不清"没设过"与"设成了 2"。派生规则以出厂值（此处为 `undefined`）为基准，绕开该坑。
- **未设置的表示法**：全仓统一写 `undefined`（`$event ?? undefined`），`JSON.stringify` 时自然消失，不需要真 `delete`。
- **属性行无统一容器**：`.pd-field`（纵向 flex：标签在上、控件在下）由 `property/*.vue` 各分组手写，`PropertyGroup.vue` 只统一"分组"这一层。
- **`textContent` 约束**：`.pd-help` 刻意用 `::before` 出字形、不写字，属性搜索与宿主 144 项验收按 `.pd-label` 的文本匹配。
- **common 样式派生**：`gen-styles.mjs` 从 canvas 构建产物 `dist/canvas.css`（剥 `[data-v-*]`）+ `native-controls.css` + `scope-patches.css` 生成 `src/styles/designer.css`；`npm run styles -w @go-wind/print-common` 是 `build`/`typecheck`/`test` 的前置步骤。类名覆盖率审计：`node demo-common/scripts/class-audit.mjs`。
- **common 的 `orUndef` / `optNum` 会吃掉 `0` 档**，`table-props.ts` 已有两处特意绕开 `numField` 的先例。

## 三、契约：一条派生规则

```
出厂值 F = createDefaultOptions(elementType)[key]        // 元素级
        = createDefaultTable() 对应层不预置 ⇒ F = undefined  // 单元格级
        = WATERMARK_DEFAULTS / TILE_DEFAULTS              // 水印、拼版（单一源，本期做）
        = default-config.ts 纸型预设[key]                 // 页面级（两处来源未收口 ⇒ 本期延后）

灰/亮判据：当前值 === F            → 灰（无可恢复，点击不产生变更）
          当前值 !== F            → 亮（可恢复）
恢复动作：options[key] = F        // F 为 undefined 时天然即"删键"
```

三条边界必须在实现里钉死：

1. **`0` 与 `undefined` 是两个不同状态**。比较用 `===`，不得用 `||` / `??` 归并；common 侧接入时不得让 `orUndef` 把 `0` 折成 `undefined`（已有绕行先例，沿用）。
2. **数组/对象型属性不参与本机制**（`tableColWidths`、`tableRows`、`borders`、`tablePagination`），它们的"等于出厂值"需要深比较且重置后果不可预期，一律进排除清单。
3. **`F` 只在当前元素类型下求值**。同一 `key` 在 `text` 与 `longText` 上的 `F` 可以不同，这是规则的正常结果，不是 bug。
4. **页面级的出厂值目前有第二处来源——本期不解决，页面属性随之延后**。`default-config.ts` 的纸型预设覆盖 `paperSize` / 页边距 / 210×297 这类，但 `outputRotation ?? 0`、页面背景 `'#ffffff'`、页眉页脚 `?? 10` 等是**散在 `PropertyPanel.vue` 与 common `property-panel.ts` 模板里的 UI 侧硬编码**，预设表里没有对应条目。要正确做页面属性的重置，必须先把这些常量上收到 `default-config.ts` 单一出口（页面级 `base` 由它派生），否则会把"预设表说一个值、控件显示另一个值"的第三处真源固化进重置逻辑。**用户 2026-10-23 指令：该上收本期不实施**，故页面属性页签整体移出本期范围（唯一例外是第一节所述页面背景色行，它的 `F` 天然为 `undefined`，不依赖上收）。此项列为后续独立处理。**元素级与单元格级无此问题**（`createDefaultOptions` 已是单一出口）。

注册表因此**只新增一个纯提示字段**：

```ts
export interface PropertyItem {
  key: string
  keywords: string[]
  tip?: string
  /** 仅用于生成「恢复默认值（N 单位）」提示语；行为不读它。
   *  只在"出厂未设但渲染端有数字回落"的属性上声明。 */
  default?: number | string
  /** 提示语单位，如 `模块` / `mm` / `pt` */
  defaultUnit?: string
}
```

数值**引用 core 既有常量**（`barcode-dot.ts` 静区 10、`text-fit.ts` 最小字号 6、`browser-code-renderer.ts` 二维码静区 0 等），不重抄字面量。行为不依赖 `default`，所以注册表与渲染端一旦漂移，最多提示语说错数字，不会做错动作。

**代价与改口声明**：`element-factory` 由此升格为契约真源——今后修改新建元素默认值，等于同时修改「恢复默认值」的落点。这与"能派生就不存副本"一致，但与本设计第一部分原先"不往 `element-factory` 挂"的结论相反，已由用户确认改口。为钉住该耦合，第八节安排了对应回归测试。

## 四、canvas 侧实现

**新增 `property/ResetButton.vue`**（唯一新组件）：

- props：`target`（当前承载对象：`element.options` / `cell` / 页面属性对象）、`base`（该层的**出厂值对象**，由调用方传入）、`propKey`、`default?`、`defaultUnit?`、`patch(value)` 写回回调。
- **组件不感知元素类型，只吃 `base`**：元素级传 `createDefaultOptions(type)`、单元格级传 `{}`（即 `F` 恒为 `undefined`）、水印/拼版传 `WATERMARK_DEFAULTS` / `TILE_DEFAULTS`。页面级传纸型预设这条**本期用不上**（边界 4 延后），但接口形状已兼容。**三层共用一个组件**，且组件不反向依赖 factory。
- 自身完成三件事：取 `F = base[propKey]`、比 `target[propKey] === F` 决定灰/亮、点击 `patch(F)`。不向上抛给各分组组件处理。
- 渲染：`<button type="button" class="pd-reset-btn" :class="{ 'is-active': dirty }" :data-tip="tip" :aria-label="tip"><RotateCcw :size="13" /></button>`，`import { RotateCcw } from 'lucide-vue-next'`。
- 提示语：`default` 有值 → `恢复默认值（${default}${defaultUnit ? ' ' + defaultUnit : ''}）`；无值 → `恢复默认值`。单元格级固定用「恢复默认值（跟随表格默认）」。
- **禁止任何文本子节点**（含"默认"二字），只走 `data-tip` 与 `aria-label`，以守住 `.pd-label` 的 `textContent`。

**行容器改造**（最小侵入，不抽 `PropertyField.vue`）：

```html
<span class="pd-label"><span class="pd-label-t">静区 (模块)<button class="pd-help" …/></span>
  <ResetButton … /></span>
```

`native-controls.css` 的 `.pd-label` 补 `justify-content: space-between`，新增 `.pd-label-t`（`display: inline-flex; align-items: center; gap: 4px`）包住原文字与 `?`。`.pd-field` 纵向 flex 的交叉轴拉伸已使 `.pd-label` 满宽，无需改宽度。

**样式**：`.pd-reset-btn`（15×15、`color: var(--pd-text-faint)`、透明边框）+ `.pd-reset-btn.is-active`（`color: var(--pd-accent)`）+ `:hover`（蓝字 + `rgba(22,93,255,.09)` 底），写在 canvas scoped style 与 `native-controls.css`，由 `gen-styles.mjs` 派生给 common。

**接入面**：`property/AppearanceGroup`、`property/CodeGroup`、`property/BorderBgGroup`、`property/AdvancedGroup`、`property/TableCellGroup`、`property/TableSettingsGroup`、`property/CropAnchorField`、`WatermarkConfig`、`property/TilingConfig`。

`property/TableRowGroup.vue` **整组撤出本期**（原列为接入面，经核实不成立）：行属性挂在 `row` 对象而非 `options`，其"出厂值"依赖行在表中的位置与类型——`insertRow` 用 `height: ref.height` 让新行**继承相邻行**（`table-matrix.ts`），行高无统一默认；`repeatOnPage` 表头行出厂 `true`、数据行未设；`type` 出厂由位置决定。派生规则的前提是"该层存在单一出厂对象"，行层不满足，硬接会把作者插入的行错误重置成 8mm。

`property/BorderBgGroup.vue` **同样顺延**（实施期发现，并推翻此前一处勘误）：该文件正被另一项在途功能整体重写（import 区与脚本段全改），且「线型 `bb-border-style`」这一行本身就是对方新增、HEAD 里并不存在——原先记为"漏接的既有行"是错的。为避免在冲突区里塞进与其余分组不同形态的写法，该组三行（边框宽度 / 边框颜色 / 背景色，这三行 HEAD 中确实存在）留待基线干净后按统一形态接入。

`property/FontSelect.vue` **本身不改**——「字体」行的图标挂在外观组的 `.pd-label` 上，组件只负责选字体；它自带的下拉首行「默认」是**清行**语义，与行尾图标并存，本期不动它（避免一次改两处入口）。`property/BindingControl.vue` **不接入**：内容与表达式绑定属第七节排除清单。

**页面页签按出厂值来源拆开处理**，不是一刀切：

| 页面页签内的行 | 出厂值来源 | 本期 |
|---|---|---|
| 纸型 / 方向 / 输出旋转 / 页边距 / 页眉页脚（直接手写在 `PropertyPanel.vue` 模板里） | `default-config.ts` 预设 **加** 组件内 `?? 0` / `'#ffffff'` / `?? 10` 硬编码，两处 | **延后**（依赖边界 4 的上收） |
| 页面背景色（既有 `.pd-reset` 那一行） | `F` 天然为 `undefined`，不依赖任何常量 | **仅把文字按钮换成图标**，写回行为不变 |
| `WatermarkConfig` | `WATERMARK_DEFAULTS`（组件已直接 import core 常量，单一源） | **做** |
| `property/TilingConfig` | `TILE_DEFAULTS`（同上，单一源） | **做**，但 `enabled` 与 `columns` 两项除外（见下） |
| `DesignBackgroundConfig` | `rotation ?? 0` 是第二处硬编码 | 该字段除外，其余不动 |

拼版组两项除外的理由：`TILE_DEFAULTS.enabled` 是 `true`，而组件按"未配置过拼版即 `false`"处理（`modelValue?.enabled ?? false`）；`TILE_DEFAULTS.columns` 是 `2`，但开关写入时按纸面收敛成 `Math.min(TILE_DEFAULTS.columns, max)`。**两处口径不一致的字段没有可信的单一 `F`**，与边界 4 是同一类问题，一并延后。

`PositionSizeGroup` 四项几何全在排除清单，**整组不接入**。

## 五、common 侧实现

- `shell/controls.ts` 的 `field()` / `fieldHelp()` 增加可选 `reset` 参数，产出与 canvas 逐字对齐的 `.pd-label-t` + `.pd-reset-btn` 结构；`iconSvg('RotateCcw', 13, 'pd-reset-icon')` 消费派生图标。
- `shell/property-panel.ts`、`shell/table-props.ts` 逐行接入（`shell/format-bar.ts` 本期不动，见第十一节）。
- **不手改 `core/icons.ts`**，改跑 `npm run styles -w @go-wind/print-common`。
- `orUndef` / `optNum` 的 `0` 档陷阱按既有绕行先例处理。
- 类名与 canvas 逐字对齐（PARITY 约定），完成后跑 `class-audit.mjs` 确认派生 CSS 有 `.pd-reset-btn` 规则、无掉样式。

## 六、三层回落（C2）

| 层 | 出厂值 `F` | 恢复动作 | 提示语 |
|---|---|---|---|
| 元素属性 | `createDefaultOptions(type)[key]` | 写回 `F` | 有 `default` 带数字，否则不带 |
| 表格级默认（`tableDefaultFontSize` / `Color` / `Padding`） | 出厂即 `10` / `#333333` / `1` | **写回字面值**（规则自动得出，无需标记） | `恢复默认值（10）` 等 |
| 单元格属性 | `createDefaultTable()` 不预置 → `undefined` | 删键，回落到**该表格自己的**表格级默认 | 固定「恢复默认值（跟随表格默认）」，**不带数字** |

单元格提示语禁止带数字：表级默认本身可被作者改，写死"默认 10"会构成假承诺。

**实施现状更正（2026-10-23 真实浏览器实测）**：上表第四列给表格级默认写了 `恢复默认值（10）`，与第三节规范条款「只有注册表声明了 `default` 才带数字」相互矛盾。实现按规范条款走，而注册表只为**引用渲染常量**的六条声明 `default`（缩小下限 / 裁剪倍率 / 条码静区 / 条高 / 条码文本字号 / 二维码静区），故外观与表格级行当前显示纯「恢复默认值」。两种收口待裁决：**A** 为字面值行也声明 `default`/`defaultUnit`（注册表从此多一份出厂字面值，漂移只影响措辞）；**B** 提示直接读派生值 `base[propKey]`（不新增存储，但需为布尔与枚举值定文案规则，`恢复默认值（true）` 不能上界面）。行为与落点在两案下都不变，差别只在提示文案。

其余约束：单元格重置必须走现有 `write()` 的**整选区语义**（多选 5 格恢复 5 格，与设值同一作用域）；`TableCellGroup` 的边框草稿态 `borderStyle` / `borderWidth` / `borderColor` 不是模板属性，**不挂图标**。

## 七、范围与排除清单

**纳入**（按派生规则自动决定动作，不再区分 R2/R3）：外观组的字体/字号/粗细/对齐/垂直对齐/颜色/背景色/行高/字间距/文字溢出/最小字号/首行缩进/自动换行/缩放模式/裁剪倍率；条码组的 DPI/条宽/静区/条高/显示文本/文本字号/纠错级别/二维码静区/最大宽高；边框与背景组；高级组的锁定/固定/层级；表格设置组的表级默认字号/颜色/内边距；单元格组的九项；水印组（`WATERMARK_DEFAULTS` 覆盖的色/透明度/旋转/瓦片宽高）；拼版组除 `enabled`、`columns` 外的字段；页面背景色一行（仅换图标）。

**排除，及理由**：

| 排除项 | 理由 |
|---|---|
| `ps-left` / `ps-top` / `ps-width` / `ps-height` | 重置会让元素在画布上跳位，破坏作者排版 |
| `cd-type`（码制）、`ct-table-mode`、`ct-table-source`、`fields` | 决定"这个元素是什么"，不是样式默认值 |
| `ct-formatter` / `bd-content` / `bd-formatter` / `testData` / **`ct-title`** | 内容与码值是作者数据，重置等于清文本，危险。`ct-title` 尤其点名：barcode/qrcode 的 factory 预置了 `title:'条形码'`，删键会把用户可见的标题清空 |
| **`flow-list` 整组 5 键** | 该元素类型是本设计成文之后由另一项在途改动新增，其落点口径（尤其 `fl-auto-span` 出厂写死 `false` 属字面值型）需另立评估，本期不顺手接入 |
| **行属性组 `TableRowGroup` 全部三行**（行类型 / 行高 / 表头每页重复） | 挂在 `row` 对象而非 `options`，且 `insertRow` 让新行继承相邻行高（`height: ref.height`）——该层不存在单一出厂对象，派生规则前提不成立 |
| `tableColWidths` / `tableRows` / `borders` / `tablePagination` | 数组/对象型，见第三节边界 2 |
| 分页开关 `pg-*` | 改的是行为不是数值，且 `?.enabled` 会把删键读成"关闭" |
| 单元格边框草稿态 | 非模板属性 |
| `ad-delete` | 是按钮，不是属性 |

## 八、测试与验收

1. **core**：`property-search.spec` 增契约断言——每个声明了 `default` 的项，其值必须**引用**渲染端常量（比对符号来源，不是比对相等字面量），钉死注册表与渲染端漂移。
2. **core**：`element-factory.spec` 增"出厂值即重置落点"断言——对纳入清单的每个 `key`，断言 `createDefaultOptions(type)[key]` 存在且等于设计表列出的值；改 factory 默认值会立刻变红。
3. **canvas**：新增 `ResetButton.spec` 四断言——出厂态灰且点击不产生变更、偏离态亮且点击写回 `F`、`0` 与 `undefined` 判为不同状态、**`.pd-label` 的 `textContent` 不含"默认"**。
4. **canvas**：`CodeGroup.spec` / `AppearanceGroup.spec` / `TableCellGroup.spec` / `TableSettingsGroup.spec` 补重置用例，单元格那条必须断言整选区作用域。
5. **common**：`shell/__tests__/property-search.spec.ts` 的 DOM 签名与命中字段清单断言会因每行多一个按钮而红，按新结构更新；跑 `class-audit.mjs`。
6. **出纸回归（派生规则的硬判据）**：对每个纳入属性构造"偏离出厂值"的模板 → 执行恢复 → 断言**恢复后的渲染结果 === 该类型新建出厂模板的渲染结果**（逐字节）。注意判据不是"恢复前后一致"——恢复前后本就该不同（那正是重置的效果），一致的是"恢复后"与"出厂态"。例：条宽 `2.5` 恢复到未设后按 `?? 2` 落纸，须与出厂模板的落纸完全相同。涉及渲染管线，按验收清单跑 `npm run test -w @go-wind/print-render`。
7. **demo 实看**：canvas demo 与 demo-common 四宿主（jquery / react / vue2 / vue3）各开一遍，按 280px 面板宽度确认长标签（如「文本字号（相对条高，条高为 30）」）在加图标后不把 `?` 挤到第二行；确认 `RotateCcw` 在 common 侧不是空白（`iconSvg` 未命中会静默返回空串，这是最容易漏的红灯）。
8. **全量**：`npm run build` + `npm test`。测试计数按三段式报告（总数 / 实跑 / 跳过）。

## 九、风险与已知坑

1. `element-factory` 升格为契约真源 → 改新建默认值即改重置落点。由第八节第 2 条测试兜住。
2. 手改 `icons.ts` 会被下次 `npm run styles` 静默覆盖；`iconSvg` 未命中返回空串 → 按钮变空白而不报错。
3. common 样式必须走派生，手写会被 `class-audit.mjs` 判漂移。
4. common `property-search.spec` 按 DOM 签名断言，行内多一个按钮即红，属预期。
5. 280px 面板宽度下的长标签挤压，需实看而非纸面推断。
6. 存量模板里"作者手工设成恰好等于出厂值"的键会显示灰态点不动，语义正确但可能被认为坏了；CHANGELOG 与提示语要写清"灰色＝已是默认值"。
7. canvas 与 common 两份接入必须同批完成，否则 PARITY 出现半边功能。
8. 批量改写属性行时禁用宽跨度正则，逐处 `Edit`；同文件多 `Edit` 串行（历史事故：并行吞掉按钮属性与分区标签）。
9. **`字体` 与 `默认字体` 两行的落点存在基线依赖**（实施期发现）：HEAD 上 `createDefaultOptions` 的 base 带 `fontFamily: DEFAULT_PRINT_FONT_FAMILY`、table 带 `tableDefaultFontFamily`；工作区另有一份**未提交**改动正在删除它们。派生规则对两种基线都成立（写回黑体 vs 删键交还 CSS 继承，自动跟随），但同一模板在两种基线下"恢复默认值"的结果不同。故第八节的落点钉桩测试**刻意不硬编码 `fontFamily`**，改由运行时 `createDefaultOptions(type)` 求值；该改动若落地，`字体` 行灰态含义从"出厂即黑体"变为"出厂即未设"，属预期。
10. **实施基线必须是已提交状态**：当前工作区同时载有另一项在途功能（流式列表）的未提交改动，其中 `property-search.ts`、`element-factory.ts`、`PropertyPanel.vue`、`TableCellGroup.vue`、`BorderBgGroup.vue`、common 的 `property-panel.ts` / `table-props.ts` 与本设计接入面**直接重叠**。在这些文件上继续开发会把别人的在途工作混进本设计的提交——须先让其在途改动落地，或改用隔离工作区。

## 十、伴侣屏留存

- **第一屏 `reset-form.html`**：① 落位 A/B/C/D、② 出现时机 K1/K2/K3、③ 批量入口 G1/G2/G3、④ 既有「默认」按钮 T1/T2/T3。定档 A + K1 + G1 + T1。
- **第二屏 `reset-scope.html`**：R1/R2/R3 范围、C0/C1/C2 单元格。定档 R2 + C2（单选组以最后一次点击为准）。
- **事故记录**：两个并发会话共用同一 `--project-dir` 视觉伴侣服务会**串屏**——另一会话 14:11 推的流式列表屏覆盖了本任务 14:07 的屏，导致用户点击被记到错误话题上。处置：另起实例（新端口 52167、独立 `content/`），并把已丢失的选项在新屏顶部重述。验证服务端当前发的是哪一屏要看 `state/server.log`，`curl /` 只返回帧模板与 key 跳转页，不含内容。

## 十一、不在本期

- 分组级 / 元素级批量恢复（G2 / G3，已明确不选）。
- 格式工具栏（顶部选区快捷按钮）同步挂重置。
- 宿主可编程调用的 `resetElementToDefault` API。
- **页面属性页签的重置接入，以及随之必需的 `default-config.ts` 常量上收（第三节边界 4）**——用户 2026-10-23 指令本期不实施。上收完成后，纸型/方向/输出旋转/页边距/页眉页脚按同一派生规则接入，无需再改 `ResetButton`。
- **拼版组的 `enabled` 与 `columns`**、**设计背景的 `rotation`**：出厂值存在两处不一致口径，与边界 4 同类，一并延后。
- 页面级"整个版面恢复默认"。
