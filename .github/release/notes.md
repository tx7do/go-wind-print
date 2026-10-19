## v1.3.7（2026-10-19） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.7（2026-10-19）—— 简体中文

自 `v1.3.6` 以来 17 次提交。四条主干：**补齐中文排版四项缺口**（两端对齐、单元格两端对齐、首行缩进、图片裁剪锚点，来自 [GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)）；**设计器与示例顶栏改为自适应收纳**（窄视口不再把文字逐字折行压到画布上，同一 issue）；**二维码等比铺满并由新属性 `qrQuietZone` 统一静区**（来自 [Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)）；**桌面客户端出纸换成 HTML 直打**，并**修复了「含条码/二维码的模板一律打不出来」这一自 1.3.5 起的阻塞缺陷**。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.7 @worm-vue3-print/canvas@^1.3.7
```

发布到 npm 的正式包仍然只有 `core`（渲染引擎与表达式系统）与 `canvas`（Vue 3 设计器）两个。实验性的 `packages/print-common` 自本版起**以预览版发布**：dist-tag `next`、版本 `1.3.7-beta.0`，**不进 `latest`**，安装必须写 `npm i @worm-vue3-print/common@next`。渲染服务 `services/print-render` 与桌面客户端 `clients/print-client` 仍在仓库内维护，不发布 npm。

> ⚠️ **排版口径住在「渲染端」而不是模板里**：客户端与渲染服务各自打包一份 `core`。1.3.7 模板里的 `textAlign / align: 'justify'`、`longTextIndent`、`objectPosition`、`qrQuietZone` 交给 **1.3.6 及更早**的客户端或渲染服务出纸时会**静默降级**（单行不撑满、缩进不生效、锚点与静区丢失）。宿主 npm 包、`print-render` 服务、桌面客户端安装包三者要一起升到 1.3.7 才谈得上一致。

### 新增

- **文本两端对齐** `justify`（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：`TextAlign` 增档，属性台「对齐」加第 4 档「两端」，格式工具栏对齐面板加第 4 格（canvas 与 print-common 同图标）。出图端两处必修：与垂直对齐组合时把 flex 主轴改成纵向（横向 flex 的匿名文本项拉不伸，否则静默回落左对齐），以及随 `text-align:justify` 成对输出 `text-align-last:justify`（CSS 永不拉伸段落末行，而文本元素通常只有一行、那一行就是末行）。语义按打印设计器同行取「撑满行宽，含末行」，与 Word 的「两端对齐」有别。真实设计器实测：元素盒 349px 而单行行盒 140px → 改后撑满 349px。
- **表格单元格两端对齐**：属性台「水平对齐」补第 4 档「两端」。此前格式工具栏在单元格上下文已能写入 `align:'justify'`，但属性台看不到也点不到，且出纸只写 `text-align:justify`——实测 83px 表头格里内容仍停在 48px。现 core `matrixCellStyle()` 与两宿主同策成对输出，同一格行盒 48px → 撑满内容宽 73px。缺省仍走 `left`/`center`，存量模板零变化。
- **长文本首行缩进** `longTextIndent` 真正落纸：以 **em** 输出（随字号走，`textFit='shrink'` 缩小字号后缩进同步变窄），与 Word/WPS「首行缩进 2 字符」同形态；属性台「外观」组补「首行缩进 (字符)」入口。仅 `longText` 元素消费。
- **图片裁剪锚点** `objectPosition`：独立图片与单元格图片输出 `object-position`（如 `center 20%`，证件照保住头顶）；属性台为 image 新增「缩放模式」与「裁剪锚点」，单元格面板补「裁剪锚点」（仅图片单元格）。含 `;`、引号、`url()` 等非法字符的值整条丢弃。顺带修掉独立 image 的 `fit` 在出纸端被写死 `contain` 的老问题。
- **设计器顶部工具栏自适应收纳**：宽度不足时按固定优先级链（剪贴板 → 格式刷 → 缩放 → 排列/视图 → 边框 → 颜色 → 对齐 → 文字样式 → 字体与字号）把按钮组收进「更多」下拉，面板内保留分组标题与图标网格；全收完仍放不下才让品牌区文字走省略号。判定 `resolveToolbarOverflow` 落在 `@worm-vue3-print/core/designer`，两套宿主共用同一链序；canvas 侧用 `Teleport` 搬运，组件实例不重挂载，因此「边框」面板里选好的线型/粗细/颜色在窗口反复缩放后存活。该机制同时提升为 canvas 公开 API（`provideToolbarOverflow` / `useToolbarOverflow` / `emptyToolbarOverflow` / `createOverflowUnitDirective` / `TOOLBAR_OVERFLOW`），宿主自己的工具栏可复用。
- **demo 与 demo-common 四个子 demo 的顶栏接入同一套收纳**（同一 issue 拆解项 T-10）。
- **二维码静区可配**（[Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)）：新增属性台「静区 (模块)」（二维码**元素**与**表格单元格**都可设，范围 0~8，**缺省 0**），且出图补 `width/height:100%` 使码面**等比铺满**元素框；设计态四处实现改用 core 的同一份 SVG，此前「预览 1 模块 / common 预览 0 模块 / 出纸固定 4 模块」三处各说各话的局面结束。0 即不留白边、扫码所需静区由框外白纸承担；要 ISO/IEC 18004 推荐合规静区时显式填 4。**注意**：因出纸此前固定 4 模块，既有模板的码面占框比例由 72.4% 变为 100%。
- **桌面客户端出纸通路：HTML 直打**。core 产出的最终 HTML 直接交给 `webContents.print({ silent: true })`，与浏览器 `window.print()` 同源：纸张按渲染管线算出的 `paperMm` 以**微米**显式声明，边距恒 `none`，出纸前把 `deviceName/pageSize/copies/landscape` 落日志。macOS 实测落盘介质精确等于声明值，比 PDF 通路 `printToPDF` 的取整结果更准。
- 客户端窗口与托盘图标改用与安装包同源的 `build/icon.png`（安装包约 +1 MB）；Windows / Linux 不再显示 File/Edit/View/Window 应用菜单（macOS 保留默认菜单）。

### 变更（破坏性）

- 桌面客户端**取消「出纸方式」配置项**：`config.json` 不再接受 `printRoute`（旧文件里该键被忽略），出纸固定走 HTML。需要回退「HTML → `printToPDF` → 系统命令」时改 `print-engine.ts` 的 `ACTIVE_PRINT_ROUTE` 并重新构建，且只对 macOS / Linux 有效。
- 移除 Windows 侧的 **SumatraPDF 出纸通路**及其安装探测/下载/一键安装与设置页状态条，`printPdfFile` 在 win32 直接报错；Windows 不再需要安装外部工具。
- 随之失效的参数口径：`paperName`（驱动纸型名）与 `margins` 在当前出纸通路**不被消费**（协议保留以兼容）。
- 移除从未被消费的可选字段 `lHeight` 与 `leftSpaceRemoved`：全仓零消费，模板里残留同名键被忽略，渲染行为零变化。

### 修复

- **桌面客户端：含条码或二维码的模板此前一张都打不出来**，任务固定以 `PRINT_FAILED：码值渲染超过 ~30000ms` 结束（无码模板不受影响）。渲染管线要先在页面里生成码值 SVG、再把它填进 HTML 做测量，即码值阶段早于任何一次 `setContent`；而客户端的 Electron driver 在窗口从未提交过任何文档时就调 `webContents.executeJavaScript`——Electron 会把脚本排队等一次文档提交，隐藏窗口永不提交，调用于是静默挂死。现 driver 在首次注入执行器前先载入一个空白文档。实测（本机 PDFwriter 虚拟队列）：出厂面单模板（条码 + 二维码、自定义纸 100×150 mm）由超时失败变为 **2.4 s 出纸**，落盘介质精确 100.00×150.00 mm、`/Rotate=0`；单条码 1.5 s、单二维码（静区 4）1.5 s、含两端对齐/缩进/裁剪锚点/双二维码的排版探针模板 1.9–2.3 s。**该缺陷自 1.3.5 起即存在**（同机已装的 1.3.5 客户端跑同一模板同样超时），非 V1.3.7 引入，随本版安装包一并修复。
- **macOS 回退通路：横向标签被打成纵向**。此前把 `Custom.` 按纵向序（短边×长边）声明的结论有误——直接收 PDF 的队列走 `cgpdftopdf`，其方向请求语义是「按你声明的介质朝向把内容转过去贴它」，并不交换介质。现 `Custom.` 与 Linux 统一按页面真实朝向声明，macOS 不再为它补方向请求；方向请求只保留给「命中标准纸型名的横向页」。
- **设计器顶部工具栏不再折行压画**（[GitHub issue #4 评论 1](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：触发点比反馈更靠前——1520–1600 CSS px 之间就开始折行（1080p / 2K 屏 100% 缩放即命中）。现由自适应收纳承接。
- 「更多」面板内的下拉子面板向右戳出父面板 48px（同一 issue 附带项 T-07a）→ 面板按实测抬高 `min-width: 244px`，改后溢出归 0。
- 子 demo 顶栏的「宿主示例」互跳下拉常驻可见并压在画布上 → 闭合态恢复隐藏。
- common 宿主属性台的字段帮助气泡与 canvas 不一致（被剥掉 `[data-v-*]` 的裸 `[data-tip]::after` 连带命中）→ 逐条还原。
- 独立 image 的 `fit` 在出纸端被写死 `contain`；`PresetColorPicker` 双根导致的属性落空告警；主题变量未接通的一批控件。

### 行为变更与影响面

- **既有二维码模板会变大**：出纸不再固定 4 模块静区，缺省 0 模块 → 码面铺满元素框。需要留白边请在属性台显式填 4。
- **两端对齐会拉伸多行文本的末行**（同 Lodop `AlignJustify` / Excel，不是 Word 的「两端对齐」）。
- **升级后桌面客户端不再需要 SumatraPDF**；此前依赖 Windows 那条通路的部署可以卸载该工具。
- 队列 PPD 不支持自定义尺寸时 `media=Custom.*` 仍会被静默忽略（只在 PDF 回退通路相关）；HTML 直打不消费 `media=`。

### 关联 Issue

- GitHub：[#4 补齐中文排版缺口：文本 justify 两端对齐、首行缩进、image 裁剪锚点](https://github.com/worm-longliu/worm-vue3-print/issues/4)
- Gitee：[IKN95F 二维码修改尺寸后无法继续增大](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)

### 桌面客户端安装包

安装包基线为 master 顶端提交 `61d1631`（其父 `f8af92e` 为上述码值渲染修复），明细见 CHANGELOG 的 V1.3.7 段。

- [WormPrintClient-1.3.7-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-mac-x64.dmg)
- [WormPrintClient-1.3.7-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-mac-arm64.dmg)
- [WormPrintClient-1.3.7-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-win-x64.exe)
- [WormPrintClient-1.3.7-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-amd64.deb)
- [WormPrintClient-1.3.7-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-x86_64.rpm)
- [WormPrintClient-1.3.7-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/SHA256SUMS.txt)

安装包只挂在 GitHub（Gitee 发行版附件单文件上限 100 MB，装不下 Electron 产物）。下载不动或掉速时，把链接交给迅雷 / IDM / qBittorrent 续传；GitHub 页面本身打不开则属访问受阻，换网络或走源码构建。Linux 三包未经真机验证：出纸依赖 CUPS，AppImage 需 `libfuse2`（只有 fuse3 的发行版用 `--appimage-extract-and-run`），deb/rpm 内 `chrome-sandbox` 为非 setuid。

### 质量

- `npm run build` 与 `npm test` 全部 exit 0：**1598 例**（core 63 文件/847、canvas 56/465、common 13/149、print-client 14/110），另有渲染服务 `npm run test -w @worm-vue3-print/render` **8 文件/27 例**在真实 Chromium 下通过；`npm run lint:print-architecture` 通过。跳过 0 例。
- demo-common 四宿主验收 `verify-demo.mjs`：jquery / vue2 / react / vue3 各 **36/36**（合计 144 条断言，0 失败）。
- 工具栏收纳在 1600/1280/900/700/640 五档实测：折行 0、内容溢出条底 0、横向溢出 0，设计器条高恒 51px、demo 顶栏恒 45px。
- 客户端出纸经本机 CUPS 虚拟队列实测（HTML 直打与 PDF 回退两条通路各自验证纸型与朝向）；六个安装包的 `app.asar` 载荷逐份核对（mac / win / deb / rpm 内层字节一致，含本版新口径与上述修复，SumatraPDF 通路残留 0）。
- 未经真机验证的部分：Windows 与 Linux 客户端的真实打印（本机为 macOS），以及厂商驱动对自定义尺寸的夹取行为。

---

<a id="english"></a>

## v1.3.7 (2026-10-19) — English

17 commits since `v1.3.6`. Four headline items: **the four missing CJK typography features** (text justification, justified table cells, first-line indent, image crop anchor — [GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)); **adaptive overflow for the designer toolbar and the demo top bars** (labels no longer wrap character by character onto the canvas, same issue); **QR codes now fill their box with a configurable quiet zone via the new `qrQuietZone`** ([Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)); and the desktop client **prints through Chromium's native HTML route**, which also fixes a blocker that had made **every barcode/QR template unprintable since 1.3.5**.

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.7 @worm-vue3-print/canvas@^1.3.7
```

Only `core` and `canvas` have stable releases on npm. The experimental `packages/print-common` is published from this version on as a **preview**: dist-tag `next`, version `1.3.7-beta.0`, **not `latest`** — install it as `npm i @worm-vue3-print/common@next`. `services/print-render` and `clients/print-client` stay in-repo and are not published.

> ⚠️ **Typography semantics live in the rendering side, not in the template.** The client and the render service each bundle their own copy of `core`. A 1.3.7 template carrying `textAlign / align: 'justify'`, `longTextIndent`, `objectPosition` or `qrQuietZone` printed by a **1.3.6 or older** client or render service **silently degrades** (single lines never stretch, indent ignored, anchor and quiet zone lost). Upgrade host packages, the `print-render` service and the desktop installers together.

### Added

- **Text justification** `justify` ([GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)): a new `TextAlign` value, a 4th radio in the property panel and a 4th cell in the toolbar alignment popover (same icon in canvas and print-common). Two renderer-side fixes are both required: switching the flex main axis to `column` when combined with vertical alignment (an anonymous flex item of a row container cannot stretch), and pairing `text-align:justify` with `text-align-last:justify` (CSS never justifies the last line, and a text element is usually exactly one line). Measured live in the designer: 140px line box inside a 349px element → full 349px. As in other print designers this means "fill the line width, last line included", which is what Word calls distributed alignment.
- **Justified table cells**: the cell property panel gained its 4th option. The toolbar could already write `align:'justify'` in cell context while the panel neither showed nor offered it, and the renderer emitted only `text-align:justify` — an 83px header cell kept its content at 48px. Core `matrixCellStyle()` and both hosts now pair the declarations; the same cell fills its 73px content box. Defaults unchanged.
- **First-line indent** `longTextIndent` now reaches paper, emitted in **em** so it follows the font size (including `textFit='shrink'`), with a "首行缩进 (字符)" field added to the Appearance group. `longText` elements only.
- **Image crop anchor** `objectPosition` for standalone and cell images (`center 20%` keeps a face's head in frame), plus "缩放模式" and "裁剪锚点" in the property panel; values containing `;`, quotes or `url()` are dropped entirely. Also fixes standalone images having `object-fit` hard-coded to `contain` on the print side.
- **Adaptive designer toolbar overflow**: button groups collapse into a 更多 dropdown along a fixed priority chain, keeping group titles and icon grids inside the panel; only if everything is collapsed does the brand text fall back to ellipsis. The decision function `resolveToolbarOverflow` lives in `@worm-vue3-print/core/designer` and both hosts share one chain. canvas moves nodes with `Teleport`, so a border style picked in the panel survives repeated resizing. The mechanism is now public canvas API (`provideToolbarOverflow` / `useToolbarOverflow` / `emptyToolbarOverflow` / `createOverflowUnitDirective` / `TOOLBAR_OVERFLOW`).
- **The demo and all four demo-common top bars** use the same overflow chain (T-10 of the same issue).
- **QR quiet zone is configurable** ([Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)): new "静区 (模块)" property (element and table cell alike, 0–8, **default 0**), and the print side now writes `width/height:100%` so the code face fills its box proportionally; all four design-time implementations reuse the single SVG from core. Previously paper used 4 modules, canvas 1 and print-common 0. **Note**: existing templates grow from 72.4% to 100% of the box because printing no longer forces a 4-module band.
- **Desktop client HTML direct printing**: the final HTML from core goes straight to `webContents.print({ silent: true })`, with paper declared in **micrometres** from the pipeline's `paperMm` and margins always `none`; the resolved parameters are logged before the job. Measured on macOS the spooled media equals the declared size exactly, better than the `printToPDF` rounding of the PDF route.
- Window and tray icon now come from the same `build/icon.png` as the installer; no application menu on Windows / Linux (macOS keeps the default one).

### Changed (breaking)

- The desktop client **drops the print-route setting**: `config.json` no longer accepts `printRoute` (a residual key is ignored) and printing always uses HTML. To restore the `HTML → printToPDF → system command` chain, change `ACTIVE_PRINT_ROUTE` in `print-engine.ts` and rebuild — macOS / Linux only.
- The **SumatraPDF route on Windows is removed** along with its install probing, download and settings status bar; `printPdfFile` throws on win32 and Windows needs no external tool.
- Consequently `paperName` and `margins` are **not consumed** by the current route (kept in the protocol for compatibility).
- The never-consumed optional fields `lHeight` and `leftSpaceRemoved` are removed; residual keys are ignored and rendering is unchanged.

### Fixed

- **Desktop client: templates containing a barcode or QR code could not print at all** — every such job ended in `PRINT_FAILED: 码值渲染超过 ~30000ms`. The pipeline renders code SVGs in the page *before* the first `setContent`, and the Electron driver called `webContents.executeJavaScript` on a window that had never committed a document, so Electron queued the script forever. The driver now loads a blank document before the first executor injection. Measured on a local PDFwriter queue: the shipped waybill (barcode + QR, 100×150 mm custom paper) went from timeout to **2.4 s** with the spooled media exactly 100.00×150.00 mm and `/Rotate=0`; barcode-only 1.5 s, QR-only with quiet zone 4 at 1.5 s, the typography probe 1.9–2.3 s. **The defect dates back to 1.3.5** (the 1.3.5 client installed on the same machine times out on the same template); it was not introduced by V1.3.7 but ships fixed here.
- **macOS fallback route: landscape labels were pinned to portrait media.** `Custom.` sizes are now declared in the page's real orientation on both platforms and macOS no longer adds an orientation request for them; the request stays only for landscape pages hitting a standard paper name.
- **Toolbar labels no longer wrap onto the canvas** ([GitHub issue #4, comment 1](https://github.com/worm-longliu/worm-vue3-print/issues/4)) — wrapping started between 1520 and 1600 CSS px, i.e. on a 1080p/2K display at 100% zoom.
- The border sub-panel stuck 48px out of the 更多 panel (T-07a) → measured `min-width: 244px`, overflow now 0.
- The host-switch dropdown in the sub-demos stayed painted while its `details` was closed; common-host field help bubbles lost their scoping; several controls were never wired to theme tokens; `PresetColorPicker`'s double root produced an attribute warning.

### Behavior changes

- **Existing QR templates get bigger** (no forced quiet band by default). Enter 4 if you need the ISO/IEC 18004 band.
- Justification **stretches the last line of multi-line text** (Lodop `AlignJustify` / Excel behaviour, not Word's).
- **Windows no longer needs SumatraPDF**; deployments that relied on that route can uninstall it.

### Related issues

- GitHub: [#4 Chinese typography gaps: text justify, first-line indent, image crop anchor](https://github.com/worm-longliu/worm-vue3-print/issues/4)
- Gitee: [IKN95F QR code stops growing when the box gets larger](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)

### Desktop client installers

Installer baseline is master head `61d1631` (its parent `f8af92e` carries the code-render fix above); details in the V1.3.7 section of the changelog.

- [WormPrintClient-1.3.7-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-mac-x64.dmg)
- [WormPrintClient-1.3.7-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-mac-arm64.dmg)
- [WormPrintClient-1.3.7-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-win-x64.exe)
- [WormPrintClient-1.3.7-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-amd64.deb)
- [WormPrintClient-1.3.7-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-x86_64.rpm)
- [WormPrintClient-1.3.7-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/WormPrintClient-1.3.7-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.7/SHA256SUMS.txt)

Installers are attached on GitHub only (Gitee caps a single asset at 100 MB). For stalled downloads paste the links into Xunlei / IDM / qBittorrent. The Linux packages are not verified on real hardware.

### Quality

- `npm run build` and `npm test` exit 0: **1598 tests** (core 63 files/847, canvas 56/465, common 13/149, print-client 14/110), plus the render service **8 files / 27 tests** on real Chromium; `npm run lint:print-architecture` passes. 0 skipped.
- demo-common acceptance `verify-demo.mjs`: jquery / vue2 / react / vue3 **36/36** each (144 assertions, 0 failures).
- Toolbar overflow measured at 1600/1280/900/700/640: zero wrapped labels, zero bleeding below the bar, zero horizontal overflow; bar height constant at 51px (designer) and 45px (demo top bar).
- Client output verified through a local CUPS queue on both routes (HTML direct and the PDF fallback), and the payloads of all six installers were inspected (identical `app.asar` bytes across mac / win / deb / rpm, new declarations present, zero SumatraPDF residue).
- Not verified on real hardware: actual printing on Windows and Linux clients, and vendor-driver clamping of custom sizes.

