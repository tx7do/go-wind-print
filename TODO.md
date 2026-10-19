# TODO — GitHub issue #4 拆解与实施顺序

> 取证基线：`master` @ `29386ab`，包版本 1.3.6。
> 提报人基于 v1.3.5 测试；本清单涉及的 8 个文件自 tag `v1.3.5` 起 **零提交**（`git log v1.3.5..HEAD -- <file>` 全为 0），代码与提报人所测完全一致。
> 所有坐标已用 ripgrep + 行号打印逐条复核；运行时证据见文末「取证方式」。

## 标记口径

| 标记 | 含义 |
|---|---|
| 【成立】 | 断言与代码一致，已逐坐标或运行时确认 |
| 【口径修正】 | 现象成立，但提报人对性质/影响面的描述需改 |
| 【已推翻】 | 断言不成立，**不要按原话实施** |
| 【新增】 | 本次核实时新发现，issue 未提及 |

---

## 一、前置决策（阻塞后续多条，需先拍板）

| # | 待决问题 | 备选 | 阻塞项 |
|---|---|---|---|
| D-1 | `text-indent` 落纸单位 | A：`em`（随 `textFit='shrink'` 缩放字号跟随）；B：`pt`（与画布现有实现逐字一致，零分叉） | T-01 |
| D-2 | `objectPosition` 形态 | A：CSS 值原样透传 `string`；B：枚举预设（居中/偏上/偏下）+ 自定义输入 | T-03 |
| D-3 | 僵尸可选字段的处置 | A：删除 `lHeight` + `leftSpaceRemoved`；B：保留并标注 deprecated | T-06 |
| D-4 | 顶部工具栏窄视口策略　**已定案：自适应收纳**（按优先级链把按钮组收进「更多」，收尽仍不足则品牌区省略号兜底） | A：仅 `nowrap`；B：收起文字只留图标；C：允许换两行 —— 均未采纳 | T-07 已完成 |

---

## 二、待办清单

### T-01 长文本首行缩进出纸不生效（画布/出纸分叉）　【口径修正】

- **复验（2026-10-19，最新代码）**：结论不变，运行时仍红；坐标漂移见文末「五」。`longTextIndent` 声明现为 `types.ts:342`。
- **提报原话错在哪**：正文缺口 2 说 `longTextIndent`「仅声明、全仓库无消费」。实际画布与 common 都消费了它，真问题是 **core 渲染端不输出**，性质是「一致性缺陷」而非「功能缺失」，优先级应上调。
- **判断依据**
  - 声明：`packages/print-core/src/designer/types.ts:334`（`// 长文本特有` 段 :333）
  - 画布消费：`packages/print-canvas/src/components/elements/LongTextElement.vue:49` → `textIndent: o.longTextIndent ? o.longTextIndent + 'pt' : '0'`（**单位现为 pt**，非正文推测的 mm）
  - common 消费：`packages/print-common/src/shell/elements.ts:76` → 同口径 `pt`
  - 渲染端零消费：`packages/print-core/src/render/html-generator.ts` 全文 `text-indent` 计数 **0**；`textStyle()`（:335-353）与 `longText` 分支（:438-439）均未产出
  - 运行时：`longText` 元素 `longTextIndent: 2` 出纸 HTML 无 `text-indent`
- **改哪**：`textStyle()` 按 D-1 选定的单位输出 `text-indent`；若选 `em` 需同步把 :49 与 common :76 两处从 `pt` 改为 `em`，三端一致。
- **验收**：探针断言输出含 `text-indent:`；画布 / common / 出纸三端同一份 JSON 的缩进逐字比对；`npm run build` + `npm test -w @worm-vue3-print/core`。

### T-02 独立 image 元素的 fit 出纸被写死 contain　【成立】+「无类型级声明」【已推翻】

- **成立的部分**：画布按 `fit` 裁剪、出纸恒为 `contain`，两端分叉。
  - 画布消费：`packages/print-canvas/src/components/elements/ImageElement.vue:45` → `objectFit: (props.element.options.fit || 'contain')`
  - common 消费：`packages/print-common/src/shell/elements.ts:121` → `objectFit: o.fit || 'contain'`
  - 渲染端写死：`packages/print-core/src/render/html-generator.ts:412` → `object-fit:contain;`
  - 对照（单元格图片反而生效）：同文件 `:610` → `object-fit:${fit}`
  - 运行时：image 元素 `fit: 'cover'` 出纸得 `object-fit:contain`
- **被推翻的部分**：正文/补充 1 称「独立 image 元素无类型级 `fit` 声明，建议把 fit 提升到 ElementOptions 级」。**该声明已存在**：`packages/print-core/src/designer/types.ts:303`，且 :302 注释明写「内容缩放模式（image/qrcode）」。另 :213 那个 `fit` 所在接口是 `TableCell`（:177），不叫 `TableCellOptions`。→ 建议②「类型归位」无需实施。
- **影响面降级**：属性面板的缩放控件在 `packages/print-canvas/src/components/property/CodeGroup.vue:63`（写入 :132），挂载条件 `isCodeType = ['barcode','qrcode']`（`PropertyPanel.vue:26` + :243-246）——**独立 image 在 UI 上没有 fit 入口**。分叉仅对手写/导入模板 JSON 与宿主程序化赋值成立。
- **改哪**：`html-generator.ts:412` 把硬编码换成 `opts.fit` 变量（缺省 `contain`，行为与画布对齐）。是否顺带给 image 补 UI 控件属扩大范围，单列 T-02b 由 D-4 之外的产品决策。
- **验收**：`fit` 五档逐一出纸探针；`none`/`scale-down` 不劣化；未设 `fit` 的存量模板输出逐字不变。

### T-03 image 补 object-position 裁剪锚点　【成立】

- **判断依据**：全仓（含 `print-common`、`services/print-render`、`clients/print-client`、demo）`object-position` / `objectPosition` 命中 **0**；运行时出纸亦无。`cover` 恒按默认 `50% 50%` 居中裁剪。
- **改哪**：`ElementOptions`（types.ts:253 起，紧邻 :303 的 `fit`）加 `objectPosition`，按 D-2 定形态；`html-generator.ts:412`（独立 image）与 `:610`（单元格图片）的 `<img>` 补 `object-position`；画布 `ImageElement.vue:44-46`、`CellImage.vue:50`、common `elements.ts:121` 同步；属性面板 image 分组加入口。
- **验收**：`fit:'cover'` × `object-position:'center 20%'` 出纸与画布逐端比对；缺省（不设该字段）时输出不含 `object-position`，存量模板零变化。

### T-04 TextAlign 增加 justify　【成立】+【新增连带项】

- **复验（2026-10-19，最新代码）**：结论不变，`justify` 仍能原样透传落纸，`justify`×`verticalAlign` 仍回落 `flex-start`。**影响面比本条所列更宽**，见文末「五·T-04 的真实改档入口」。
- **判断依据**
  - 枚举缺档：`packages/print-core/src/designer/types.ts:101` → `export type TextAlign = 'left' | 'center' | 'right'`
  - 值已透传：`html-generator.ts:351` → `text-align:${opts.textAlign}`，运行时写入 `'justify'` 确实出纸（证实「实现成本主要在类型与面板」）
  - 回落缺陷：`html-generator.ts:332` `H_ALIGN_FLEX` 无 `justify` 键，:347-350 的 `verticalAlign` 分支对 justify 回落 `flex-start`
- **【新增·重要】回落不是输出端独有**：画布同一份逻辑 `TextElement.vue:57-61`、`LongTextElement.vue:61`、common `elements.ts:89` 都用 `H_ALIGN_FLEX[...] ?? 'flex-start'`。即 `justify` × `verticalAlign` 组合在**画布和出纸两端都**退化成左对齐（当前无分叉）。修的时候必须 core + canvas + common 三端同改，否则修完一端反而制造新分叉。
- **改哪**：`TextAlign` 加 `'justify'`；三端 `H_ALIGN_FLEX` 对 justify 的映射策略统一（建议容器转 `text-align:justify` 并让 flex 项取满宽）；属性面板对齐选择器加档位（表格单元格 `align?`（types.ts:198）同源，一并核）。
- **验收**：四端（画布 / common 预览 / 浏览器打印 / PDF）同一份 JSON 的段落右缘一致；模板重存后 `justify` 不被序列化白名单丢弃。
- **实施后补录（2026-10-19）**：主轴转纵向只解决了「行盒取不满宽」，单行文本仍不生效——CSS `justify` 不拉伸段落末行，一行文本的那一行就是末行。已按「撑满行宽含末行」口径在三端补 `text-align-last:justify`（core `textStyle()`、canvas `TextElement`/`LongTextElement`/`PageNumberElement`、common `textLikeStyle` 与 pageNumber 分支）。真实设计器实测：元素盒 349px、改前单行行盒 140px → 改后撑满 349px。
- **单元格同源缺口也已补**（本条「一并核」的那项）：工具栏在单元格上下文早能写 `align:'justify'`，属性台却只有三档、出纸也只出 `text-align:justify`。现 canvas/common 属性台补第 4 档「两端」，core `matrixCellStyle()` 与两端单元格样式成对输出。`<td>` 不需要主轴转纵向（实测非末行本来就齐右缘），只有末行这一条规则。实测：83px 表头格内容 48px → 撑满内容宽 73px。

### T-05 主题变量接通：把硬编码浅色改成 `var(--pd-*, 原值)`　【成立】

提报人评论 3 的坐标清单**逐条命中**，且「变量机制本身可用、只是这批控件漏接」的证据也成立：`--pd-surface` 定义于 `packages/print-canvas/src/components/PrintDesigner.vue:521`，并在 LeftPanel / DesignerToolbar / HelpModal 正常消费。建议按文件拆 4 个可独立合入的小项：

- **T-05a `packages/print-canvas/src/styles/native-controls.css`**
  - `:34` `.pd-input, .pd-select, textarea.pd-input` → `background: #fff`（同一条规则内 :32 的 border 已用 `var(--pd-border, #d9dde6)`，混用铁证）
  - `:107-116` `.pd-radio, .pd-checkbox` → `background: #fff`
  - `:226` `.pd-dialog` → `background: #fff`
  - `:267` `scrollbar-color: rgba(23, 32, 60, .18)`、`:277` `::-webkit-scrollbar-thumb` `rgba(23, 32, 60, .16)`（提报人把两处都记成 `.16`，:267 实为 `.18`；结论不受影响）
  - 参照正确实现：`:140` `.pd-button` 已走 `var(--pd-bg, #f4f6fa)`
- **T-05b `packages/print-canvas/src/components/ExpressionEditor.vue`**
  - `:464` `.ee-nav-tab:not(.active)` `background: white`（紧邻 :459 `.active` 已用 `var(--pd-accent)`；提报人记的 :461 是花括号行，实际属性在 :459）
  - `:470`、`:550` hover `#ecf5ff`；`:605-608` 预览错误态 `#e53e3e`/`#fef2f2`/`#fecaca`
  - `:650-684` 四张帮助卡片（字段/函数/变量/条件）底色+边框+标题字色共 **12 处**写死，计数与提报人一致
- **T-05c `packages/print-canvas/src/components/elements/TableContextMenu.vue`**
  - 整个 `<style scoped>` 段（:90-127）内 `var(--` 出现次数为 **0**；:96 本体 `#fff`、:105 文字 `#333`、:108 hover `#f5f7fa`、:120 分隔线 `#ebeef5`、:125 `#909399`
- **T-05d `packages/print-canvas/src/components/PresetColorPicker.vue`**
  - `:365` 触发器衬底、`:397` 色板浮层本体 `background: #fff`
- **统一形态**：写死值 → `var(--pd-*, 原值)`，fallback 取原值，浅色默认逐像素不变，向后兼容。
- **验收**：在 `.designer-container` 注入深色 `--pd-*` 变量集后，属性面板输入框、表达式弹窗、表格右键菜单、色板浮层无一处残留白底；未注入时截图基线与改前一致。

### T-06 清理零消费可选字段　【成立】+【新增】

- **判断依据**
  - `lHeight`：`types.ts:336` 仅声明，全仓零消费；与既有 `lineHeight`（渲染于 `html-generator.ts:345`）语义重复
  - **【新增】`leftSpaceRemoved`**：`types.ts:335` 同样仅声明、零消费，提报人未列出
- **改法**：按 D-3 选 A 则删除两字段；`longTextIndent` 属 T-01 激活范围，不在本项。
- **风险提示**：可选字段删除对旧模板表现为「残留键被忽略」，但仍需过一遍 designer 的模板 migrate 与 golden 夹具，避免断言基线漂移。

### T-07 顶部工具栏窄视口文本折行　【已解决】（2026-10-18，见「已完成」）

- **处置**：未按「加 nowrap」的最小方案做，改为**自适应收纳**（D-4 定案为收纳方案）：
  放不下时按优先级链把按钮组收进「更多」下拉，收尽仍不足才由品牌区省略号兜底。
  判定函数 `resolveToolbarOverflow` 上收到 `packages/print-core/src/designer/utils/toolbar-overflow.ts`，
  canvas 与 print-common 共用同一链序。
- **判断依据（运行时，改前）**：视口 1600 无折行；**1520 起 `.tb-btn-text`「排列」「视图」与 `.ft-btn-text`「对齐」「边框」全部折成 2 行**；
  980 / 850 / 700 逐档恶化，`.tb-title-name`→4 行 / 62px、`.tb-title-sub`→7 行 / 84px、`.tb-title` 整块 146px。
  提报人截图宽 1508，正落在折行侧。
- **【口径修正】不是「撑高」**：`.designer-toolbar` 高度钉死 `height: 50px`，工具栏本身不涨，
  实测折行内容**溢出条底 47px** 压到画布区。
- **根因**：文本类标签无 `white-space: nowrap` 且 flex-shrink 默认 1；组件内无任何 `@media` 断点。
- **验收（改后已跑）**：1600 / 1280 / 900 / 640 四档叶子文本折行数均 **0**，收纳数分别 1 / 4 / 6 / 9，
  `contentBleedBelowBar` 归 0；canvas 侧「边框」面板内选定的线型经「收窄→拉宽→再收窄」往返后仍在
  （证明 Teleport 未重挂实例）；common 侧 resize 往返可自动复位且控制台无告警。
- **修后补记（同日）**：初版把收纳单元做成了包装组件 `ToolbarOverflowUnit.vue`，其根节点是 `<Teleport>`
  而非元素，Vue 无法把宿主 scoped 属性挂上去 → 单元元素拿不到 `data-v-*` → `.tb-group` / `.ft-group`
  规则全部落空、退化成 `display:block`，字体与字号被竖排（用户反馈即此）。已改为宿主模板内联
  `<Teleport>` + `v-overflow-unit` 指令注册，组件删除；回归判据补上「单元必须 flex + 带作用域 + 单行」。
  修好内边距后自然宽变大，故 1600 档收纳数由 0 变 1。

### T-07a 遗留：嵌套浮层横向溢出（低优先，视觉）

- 现象：「更多」面板宽约 186px，而其内「边框」子面板实测 216px 宽，子面板向右溢出约 30px。
- 影响：功能可用、点击与关闭正常，仅视觉越界。
- 建议：给 `.tb-more-panel` 设定与内容匹配的最小宽，或让子面板按可用宽右对齐。

### T-07b 遗留：`resolveToolbarOverflow` 已进入 core 公共面

- 现状：由 `src/designer/index.ts` 导出，属 `/designer` 子路径的公开 API。
- 待办：发版前确认是否只作内部共用（则从导出面收回），避免宿主误以为是稳定契约。

### T-08 PresetColorPicker 多根导致 class 透传告警　【成立】，后果被掩盖

- **判断依据（运行时）**：页面加载即复现 `[Vue warn]: Extraneous non-props attributes (class) ... component renders fragment or text or teleport root nodes`，定位 `at <PresetColorPicker ... class="page-bg-picker">`。
  - 结构：`PresetColorPicker.vue:2-12` 是 `<button>`，:14 起是 `<Teleport>` → 双根
  - 全文件无 `inheritAttrs` 声明
  - 传入点：`PropertyPanel.vue:119`
- **【新增】class 是真的丢了**：DOM 查询 `.page-bg-picker` 结果为空，`PropertyPanel.vue:609-612` 的 `flex: 1; min-width: 0` **从未生效**。当前视觉无异常仅因触发器自带 `width: 100%`（`PresetColorPicker.vue:360`）掩盖，属潜在样式失效。
- **改哪**：组件收单根，或 `inheritAttrs: false` 后显式把 attrs 绑到触发器；同时确认 :609 样式是否需要改挂到实际生效节点。
- **验收**：console 该条警告归零；`.page-bg-picker` 在 DOM 中存在且 `flex` 生效；深色主题下面板位置不变（Teleport 到 body 的行为回归）。

### T-09 文档与技能同步（非独立需求，随上面各条）

- 新增/变更的模板字段（`objectPosition`、`TextAlign` 加档、`longTextIndent` 生效）须同步 `docs/`（中文权威全集 + 英文薄层）与 `skills/worm-vue3-print-integration`，并按既有惯例登记 CHANGELOG 三处同步点、`git diff` 级审查包边界。
- **注意**：`print-template-json` 技能脚本 `skills/print-template-json/scripts/build_template.py:81` 已有 `'indent': 'longTextIndent'` 映射，T-01 落地后该技能的示例模板会从「填了没用」变成「真生效」，需一并复核技能文档口径。

### T-10 demo-common 四个子 demo 顶部区同步收纳　【已完成 2026-10-19】

- 背景：主 demo（9303）顶部区已接入同一机制，demo-common 的 vue3 / vue2 / react / jquery 四个子 demo 顶部区**暂时落后**。
- 约束：仓库既有口径要求「子 demo 版式必须与 demo 完全一致」，不同步会形成新的观感漂移；`npm run styles:demo-common` 只同步样式，收纳链序与面板 DOM 需各宿主自己接。
- 现成可复用的口子：canvas 已公开 `provideToolbarOverflow` / `createOverflowUnitDirective` / `emptyToolbarOverflow`，落位槽与排除项走 `data-overflow-slot` / `data-overflow-more` / `data-overflow-spacer` 属性契约，宿主无需沿用 canvas 类名；vue2/react/jquery 需各自实现等价的「移动节点但不丢组件实例」搬运（vue2 无 Teleport 语义差异、jQuery 无组件实例概念，预期比 canvas 简单，直接搬 DOM 即可）。
- 验收判据照主 demo：逐子项断言「display:flex + 单行高度 ≤34 + 无文本折行 + 无溢出条底」，并实测面板内按钮事件仍生效。


**实施结论（2026-10-19）**：

- 四个子 demo 各自新增 `src/topbar-overflow.js`（判定与 core `resolveToolbarOverflow` 一致——直挂与无打包器宿主拿不到 core 子路径，故就地实现同一算法）与 `src/styles/topbar-overflow.css`（`demo-ui.css` 由 `sync-demo-styles.mjs` 同源生成、禁止手改）。
- 顶栏可折叠项统一包 `.demo-ou`（`display:inline-flex; flex:0 0 auto`），面板内 `data-overflow-slot` 落位；归位规则是「插到链中第一个仍内联的后继单元之前」，简单 append 会打乱原顺序。自然宽取 `scrollWidth`：用 `getBoundingClientRect().width` 会拿到被 flex 压缩后的值，误判「放得下」而让顶栏文本折行（即 T-07 原症状，实测踩过一次）。
- 入口时序：`demo-common/apps/react` 在 `main.jsx` 渲染后调用、vue2 在 `mounted()`、vue3 在 `onMounted()`；**Vite 下改入口文件必须整页重载**，只热更组件会看到「面板在但永不收纳」的假失败。
- 五档实测（1600/1280/900/700/640）：四宿主文本折行 0、内容溢出条底 0、顶栏恒 45px；收纳数 vue3/vue2/react 为 0/0/3/5/8，jquery 为 0/3/3/5/6（其常驻项更宽）。被移进面板的复选框仍随框架状态更新（class 加 `on`、文案「批量打印（3 份）」）且不被拉回行内。
- 三宿主 `npm run build` 全通过；`demo-common/scripts/verify-demo.mjs` 已扩到 **36 项**并四宿主 **36/36 全绿**（动作数排除 `.demo-more-trigger`；新增「顶栏接入自适应收纳」与「收纳数与组显隐一致」）。
- 顺带修掉一个既有缺陷：`.demo-host-switch-menu { display:flex }` 盖住 `<details>` 闭合态的 UA 隐藏，导致「宿主示例」下拉常驻并压在画布上；已在各宿主 `topbar-overflow.css` 补闭合态隐藏，**根治仍需落到 demo 样式源并重跑 `npm run styles:demo-common`**。
---

## 三、实施先后顺序

按「先拍板 → 零风险独立项先合 → 同文件冲突区合并做 → schema 变更殿后」排：

| 序 | 项 | 为什么这个位置 | 风险 |
|---|---|---|---|
| 0 | D-1 ~ D-3 决策（D-4 已定案） | T-01/T-03/T-06 的改法都被它锁死，不拍板动工会返工 | — |
| 1 | **T-05a–d** 主题变量 | 纯 CSS，`var(--pd-*, 原值)` 形态浅色默认逐像素不变，与 core 渲染管线零交集；可独立合成 `1.3.7` 先给社区可见进展 | 低 |
| 2 | **T-08** 多根告警 | canvas 单组件，10 分钟级，清掉每次进面板必现的 console 噪音，给后续 UI 验证留干净控制台 | 低 |
| 3 | ~~**T-07** 工具栏折行~~ **已完成**（自适应收纳，canvas + common 双宿主，core 共用判定） | 遗留 T-07a 嵌套浮层横向溢出、T-07b 是否收回 core 导出面 | — |
| 4 | **T-02 + T-03** image 一组 | 两项都改 `html-generator.ts:412`（独立 image 的 `<img>`）和 `:610`（单元格图片），拆开做必冲突 → 一个 PR；T-02 修分叉、T-03 在同位置加锚点 | 中（出纸行为变） |
| 5 | **T-01 + T-04** 文本一组 | 两项都改 `textStyle()`（:335-353），且 T-04 要同时动 `H_ALIGN_FLEX` 的 core/canvas/common 三端；同批做可共用「多端一致性」用例 | 中-高（跨三包） |
| 6 | **T-06** 僵尸字段清理 | schema 变更涉及 migrate 与 golden 夹具，放最后避免与 4/5 的基线刷新互相干扰 | 中（存量） |
| 7 | **T-09** 文档/技能/CHANGELOG 回写 | 字段最终形态定了才写，防止文档反复改 | 低 |

补充建议：

1. **发版切分**：1→3 归 `1.3.7`（纯修复，模板 schema 零变更）；4→6 归 `1.4.0`（新增可选字段 + 排版能力，向后兼容）。T-06 若走删除分支，按仓库既有口径评估是否该并进 major。
2. **T-02 与 T-04 的存量影响必须先各自出一轮结论**：`:412` 改用变量后，历史模板里若已带 `fit: 'fill'` 之类值，出纸会从 contain 变为 fill——这是**可见行为变更**，需在 PR 描述里写清并给迁移建议。
3. **发版时别忘了第三处同步点**：设计器内置「更新记录」`packages/print-canvas/src/help-content/changelog.ts` 只有已发布版本段，T-07 这条目前只登记在中英 CHANGELOG 的「未发布」里，切版本时需一并写进该文件（`<h2>V1.3.7<small>(日期)</small></h2>` 形态）。
4. **反向验收门禁**：T-02/T-03/T-01/T-04 每条合入后，重跑文末探针脚本，确认断言从红变绿、且「缺省不设字段」路径的输出与基线逐字一致（防止把兼容路径改坏）。

---

## 四、取证方式（复现用）

- **渲染层**：`node /tmp/issue4-probe.cjs`——离线直调 `packages/print-core/dist/index.cjs` 的 `generateHtml()`，一次给出 6 条判据（justify 透传 / justify×verticalAlign 回落 / `text-indent` 缺失 / `object-position` 缺失 / `fit:'cover'`→`object-fit:contain` / 实际落档）。
- **UI 层**：demo dev server 已在 `localhost:9303`（`vite.config.ts:27`，走源码别名，改即生效）。用 DevTools `resize_page` 逐档缩放后跑行数检测器。
- **检测器坑（务必照此写）**：判折行要用「Range 取 text 矩形后按 `top` 聚类数行数」。中文按字换行时每个字符矩形等高，用「矩形高度 ÷ line-height」会**假阴性**——本次首轮就这么漏掉了 900 档的折行，换检测器后才纠正。
- 本次验证未在仓库内留下任何文件，`git status` 干净；探针脚本置于 `/tmp`，属一次性验证件。

---

## 五、文本一组复验（2026-10-19，按工作区最新代码重跑）

复验环境：HEAD `1f5e906` + 未提交改动（二维码静区那批）。先 `npm run build -w @worm-vue3-print/core` 重建 dist，再跑 `node /tmp/issue4-text-probe.cjs`——探针改为**每个用例单独成模板出纸**，避免同页多样本时靠样式串扰定位。

### 基线漂移（只影响坐标，不影响结论）

- 文本一组涉及的源文件（`html-generator.ts`、`designer/types.ts`、`TextElement.vue`、`LongTextElement.vue`、`shell/elements.ts`、`html-generator.test.ts`）自 `v1.3.5` 起 `git log` 仍为 **0 提交**；差异全部来自未提交的 QR 改动。
- `types.ts` 坐标整体 **+8**：`longTextIndent` 334→**342**，`fit` 303→**311**，`ElementOptions` 起点 253→**254**，`TableCell.align` 198→**199**。
- `html-generator.ts`：`textStyle()`（:335-353）、`H_ALIGN_FLEX`（:332）、独立 image 硬编码（:412）**逐字未变**；单元格图片 `object-fit:${fit}` 610→**612**。
- 技能映射行号：`build_template.py` 的 `'indent': 'longTextIndent'` 81→**82**。
- 回归基线：`npm test -w @worm-vue3-print/core` → **62 文件 / 828 用例全绿**。

### 运行时判据

| 项 | 判据 | 结论 | 实测回显 |
|---|---|---|---|
| T-01 | `longText` + `longTextIndent:2` 出纸含 `text-indent` | **红（成立，待修）** | `position:absolute;left:0mm;top:24mm;width:60mm;font-size:10pt;overflow:visible;` |
| T-01 | `longTextIndent:3` × `textAlign:'right'` | **红** | 同上，仍无 `text-indent` |
| T-04 | `textAlign:'justify'` 原样透传 | **绿（证实「值已透传」）** | 末档 `text-align:justify` |
| T-04 | `justify` × `verticalAlign:'middle'` 不退化 | **红（成立，待修）** | `display:flex;align-items:center;justify-content:flex-start;text-align:justify` |
| T-02 | `image fit:'cover'` 不被写死 | **红**（顺带复跑，非文本项） | `<img … object-fit:contain;>` |
| T-03 | `object-position` 缺失 | **红**（顺带复跑） | 全仓命中仍为 0 |

### 【新增】T-04 的真实改档入口比清单列的多

原清单「属性面板对齐选择器加档位」只覆盖了一半，`justify` 要落地还需：

- canvas：`property/AppearanceGroup.vue:23-25`（左/中/右三个 radio）、`FormatToolbar.vue:82-88`（**顶部格式工具栏对齐按钮组**）、`FormatToolbar.vue:263-264`（按 `textAlign` 选图标，需补 justify 图标）
- common：`shell/property-panel.ts:96-98`（radio 组）、`shell/format-bar.ts:102-105`（按钮组）、`shell/format-bar.ts:185`（`ALIGN_ICON` 映射，缺档时回落 `'TextAlignStart'`）
- 写入通路：`composables/useFormatToolbar.ts:131`（单元格写 `c.align`）与 `:148`（元素写 `o.textAlign`）——两条都要认 justify
- 硬 cast：`elements/PageNumberElement.vue:24` 写死 `as 'left' | 'center' | 'right'`，类型加档后此处需同步放开

### 【新增】两处原判据可以作废

- **「重存后 justify 被序列化白名单丢弃」不存在**：导出与复制走 `JSON.parse(JSON.stringify(...))` 深拷贝（`useDesignerState.ts:192`、`:208`、`:535`），designer 侧不存在 options 键白名单（`ZONE_ALLOWED_TYPES` 管的是元素类型，不是键）。T-04 验收项按「无过滤」处理。
- **docs 里根本没有 `longTextIndent`**：`grep -rn longTextIndent docs` 命中 **0**。T-09 对本项不是「同步」而是**补写**（中文权威全集 + 英文薄层都缺）。

### 对 T-01 改法的一点补充（需与 D-1 一并拍板）

`textStyle()` 被 `longText`（:439）与 default/`text`（:443）共用，而画布与 common 只在 **longText** 元素上消费 `longTextIndent`（`LongTextElement.vue:49`、`shell/elements.ts:76`）。若照原计划把 `text-indent` 放进 `textStyle()`，手写 JSON 给 `text` 元素塞 `longTextIndent` 时会「出纸生效、画布不生效」——**修一个分叉造出另一个**。建议改在 `case 'longText'` 分支输出，与画布语义逐字对齐。

- 技能链闭环已实测：`build_template.py` 吃简写 scene（`align: justify` + `indent: 2` + `fit: cover` + `anchor: center 20%`）→ `validate_template.py` 0 错 0 警 → 产物直喂 `generateHtml()`，出纸样式为 `text-align:justify;text-indent:2em` 与 `object-fit:cover;object-position:center 20%`，即 SKILL.md 里写的判据自查通过。
- `skills/` 两份技能已按「权威在仓库、方向仓库→全局」同步到 `~/.agents/skills`（先备份到 `/tmp/skills-backup-*`，`diff -rq` 差异 0）。
### 待决

- **D-1 仍未拍板**（`em` vs `pt`）。实测事实：画布与 common 现均为 **`pt`**（两处逐字相同），选 B 则 core 单边对齐、零分叉；选 A 要同时改两处宿主代码。

---

## 六、下一批规划（2026-10-19，结合 GitHub issue 现状）

issue 面：`#4` 是仓库**唯一 open** issue（#1–#3 已 closed），提报人四组反馈 = 排版三缺口 + 视口折行 + PresetColorPicker 告警 + 深色变量；最后一条是维护者 10-18 的「反馈已经收到」。**下一个该修 = T-05a–d + T-08 合并为一个批次**，理由：

- 排版三项撞 core 渲染管线，属**可见行为变更**且被 D-1/D-2 锁死，不宜当下一批；
- T-05/T-08 零 schema 变更、纯 UI 层、与在途 WIP（T-10 那批：`DesignerToolbar.vue`/`ToolbarMore.vue`/`useToolbarOverflow.ts`/`index.ts`/demo）**文件零交集**，可并行；
- **T-08 与 T-05d 同改 `PresetColorPicker.vue`**，拆开会自撞，必须同批；
- 折行（T-07）已在 `1f5e906` 但尚未发版 → 本批合入后切 `1.3.7`，是提报人能看到的第一版。

### 复验后的坐标修正（`native-controls.css` 在 `db39f37` 后有 1 个提交，其余四个文件仍 0 提交）

| 项 | 最新坐标 | 说明 |
|---|---|---|
| T-05a 输入类 | `:96`（规则起 `:86`） | `.pd-input, .pd-select, textarea.pd-input` |
| T-05a 选项 chip | `:178`（规则起 `:169`） | `.pd-radio, .pd-checkbox` |
| T-05a 弹窗 | `:288` | `.pd-dialog` |
| T-05a 滚动条 | `:329` `.18` / `:339` `.16` / **`:345` hover `.30`** | 【新增】TODO 原记两处，实为三处 |
| T-05b | `:464` `white`、`:470`/`:550` `#ecf5ff`、`:606-608` 红三件、帮助卡片 `:650-684` | 坐标未变 |
| T-05c | `:96/:105/:108/:120/:125`，整文件 `var(--` 计数仍为 0 | 坐标未变 |
| T-05d | `:365` 触发器衬底、`:397` 浮层本体 | 坐标未变 |
| T-08 | `:2-12` button + `:14` Teleport 双根、全文件无 `inheritAttrs`、`PropertyPanel.vue:119` 传 class、`:609`/`:613` **两条** `.page-bg-picker` 规则 | 双根告警原样复现 |

### 【新增】两处会卡住实现的坑

1. **`:144` 的 `background: #fff` 属 `.pd-switch::after`（开关滑块），必须豁免**。它是深色轨道上的正确形态，机械换成变量会把深色态开关涂黑。扫描写死值时按选择器归属逐条判定，不能按颜色值批量替换。
2. **「浅色默认逐像素不变」与提报人建议的变量映射相冲突**。现令牌表（`PrintDesigner.vue:520-546`）里：`--pd-field-bg` = `#f4f6fa`（≠ 输入框的 `#fff`）、`--pd-sidebar-hover` = `#f0f3f9`（≠ `#ecf5ff`）、`--pd-text` = `#2a2e37`（≠ `#333`）、`--pd-border-soft` = `#e9ecf2`（≠ `#ebeef5`）。按建议直接挪用会让浅色默认变色。
   → 采**新增令牌**路线：`.designer-container` 变量块补 `--pd-input-bg`、`--pd-chip-bg`、`--pd-menu-text`、`--pd-menu-hover`、`--pd-menu-divider`、`--pd-scrollbar` / `--pd-scrollbar-thumb` / `--pd-scrollbar-thumb-hover`，浅色值取原值；使用处写 `var(--pd-*, 原值)`。令牌只在一处定义，深色主题方可逐位覆盖。
   `--pd-surface` = `#ffffff` 与 dialog/浮层/右键菜单本体的原写死值同色，**可以直接挪用**。

### 【新增】common 侧不用改第二遍

`packages/print-common/scripts/gen-styles.mjs` 从 `print-canvas/dist/canvas.css` + `native-controls.css` 派生 `src/styles/designer.css`（已 gitignore，构建时生成）。改完 canvas 只需：

```
npm run build -w @worm-vue3-print/canvas
npm run styles -w @worm-vue3-print/common
```

四个宿主（vue3/vue2/react/jquery）自动同源，T-05 的「多端一致」在 CSS 层是免费的——但**验收必须跑这两步并核对派生结果**，否则 common 侧继续留白底。

### 验收（本批）

1. 浅色基线不变：同一构建下取 `.pd-input`/`.pd-radio`/`.pd-dialog`/右键菜单/色板浮层/表达式弹窗的 computed background，改前改后逐字比对（含 `:144` 仍为 `#fff`）。
2. 深色注入：`.designer-container` 挂深色令牌集后，上述位点无白底残留，滚动条可见。
3. console：`Extraneous non-props attributes (class)` 归零，`.page-bg-picker` 在 DOM 中存在且 `flex:1` 生效（`PropertyPanel.vue` 两条重复合并）。
4. `npm run build` + `npm test -w @worm-vue3-print/canvas` + common 侧重跑 `styles` 与 `test`。
5. 发版登记三处同步点：中英 CHANGELOG + `help-content/changelog.ts`（`<h2>V1.3.7<small>(日期)</small></h2>`）。

### 后续排序（不变，各批的首个动作是拍板）

| 批 | 内容 | 需先定 | 版本 |
|---|---|---|---|
| B（下一个） | T-05a–d + T-08 | — | 1.3.7 |
| C | T-02 + T-03（同改 `html-generator.ts:412`/`:612`，一个 PR） | **D-2** | 1.4.0 |
| D | T-01 + T-04（同改 `textStyle()`，三端） | **D-1** | 1.4.0 |
| E | T-06 僵尸字段 | **D-3** | 1.4.0 / 待评 major |
| F | T-09 文档·技能·CHANGELOG 回写 | — | 随各批 |

建议拍板口径：D-2 取 **A（CSS 值原样透传）**——提报人要的 `center 20%` 用「居中/偏上/偏下」三档预设表达不了；D-1 取 **A（`em`）**——与 Word/WPS「首行缩进 2 字符」形态一致，且 `textFit='shrink'` 缩字号时缩进跟随，代价是 canvas/common 两处 `pt`→`em` 同改；D-3 取 **A（删除）**——两字段自 `v1.3.5` 起零消费，按 minor 发并在 CHANGELOG 写明「残留键被忽略」。

---

## 七、实施记录（2026-10-19，批次 B/C/D/E + 文档回写）

拍板按「六·建议口径」执行：D-1 = **em**、D-2 = **CSS 值原样透传**、D-3 = **删除**。

### 已落地

| 项 | 落点 | 关键实现 |
|---|---|---|
| T-01 | `html-generator.ts` 新增 `indentStyle()`，仅 `case 'longText'` 输出 `text-indent:Nem`；画布 `LongTextElement.vue:49` 与 common `elements.ts` 两处 `pt`→`em` | 不放 `textStyle()`——它被 `text` 共用，会造出「出纸生效、画布不生效」的新分叉 |
| T-04 | `TextAlign` 加 `'justify'`；core `textStyle()`、画布 `TextElement/LongTextElement`、common `textLikeStyle()` 三端同策：**justify × verticalAlign 时把 flex 主轴改纵向**（`flex-direction:column`），交叉轴默认 stretch 让行盒取满宽；档位入口：画布属性台「两端」radio + 格式工具栏第四格（lucide `TextAlignJustify`），common `property-panel.ts` / `format-bar.ts` 同步，common 图标表由 `gen-icons.mjs` 自动派生 | 横向 flex 的匿名文本项无法拉伸，是改前回落成左对齐的真因 |
| T-02 | `html-generator.ts:412` 的 `object-fit` 由写死 `contain` 改为 `opts.fit \|\| 'contain'` | 未设 `fit` 的模板输出逐字不变（已用断言锁死） |
| T-03 | `ElementOptions.objectPosition` + `TableCell.objectPosition` + **`RenderCell.objectPosition`** + **`data-binder` 透传**；出纸在独立 image 与单元格图片的 `<img>` 上按需输出；画布 `ImageElement`/`CellImage`(+`TableElement` 传参)、common `imageStyle`/`table.ts` 两处同步；属性台「内容」分组为 image 加「缩放模式」「裁剪锚点」 | `data-binder` 的单元格映射是**逐字段列举**，不补 `objectPosition` 就会在动态表格静默丢字段（与 qrQuietZone 同一坑）；非法值（`;` 引号 `url()` 等）整条丢弃——`escapeInlineStyleValue` 只转义 `&` 与引号，挡不住用 `;` 追加声明 |
| T-06 | 删除 `lHeight`、`leftSpaceRemoved`（全仓零消费已复核） | |
| T-05a–d | `native-controls.css`（输入类/chip/dialog/滚动条三档）、`ExpressionEditor.vue`（页签/hover/错误态/四张帮助卡片）、`TableContextMenu.vue`（全量）、`PresetColorPicker.vue`（触发器+浮层）改 `var(--pd-*, 原值)`；26 个新令牌登记在 `PrintDesigner.vue` 的 `.designer-container` | **`.pd-switch::after` 开关滑块白底显式保留**；`--pd-field-bg` 等现有令牌因值不同一律不挪用 |
| T-08 | `PresetColorPicker` 加 `defineOptions({ inheritAttrs: false })` + 触发器 `v-bind="$attrs"`；`PropertyPanel` 把 `.page-bg-picker` 挪到真实 `div` 承载 | class 能落到 fragment 子根，但**父作用域 `data-v-*` 不会**，所以 `.page-bg-picker[data-v-*]` 一直匹配不上——只修 attrs 仍不生效 |
| T-09（部分） | 中英 CHANGELOG 的「未发布/Unreleased」补 Added/Fixed/Removed 条目；`skills/print-template-json/references/template-schema.md` 的 `textAlign` 行补 `justify`，并新增 image 的 `objectPosition`、`longText` 的 `longTextIndent`（em）与「排版口径」段；`build_template.py` 的 image 简写加 `anchor→objectPosition`；`docs/中文/指南/使用指南.md` 补对齐/缩进/锚点口径；`PARITY.md` 登记 common 属性台入口落后一行并更新 common 用例计数 142/13 spec | 未切版本，故 `help-content/changelog.ts`（canvas 与 common 两份）留到发版时登记 |

### 验证

- 实施前基线：`npm run build` exit 0；`npm test` 全绿；core 62 文件 / 828 用例。
- 实施后：`npm run build` exit 0；`npm test` exit 0 —— core **63 文件 / 842 用例**（+1 文件 / +14 用例）、canvas **56 文件**（新增 `TypographyIssue4.spec.ts`）、common **13 文件 / 142 用例**（新增 `typography-issue4.spec.ts`）、render 服务 14 文件。新增用例覆盖：缩进 em 与 shrink 联动、`text` 元素不消费缩进、justify 三档存量不变、`fit` 五档、缺省输出逐字不变、单元格图片两条路径、非法锚点整条丢弃。
- 浏览器（demo 9303，真实事件链 + 真实 core 产物）：
  - 出纸几何实测——同一段文字，`justify` 非末行右缘偏差 **0px**，`left` 偏差 **32px**（4 行，容器 340px）；`text-indent:2em` 计算值 26.67px = 2 × 13.33px，`_fitFontSize=8` 时缩进随字号缩为 21.33px。
  - image 出纸 `object-fit:cover;object-position:center 20%` → 计算值 `cover` / `50% 20%`。
  - 画布真点「两端」+「垂直居中」→ 元素计算样式 `textAlign=justify, display=flex, flexDirection=column, justifyContent=center`。
  - 深色注入 `.designer-container` → `.pd-input/.pd-select/.pd-radio/.preset-color-trigger` 全部跟随令牌，`scrollbar-color` 跟随，`.pd-switch::after` 保持白；撤除后回白。
  - T-08：`.page-bg-picker` 现为带 `data-v-2fb86f68` 的 `div`，`flexGrow=1 / minWidth=0`；页面重载后 console 无 `Extraneous non-props attributes` 告警（仅剩既存 a11y 提示「form field 应有 id/name」，新增两控件已补 `aria-label`）。
- 两处口径更正：
  1. 「`PropertyPanel.vue` 有两条 `.page-bg-picker` 规则」是**错报**，实际只有一条（:609）。
  2. 「`.pd-radio` 深色不跟随令牌」是**探针假阳性**——该规则带 `transition: background .14s`，同步读到的是过渡起点；等 320ms 后全部变深。

### 仍未做（不冒充完成）

- ~~`longTextIndent` 没有属性台入口~~ **已补**：画布「外观」组加「首行缩进 (字符)」（StepperInput，仅 `longText` 显示），common 同位同文案；说明与搜索关键字统一登记进 core `PROPERTY_REGISTRY`（`ap-long-text-indent` / `ap-img-fit` / `ap-img-object-position`）。
- ~~common 侧 image 控件缺失~~ **已补**，`PARITY.md` 那一行已从「⏳ common 落后」改为 ✅。

### 补做面板入口时抓出的两个真问题

1. **common 的 `h()` 不摊平嵌套子节点**：我第一版把 image 的两行写成 `[gateItem, gateItem]` 塞进三元表达式里，真实浏览器拖入图片即 `Uncaught TypeError: Cannot convert undefined or null to object`（栈在 `paint → ee` 递归），画布整片空掉。改成平铺条件项后消失，并已用 `property-search.spec.ts` 的用例钉住。
2. **注册表关键字跨组撞车**：给「裁剪锚点」加了裸关键字 `位置` 后，搜「位置」会连带点亮「外观」组，直接打破既有门控用例。已从该字段的关键字里去掉（`位置` 归「位置与尺寸」组独占）。
### T-07a（本轮补做，已实测）

- **T-07a 已修（本轮补做）**：1000px 仿真视口下真实打开「更多」→「边框」，实测父面板 186px、子面板 218px（左边距 17）→ 向右溢出 **48px**（比原先记的 30px 更严重）。`native-controls.css` 加 `.tb-more-panel { min-width: 244px }`（17+218+9 的实测和），改后父面板 246px、溢出项 0；print-common 侧「更多」面板天然 282px（子面板 218 放得下），同一条规则无副作用。规则经 `npm run build -w canvas` + `npm run styles -w common` 进入 `dist/common.css`，两端各自在浏览器里量到宽度。
### 事故披露（同日，已修复）

- 我给 CHANGELOG 与 `template-schema.md` 写「未发布段插入条目」的辅助函数有 bug：拼接时漏掉了截断点之后的尾段，一度把两份 CHANGELOG 的已发布历史（中文 281 行 / 英文 386 行）与 schema 的 67 行截掉。已用「当前文件 + `git show HEAD:` 的对应尾段」回补，逐文件核对：无重复 `## ` 标题、行数回到 HEAD 基线 + 我的新增（342/453/176），`git diff --numstat` 对这三份文件只剩纯新增（14/15/9 行），并行会话未提交的「收纳」条目 4 处仍在。

### 补做后的验证（第二轮）

- `npm run build` exit 0；`npm test` exit 0，但根脚本只串了四个 workspace：**core 63/842、canvas 56/454、common 13/145、print-client 14/110**。
- **口径更正**：我先前把「14/110」记成 render 服务的结果，实际那是 `clients/print-client`——根 `npm test` 只串 core/canvas/common/print-client，**不含 `services/print-render`**。已按 AGENTS.md 补跑，并新增 `src/typography.integration.test.ts`（3 条：真实 Chromium 的测量分页后最终 HTML 仍带 `text-align:justify`/`flex-direction:column`/`text-indent:2em`/`object-fit:cover`/`object-position:center 20%`、缺省图片逐字保持 `object-fit:contain` 且无锚点、非法锚点整条丢弃；并把该模板经 `renderPdf` 出成 `%PDF` 非空产物）→ render 工作区 **8 文件 / 27 用例全绿（exit 0）**。
- **单元格锚点入口已补**：`TableCellGroup.vue`（canvas）与 `table-props.ts`（common）在图片单元格出「裁剪锚点」，canvas 侧 +2 用例（写入去空格、清空回未设置、文本单元格不显示该行）。
- 最终门禁：`npm run build` exit 0；`npm test` exit 0（core 63/842、canvas 56/456、common 13/145、print-client 14/110，均逐工作区单独复核过汇总行）；`npm run test -w @worm-vue3-print/render` exit 0（8/27，含新增 `typography.integration.test.ts` 3 条端到端）。
- 仍缺的浏览器证据：demo 9303 的示例表格是 `dataSource` 动态绑定，画布渲染的是数据行而非我编辑的行模板，所以「单元格图片真的按锚点裁切」这一条只在 core 单测 + render 集成用例里验过，没能在示例模板上肉眼量到；面板写入本身已实测（切「图片」→「裁剪锚点」行出现 → 回显 `center 20%`）。
- 浏览器 canvas 宿主（9303）：真实拖入「长文」→ 属性台出现「首行缩进 (字符)」且 `.pd-help` 带注册表说明 → 输入 4 → 画布 `.print-longtext` 计算值 `text-indent: 64px = 4 × 16px`、首行左缘偏移 64px；删掉临时元素后回到 8 个。
- 浏览器 common 宿主（9331，Web Component + Shadow DOM）：拖入长文后步进钮两次 → 面板回显 `2`，`.print-longtext` 计算 `32px = 2 × 16px`；拖入图片 → 「缩放模式」（5 选项）与「裁剪锚点」两行都在，说明文案长度均 >10 字符，写 `cover` + `center 20%` 后活树里该 `<img>` 行内样式为 `object-fit: cover; object-position: center 20%`，计算值 `cover` / `50% 20%`。两个宿主演示模板都没有 localStorage 持久化，测毕重载页面即回到初始 6 个元素。
- 第三处探针更正：读 `img` 样式时我用了 repaint 前抓的 `imgWrap` 引用，common 每次重绘重建子树 → 拿到的是脱离文档树的旧节点，误判「写入没生效」；改为重新查询活树后证据正常。**面板类断言一律重新查询节点，不复用上一轮的引用。**
