## v1.3.10（2026-10-24） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.10（2026-10-24）—— 简体中文

本版把三件事做到位：**「排满换行」的明细栏位终于成了一等元素**（流式列表 `flowList`，起因 GitHub issue #5 的中药处方单）；**属性台每一行的默认值与边框状态都所见即所得**（每行一个「恢复默认值」图标，单元格与元素的边框改成回显真实规格）；**预览缩放与出纸几何同源并下沉 core**（四个 Common 宿主 demo 也补上了档位条）。因字体版权，本版**撤掉了新建元素的默认黑体**——该预置只存在于本版开发过程，从未随任何已发布版本出厂。模板 schema 无破坏性变更；未使用新元素的存量模板出纸逐字不变，除下方「行为变更与影响面」列明的四项。自 v1.3.9 以来 82 次提交。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.10 @worm-vue3-print/canvas@^1.3.10
```

发布到 npm 的正式包仍只有 `core` 与 `canvas`。实验性的 `@worm-vue3-print/common` 仍以预览版发布：dist-tag `next`，自身版本 `1.3.7-beta.0` 与主线**不同步**（本版只把它对 `core` 的依赖范围抬到 `^1.3.10`），**不进 `latest`**，安装写 `npm i @worm-vue3-print/common@next`；`services/print-render` 与 `clients/print-client` 不发布 npm，分别以 Docker 镜像与 GitHub Release 安装包分发。

### 新增

- **流式列表元素 `flowList`**：按「每行 N 列」把一组明细横着密排、排满换行，适合处方药材、配件清单这类没有格线的栏位（表格画不出无边框栏位，长文本只会按字符把词切两半）。每行列数、行高、单元横向间距**都由作者指定**，列数不自动算；单元内容是一条**完整表达式模板**（`{drugs.name} {drugs.spec}`），列表数据源由表达式里出现的数组字段自动检出，属性台没有「列表数据源」这一行。两项新能力：**内容过长时跨列**（缺省关；打开后比一列宽的条目吃掉 2 个及以上列位，当前行不够就把**整条**挪到下一行行首，绝不切词）与「最多跨几列」上限（上限**钳到每行列数**，是全案唯一会改用户填值的行为）；**列数挤不下只提示「可放约 N 列」，不回写用户的数**。**一框一页**：数据多过框高按既有 `textFit` 三档处理（缺省截断），不接分页引擎、不续页。**跨列只在出纸生效**——画布设计态既不跑测量也不跑分页，以预览 / 出纸为准。落点：core 新增 `render/flow-list.ts`（纯逻辑无 DOM，三端与两套外壳同源）、`data-binder` 让非表格元素也能消费数组、`html-generator` 输出 CSS Grid。
- **属性台每一行都有「恢复默认值」**：凡有出厂默认值的属性行，标签行最右侧统一新增图标（`RotateCcw`，与工具栏同一 lucide 来源，画布与 print-common 两套外壳同形同图标）。点一下把该行写回**该层的出厂值**：元素项回 `createDefaultOptions(元素类型)`、表格级默认回新建表格的出厂值、单元格项清空自身值交还给表格默认、水印 / 拼版 / 页面背景回各自常量。图标常驻但**只在当前值 ≠ 出厂值时点亮**，已是默认值时置灰且点击不产生历史条目；悬浮提示直接报目标值（如「恢复默认值（12 pt）」，单元格行报「跟随表格默认」）。**只有逐项、没有批量**。两套外壳各 75 行（外观 14、裁剪锚点与放大比例 2、条码 11、高级 3、表格设置 4、单元格 24、边框与背景 3、水印 5、拼版 8 含目标纸页边距 4、页面背景 1）。**默认值没有新增存储**：重置目标按派生现算，`PROPERTY_REGISTRY` 为此新增的 `default` / `defaultUnit` 两字段**只喂提示文案、不参与任何行为判定**。
- **预览缩放判据下沉 core，四个 Common 宿主 demo 补上档位条**：core 新增 `designer/utils/preview-zoom.ts`（`resolvePrinterDpi` / `paperWidthPx` / `fitZoom` / `zoomPresets` / `defaultZoomKey` / `applyPreviewViewZoom` 等，一并由 `/designer` 导出），画布 `PrintHtmlPreview` 改为直接消费 core，四宿主各出一个 `createPreviewZoom({getTemplate, measureContainer})` 小封装并渲染同类名档位条。此前档位只做在 canvas，而四宿主自行复刻预览层、至今没有档位条（热敏标签在屏幕上仍表现为条粘连）。
- **条形码三处控制 + 推荐提示**：`barHeight` 条高（mm，只量黑白条本体、不含下方文字，「条宽优先」为硬规则）、`barQuietZone` 静区（模块，0~20，缺省 10）、条宽倍率上限由 4 抬到 8（每模块首选宽可到 1mm）。选了打印机分辨率后，「条宽（倍率）」下方输出**推荐档与当前折算**（203dpi 推荐 3、300/600dpi 推荐 2），**只给参考、不回写 `barWidth`**；计算与文案单点在 core 的 `recommendBarcodeBarWidth`。
- **元素台「边框与背景」补齐到与单元格同一形态**：新增线型下拉与「全部 / 外侧 / 内部 / 无」预设、上右下左单边勾选（rect / oval / hline / vline / table 用 border 画自身本体，写分边不出效果，故不给这两行；「内部」对元素恒置灰——元素只有一圈边）。与单元格不同，**元素台的线型 / 宽度 / 颜色改了立即生效**（元素自带整圈三字段，它本身就是规格来源），宽度为 0 时点「全部 / 外侧」兜到缺省 `0.75pt`。落盘逻辑收编进 core 的 `applyElementBorderPreset` / `setElementBorderEdge` / `resolveElementBorderSpec` / `elementBorderEdgeVisible`。
- **core 的字体目录纯函数补为公共导出**：`print/fonts.ts` 新增 `findFontOption` / `fontOptionLabel` / `normalizeFontQuery` / `filterFontOptions`（族名与展示名取更优档：相等 > 前缀 > 子串 > 子序列）。此前这套分档在画布与 print-common 各存一份，现两处共用。
- **示例库增至 13 份**：新增「中药处方笺」（A5 纵向、11 味药其中两味带炮制备注，实测出纸 4 行、两味长条目各占 2 列位、4 行 × 8mm 恰好等于框高 32mm、单页不断链）与两份**电池模块出货标签**（95×75mm 单枚四列栅格，含 SN 条码 / 无 SN 标签格，只差一行的格子划分，便于 A/B 对照）。demo-common 四宿主 `templates.js` 已同步重生成。
- **技能 `print-template-json` 补上流式列表**：`scripts/build_template.py` 的元素类型表此前没有 `flowList`，脚本编不出这种元素。现补入中文名、简写映射与编译期出厂值（4/8/4/false/2，与设计器同值），并把「跨列上限钳到每行列数」实现进脚本；单元模板缺失时报编译失败而非静默出空元素。

### 变更

- **单元格台改为「单选回显、多选只批写」**：判据是选区内的**可写格数量**（跳过 `merged` 占位格）——恰好 1 个才回显该格配置（跨行 / 跨列的合并格只有一个可写主格，仍按单选回显）；≥2 个时整组进入批量设置态，文本 / 数字留空并显示「多选」占位、下拉出禁用的「多选」项、单选复选不选中，本次批写过的值记在**按选区隔离的本地草稿**里、换选区即清空。类型专属行（码制 / 条宽 / 静区 / 条高 / 纠错 / 缩放 / 最大宽高）仅在全部可写格同类型时出现。单点：core 新增 `collectWritableCells` / `resolveCellGroupMode` / `resolveSharedCellType`。
- **边框一律回显真实状态**：单元格台四边按下态由选区 `borders` 派生，点击只切那一条边（不再把该格已有的其余三条边写没）；「线型 / 宽度 / 颜色」三行显示选区当前真实规格，**四边规格不一致的字段留空并标「混合」**，**一条边都没有时回显「无 / 0」**（此前显示缺省实线 0.75，看起来像有一条看不见的框），选任一非无线型时自动补缺省宽度 0.75。**顶部工具栏的边框面板同样回读单元格选区**（此前是初始化一次的本地草稿，选任何带非默认边框的格子都显示实线 0.75 #333）；多选时三行落缺省档作为批写源。单点收口在 core：`resolveBorderEdgeStates` / `setCellBorderEdge` / `resolveCellBorderDisplay` / `resolveElementBorderDisplay` / `elementBorderEdgeVisible` / `elementVisibleBorders` / `effectiveElementBorderSpec` / `setElementBorderField` / `setElementBorderEdgeVisible`。
- **线型新增「无」，工具栏线型图标允许一个都不选中**：语义是**线型＝无 ⇔ 这里没有边框**。选项单点存 core `BORDER_LINE_STYLES`。顺带修掉 common 单元格台线型下拉的选中回落（只靠 `<option selected>` 在内核不一致时会落到第二项）。
- **表格单元格文本按换行符断行，英文单词不再被逐字拆开**：可换行档（`wordWrap` 缺省 `true`）三端统一改为 `white-space:pre-wrap;word-break:normal;overflow-wrap:break-word`——`\n` 真的换行、连续空格与行首空格原样保留、英文按整词换行（中文仍按字断），只有一个词本身比列宽还长时才在行末兜底切一次（Word/WPS 口径）。`wordWrap: false` 档逐字不变。
- **取消字体预置（版权裁决）**：`createDefaultOptions` 不再写 `fontFamily`，字体下拉不再列出内置字体档，候选只来自宿主 `fonts` prop 声明的模板字体（随模板分发、授权由宿主自负），清单外字体名仍可手工键入并写入模板。单元格继承序「单元格自身 → 表格默认 → 交还 CSS 继承」与 `tableDefaultFontFamily` 字段保留。**存量模板逐字不变**，不做 migrate、不改 schema。
- **print-common 的静区两行与字体候选按画布判据收口**：未设置时两侧都**留空靠占位提示**（「默认 10」/「默认 0」）；「把缺省值原样再敲一次要不要落键」也统一到画布口径（此前两侧导出 JSON 的键存在性不同，出纸一直一致）。字体候选不再接受裸字符串条目，`host.fonts` 类型同步收紧。
- **四个 Common 宿主 demo 的顶栏收纳判定改调 core 同一函数** `resolveToolbarOverflow`（画布 `useToolbarOverflow` 用的也是它），1440/900/700/560 四档实测收起数逐档一致（2/7/8/9）。

### 移除（破坏性）

- core 移除 `DEFAULT_PRINT_FONT_FAMILY` 与 `SYSTEM_FONT_OPTIONS` 两个导出；`withSystemFontOptions` 改名 `normalizeFontCatalog`，行为收窄为「整理宿主声明 + 族名大小写不敏感去重」。三者都是本版内先加后撤的过渡产物，**从未随任何已发布版本出厂**，下游不存在需要迁移的旧调用点。
- **画布移除内部 `composables/usePreviewZoom.ts`**：档位与纸宽结算已下沉 `core/designer`。它从未进 `@worm-vue3-print/canvas` 的公共导出，文档与 demo 也无引用；深路径引用它的外部代码需改引 core。
- **print-common 移除 `core/font-catalog.ts` 及其 `buildFontCatalog`**：字体候选整理单点到 core `print/fonts.ts`。该模块未进本包公共导出。
- **print-common 的 `fonts` 契约由 `readonly (string | PrintFontDeclaration)[]` 收紧为 `readonly PrintFontDeclaration[]`**（与画布同类型）：传裸字符串数组此前只有本包出候选、画布出空，现两侧都静默丢弃——要出候选必须写成 `{ family, label?, files }`。导出 JSON 与出纸不受影响。

### 修复

- **表格单元格的 `barWidth` / `barFontSize` 在出纸端整条失效**：`data-binder` 的单元格字段白名单漏了这两项，属性台把条宽调到 3/4/8 只有设计器里变大、出纸仍按缺省值。现补进白名单与 `RenderCell` 类型，设计态与出纸共用同一份几何。
- **单元格条码的文本字号取错字段**：出纸读的是单元格正文 `fontSize`（pt），而属性台写入的是 `barFontSize`（相对条高 30）。现按 `barFontSize ?? fontSize` 取值，与画布 `CellBarcode` 同源。
- **预览「适配」档按真实纸宽计算**：缩放此前自带一份纸型宽度表，漏了 Letter / Legal / 针式 / 热敏纸，A3 / A5 横版也算错；现改为复用 core 的 `getPaperDimensions`。
- **素材台与页签的悬停提示统一为设计器气泡**：字段行与分组名此前挂浏览器原生 `title`；现改为同一套 `data-tip` 固定浮层，按实宽夹回视口、不被侧栏或页签列表的 `overflow` 裁掉，并修掉 Common 宿主里同时冒出原生与浮层两份气泡的存量问题。
- **print-common 的「流式列表」分组四处对齐画布**：步进框改显 core 的解析值（存量 / 手写模板缺字段时两侧不再一边 4/8/4/2、一边空框）；提示文案逐字同串；**关掉「内容过长时跨列」不再凭空写 `flowMaxSpan`**；分组键改为与画布同串的 `flowList`，折叠偏好才真的读写同一份。
- **四个 Common 宿主 demo 的顶栏自适应收纳回到与 demo 同源**：宿主样式产物 `demo-ui.css` 的抽取清单漏了 `DemoTopbarMore.vue` 且自 V1.3.7 起未再重跑，导致入库产物对收纳相关类**零规则**；补齐派生（886 → 977 行，四份同 MD5）、弹性占位、「更多」的三条状态类与 `is-tight` 类名。五档视口 × 五页 computed style 逐项相同，四宿主 `verify-demo` 仍 36/36。

### 行为变更与影响面

- **单元格换行改的是出纸**：数据里带 `\n` 的字段（ERP 地址、备注）以前折叠成一行，现在断成多行 → 行自动撑高、表格变长、**分页位移**；断点也变了（`MODEL-ABC-123` 一类串以前逐字硬切，现在只在空格 / 连字符处切），「截断」档裁得更多、「自动缩小」档字号可能压得更低。两份电池标签示例据此把「注意事项」格字号定为 6pt（7pt 实测整表 71.52mm 越过 68.5mm 的分页预算会把该行推到第二张标签，6pt 实测 64.44mm、单枚一页）。
- **元素级 `borderStyle: 'none'` 现在不画线**：此前按非法值回落实线，现在整圈或分边的 `style: 'none'` 一律视为不画（与单元格同口径）。这是本版唯一的新出纸判定；示例库与技能脚本产出的模板都不含该值。
- **两类单元格条码配置现在真正生效**：设了 `barWidth` / `barFontSize` 的单元格；仅设 `fontSize` 而未设 `barFontSize` 的条形码单元格，文本区回到缺省档。两者都是把出纸拉回设计器所见。
- **取消字体预置的代价如实写明**：为「热敏 203dpi 笔画发虚」而默认黑体的那层补偿撤掉，未配字体的模板落纸交还各端系统默认字（Windows 中文大概率落雅黑 / 宋体系）。**黑体 / 微软雅黑是微软授权字体，不允许随镜像或安装包再分发**（Noto / 思源系为 OFL）；服务端 PDF 镜像内中文只有 `fonts-noto-cjk`，缺名时按兜底栈逐级回落不出豆腐块，但字宽变化可能引起换行与分页差异——要三端字面完全一致仍应走模板字体声明。
- **不点不用即零变化**：「恢复默认值」不点就不写任何值；流式列表不用就不产出任何声明；边框回显与工具栏回读只改显示，**写入链路与三条出纸链路零变化**。
- **跨端提示**：流式列表的跨列只在出纸生效，画布设计态永远一列一格，请以预览 / 出纸为准；分边边框的线型 / 宽度 / 颜色在单元格台是**待应用草稿**，必须点预设或勾边才写。
- **安装包已按 v1.3.10 重建**：本版改了 core 的渲染链路（流式列表、单元格换行、`borderStyle: 'none'` 判定、字体默认撤销），桌面客户端必须重打。六个安装包与 `SHA256SUMS.txt` 见本页 Assets。Linux 三包仍未做真机安装与出纸验证（出纸依赖 CUPS，AppImage 需 `libfuse2`，deb/rpm 内 `chrome-sandbox` 为非 setuid）。
- npm 发布由维护者手工执行（`core` / `canvas` 走 `latest`，`common` 走 `next`）。

### 质量

- `npm run build` exit 0，core / render / canvas / common / print-client 全部构建通过。
- 单测四包全绿（总数 189 文件 / 2222 例，实跑 2222 通过、跳过 0）：core 77 / 1118、canvas 72 / 679、common 26 / 315、print-client 14 / 110。上一版登记的 `common` 三条既有基线红灯（`store.spec` 在 happy-dom 下没有 `window.alert`）已不存在。
- `npm run lint:print-architecture` 通过：三端未出现重复的测量 / 纸高 / 出图 / 码制实现。
- 渲染服务与跨端比对：`npm run test -w @worm-vue3-print/render` **9 文件 / 30 例**（真实 Chromium）全过；`npm run parity:cross-end` 因本轮未生成客户端 PDF 未执行，跨端字面一致性不在本版验证范围内。
- 本版新增的守卫测试全部先红后绿并做变异自证；「恢复默认值」的每条正向断言都配一个反面对照（首版 13 条里有 3 条靠它才暴露成假绿）。

---

<a id="english"></a>

## v1.3.10 (2026-10-24) — English

This release does three things properly: **a "fill the row then wrap" detail band finally became a first-class element** (the flow list `flowList`, prompted by GitHub issue #5's prescription form); **every property row's default and every border state is now what you see** (one reset-to-default icon per row, borders read back from the model); **and the preview zoom now shares its geometry with the print path, down in core** (the four demo-common hosts got the preset bar they were missing). Font licensing forced this release to **take back the Heiti default for new elements** — that preset only existed inside this version's development and was never in any published package. The template schema has no breaking change; existing templates stay byte-identical on paper except for the four behaviour changes listed under Impact. 82 commits since v1.3.9.

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.10 @worm-vue3-print/canvas@^1.3.10
```

Only `core` and `canvas` have stable releases on npm. The experimental `@worm-vue3-print/common` remains a **preview** (dist-tag `next`; its own version `1.3.7-beta.0` is intentionally out of sync with the mainline — this release only raises its `core` range to `^1.3.10`) and is **not `latest`**; install it as `npm i @worm-vue3-print/common@next`. `services/print-render` and `clients/print-client` stay in-repo and are distributed as a Docker image and as GitHub Release installers.

### Added

- **Flow list element `flowList`**: lays a set of detail lines out as "N per row, wrap when full" for borderless bands such as prescription herbs or part lists (a table cannot express borderless slots, and long text only breaks mid-word). The author sets **columns per row, row height and horizontal gap** — columns are never auto-computed; each item's content is one **expression template** (`{drugs.name} {drugs.spec}`) and the list source is detected from the array field that appears in it, so the panel has no "data source" row. Two new capabilities: **auto span** (off by default; an item wider than one column takes two or more slots and, if the row has no room, the whole item moves to the start of the next row — words are never split) with a **max span** ceiling **clamped to the column count** (the only place that rewrites a user-entered value), and **"columns do not fit" only hints** ("about N columns fit") without writing back. **One box, one page**: overflow follows the existing `textFit` modes (default clip) — the pagination engine is not involved. **Spanning only takes effect on output**: the design canvas runs neither the measurement pass nor pagination, so the preview / print result is authoritative. Implementation: new pure core module `render/flow-list.ts` (no DOM, one source for all three print paths and both shells), `data-binder` lets non-table elements consume arrays, `html-generator` emits a CSS Grid.
- **A reset-to-default icon on every property row that has a factory default** (`RotateCcw`, the same lucide source as the toolbar, identical in both shells). One click writes the row back to **its own layer's factory value**: element options return to `createDefaultOptions(type)`, table-level defaults to a freshly created table, cell options clear themselves so the value follows the table default again, watermark / tiling / page background return to their constants. The icon is always present but **only lights up when the current value differs from the factory value**; when already default it is greyed and clicking records no history entry, and the tooltip states the target directly. **Per row only — no group-wide or element-wide reset.** 75 rows in each shell. **No new default storage**: the reset target is derived at click time, and the `default` / `defaultUnit` registry fields **only feed the tooltip text and are never read by behaviour**.
- **The preview-zoom rules moved down into core** (new `designer/utils/preview-zoom.ts`, exported from `/designer`) **and all four demo-common hosts gained the preset bar**, which they lacked while re-implementing the preview layer — thermal labels had kept showing fused barcode lines on screen.
- **Three barcode controls plus a recommendation**: `barHeight` (mm, bars only, never the human-readable text below; *bar width wins* when the box is too short), `barQuietZone` (modules, 0–20, default 10), the bar-width multiplier upper bound raised from 4 to 8, and — once a printer resolution is chosen — a **recommended multiplier with the current conversion** under the field (203 dpi → 3, 300/600 dpi → 2) that **never writes `barWidth`**. Single source: core's `recommendBarcodeBarWidth`.
- **The element panel's "Borders & background" now matches the cell panel**: a line-style dropdown, 全部 / 外侧 / 内部 / 无 presets and per-side ticks, gated by `acceptsElementBorder`; **内部 stays disabled for elements** (one ring of edges, no shared inner lines). Unlike the cell panel, the element panel **applies style / width / colour immediately** — an element's own three fields *are* the spec — while a zero width falls back to `0.75pt` so "全部" never no-ops. Writes consolidated into core (`applyElementBorderPreset`, `setElementBorderEdge`, `resolveElementBorderSpec`, `elementBorderEdgeVisible`).
- **Core's font-catalogue helpers became public exports** (`findFontOption` / `fontOptionLabel` / `normalizeFontQuery` / `filterFontOptions` in `print/fonts.ts`), replacing the duplicate ranking that canvas and print-common each kept.
- **The demo library grew to 13 samples**: a traditional-Chinese-medicine prescription (measured on output: 4 rows, both long items take 2 slots, 4 rows × 8 mm equals the 32 mm box, one page) and two battery-module shipping labels (95×75 mm, four-column grid, differing only in how the SN row is divided). All four demo-common `templates.js` hosts were regenerated.
- **The `print-template-json` skill gained the flow list**: `build_template.py` now knows the element type, its shorthand map and its build-time defaults (4/8/4/false/2, same as the designer), implements the "max span clamped to the column count" rule, and fails the build instead of silently emitting an empty element when the item template is missing.

### Changed

- **The cell panel echoes values only for a single cell; multiple cells are batch-set only.** The criterion is the number of **writable** cells (skipping `merged` placeholders); a row/column-merged cell still counts as one. Two or more puts the group into batch mode: empty inputs with a "多选" placeholder, disabled "多选" dropdown entries, nothing ticked, and writes remembered in a **selection-scoped draft** cleared on any selection change. Core adds `collectWritableCells` / `resolveCellGroupMode` / `resolveSharedCellType`.
- **Border rows now reflect the real state.** Cell edge ticks derive from the selection and a click touches only that edge (it no longer wipes the cell's other three borders). The style / width / colour rows show the effective spec, with a **"混合" placeholder for the fields whose four sides disagree** and **"none / 0" when the cell has no border at all** (it used to show the default solid 0.75, which looked like an invisible frame); picking any non-none style auto-fills `0.75pt`. **The top toolbar's border panel reads back the selected cell too** (it used to be a one-time draft that showed `solid 0.75 #333` for any cell with a non-default border), while multi-cell selections keep the default spec as the batch source. All single points are in core: `resolveBorderEdgeStates`, `setCellBorderEdge`, `resolveCellBorderDisplay`, `resolveElementBorderDisplay`, `elementBorderEdgeVisible`, `elementVisibleBorders`, `effectiveElementBorderSpec`, `setElementBorderField`, `setElementBorderEdgeVisible`.
- **Line style gained 无 (none), and the toolbar's style icons can all be unselected** — the semantics are "无 ⇔ there is no border here". Options live in one core constant (`BORDER_LINE_STYLES`). This also fixes the common cell panel's dropdown falling back to the second option instead of the selected one.
- **Table cell text now breaks on line feeds, and English words are no longer split mid-word.** The wrapping mode (`wordWrap` defaults to `true`) is now `white-space:pre-wrap;word-break:normal;overflow-wrap:break-word` on all three ends: `\n` produces a real line break, runs of spaces stay visible, Latin text wraps per word (CJK per character), and a word is only cut at the line end when it alone is wider than the column — Word/WPS behaviour. `wordWrap: false` is byte-identical.
- **Font presets removed** (licensing): `createDefaultOptions` no longer writes `fontFamily` and the dropdown no longer lists built-in families; candidates come solely from the host's `fonts` prop (distributed with the template, licensing is the host's own call), and any other family name can still be typed in. The cell resolution order *cell → table default → CSS inherit* and the `tableDefaultFontFamily` field stay. **Existing templates are byte-identical**, with no migration and no schema change.
- **print-common's quiet-zone rows and font candidates now follow the canvas criteria**: both shells leave the box empty and rely on the placeholder when unset, and "re-typing the default" writes the key in exactly the same cases as canvas (previously the two disagreed on key presence in the exported JSON). Bare-string font entries are no longer accepted and `host.fonts` is tightened.
- **The four demo-common hosts' topbar overflow calls core's `resolveToolbarOverflow`**, the same function canvas uses; the collapse counts agree at 1440/900/700/560 (2/7/8/9).

### Removed (breaking)

- core removes `DEFAULT_PRINT_FONT_FAMILY` and `SYSTEM_FONT_OPTIONS`; `withSystemFontOptions` is renamed `normalizeFontCatalog` and narrowed to "normalise the host list and dedupe case-insensitively". All three were introduced and withdrawn inside this same unreleased version, so **no published package ever carried them** and there is no pre-1.3.10 call site to migrate.
- **canvas removed its internal `composables/usePreviewZoom.ts`** — it was never a public export; external deep-path imports must move to core.
- **print-common removed `core/font-catalog.ts` and `buildFontCatalog`** — the module was never publicly exported.
- **print-common's `fonts` prop tightened** to `readonly PrintFontDeclaration[]`, matching canvas: bare strings are silently dropped on both ends; write `{ family, label?, files }` to get candidates. Exported JSON and print output are unaffected.

### Fixed

- **Table cells dropped `barWidth` / `barFontSize` on the print path**: the `data-binder` cell whitelist missed both fields, so raising the bar width only grew the barcode in the designer. Both are now carried through and design view and output share one geometry.
- **Cell barcodes read the wrong font-size field**: output used the cell body `fontSize` (pt) while the panel writes `barFontSize`. It now resolves `barFontSize ?? fontSize`, matching canvas.
- **The "fit" preview tier now uses the real paper width**: the zoom kept its own paper-width table that omitted Letter / Legal / tractor-feed / thermal paper and mis-computed A3 / A5 landscape; it reuses core's `getPaperDimensions`.
- **Hover tips in the field tree and page tabs use the designer's bubble** instead of the native `title`, clamped to the viewport and no longer clipped by panel `overflow`; the Common host's double-bubble problem is fixed as well.
- **print-common's flow-list group aligned with canvas in four places**: the steppers show core's resolved values, the hint string matches character for character, **turning auto-span off no longer writes `flowMaxSpan` out of nowhere**, and the group key matches canvas so the collapse preference is genuinely shared.
- **The four demo-common hosts' responsive topbar is back in sync with the demo**: the generated stylesheet had not been re-run since V1.3.7 and its extraction list omitted `DemoTopbarMore.vue`, so the committed CSS carried zero rules for the overflow classes. Five viewport steps × five pages of computed styles are identical, and `verify-demo` still reports 36/36.

### Impact

- **The cell wrapping change is a print-output change**: fields containing `\n` (ERP addresses, remarks) now wrap onto several lines, rows grow, the table gets taller and **pagination shifts**; break points move too, so 截断 clips more and 自动缩小 can settle on a smaller size. The two battery labels were adapted accordingly (the "cautions" cell is set to 6 pt: 7 pt measured 71.52 mm against a 68.5 mm budget, which pushed that row onto a second label; 6 pt measures 64.44 mm on one label).
- **An element-level `borderStyle: 'none'` now draws nothing** (whole ring or single edge) instead of falling back to a solid line — the only new output rule in this release; no sample or skill-generated template carries that value.
- **Two cell-barcode configurations change output**: cells setting `barWidth` / `barFontSize` now honour them, and barcode cells that set only `fontSize` return the text area to the default band. Both pull output back to what the designer shows.
- **The cost of dropping the font preset is stated plainly**: the thermal-legibility compensation that briefly defaulted new elements to Heiti is withdrawn, so unconfigured output falls back to each target's system default (on Windows, Chinese most likely resolves to a YaHei / Song-family face). **SimHei and Microsoft YaHei are Microsoft-licensed and must not be redistributed inside images or installers** (Noto / Source Han are OFL); the server PDF image ships only `fonts-noto-cjk` for Chinese. Missing names degrade through the fallback stack instead of showing tofu, but metric changes can shift wrapping and pagination — for byte-exact cross-target output keep declaring fonts in the template.
- **Nothing is written unless you use it**: clicking no reset icon writes nothing, an unused flow list emits nothing, and the border readback changes only display — the write paths and all three print paths are unchanged.
- **Cross-target note**: flow-list spanning only applies on output (the canvas always shows one cell per column), and in the cell panel the style / width / colour rows are a **pending draft** that reaches the cells only through a preset or an edge tick.
- **Installers rebuilt for v1.3.10**: this version changed core's render chain (flow list, cell wrapping, `borderStyle: 'none'`, the withdrawn font default), so the desktop client had to be rebuilt; the six installers and `SHA256SUMS.txt` are attached to this release. The three Linux packages are still not verified on real hardware: printing depends on CUPS, AppImage needs `libfuse2`, and `chrome-sandbox` is not setuid inside deb/rpm.
- The npm publish is run manually by the maintainer (`core` / `canvas` to `latest`, `common` to `next`).

### Quality

- `npm run build` exits 0 for core / render / canvas / common / print-client.
- Unit tests are green across four packages (189 files / 2222 cases, 2222 passing, 0 skipped): core 77 / 1118, canvas 72 / 679, common 26 / 315, print-client 14 / 110. The three pre-existing `common` baseline failures recorded by the previous release (`store.spec` spying on `window.alert`, which happy-dom does not provide) no longer exist.
- `npm run lint:print-architecture` passes: no duplicated measurement / paper-height / rendering / symbology implementation across the three ends.
- Render service and cross-target comparison: `npm run test -w @worm-vue3-print/render` — **9 files / 30 cases** in real Chromium, all pass; `npm run parity:cross-end` was not run because no client PDF was produced this round, so byte-exact cross-target output is outside this release's verified scope.
- Every new guard test was written red first and given a mutation self-check; each positive "reset to default" assertion is paired with a negative control (three of the first thirteen were false greens exposed only by it).
