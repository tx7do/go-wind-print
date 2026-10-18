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

- **判断依据**
  - 枚举缺档：`packages/print-core/src/designer/types.ts:101` → `export type TextAlign = 'left' | 'center' | 'right'`
  - 值已透传：`html-generator.ts:351` → `text-align:${opts.textAlign}`，运行时写入 `'justify'` 确实出纸（证实「实现成本主要在类型与面板」）
  - 回落缺陷：`html-generator.ts:332` `H_ALIGN_FLEX` 无 `justify` 键，:347-350 的 `verticalAlign` 分支对 justify 回落 `flex-start`
- **【新增·重要】回落不是输出端独有**：画布同一份逻辑 `TextElement.vue:57-61`、`LongTextElement.vue:61`、common `elements.ts:89` 都用 `H_ALIGN_FLEX[...] ?? 'flex-start'`。即 `justify` × `verticalAlign` 组合在**画布和出纸两端都**退化成左对齐（当前无分叉）。修的时候必须 core + canvas + common 三端同改，否则修完一端反而制造新分叉。
- **改哪**：`TextAlign` 加 `'justify'`；三端 `H_ALIGN_FLEX` 对 justify 的映射策略统一（建议容器转 `text-align:justify` 并让 flex 项取满宽）；属性面板对齐选择器加档位（表格单元格 `align?`（types.ts:198）同源，一并核）。
- **验收**：四端（画布 / common 预览 / 浏览器打印 / PDF）同一份 JSON 的段落右缘一致；模板重存后 `justify` 不被序列化白名单丢弃。

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
