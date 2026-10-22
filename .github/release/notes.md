## v1.3.8（2026-10-22） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.8（2026-10-22）—— 简体中文

自 `v1.3.7` 以来 12 次提交。本版三条主线：**图片裁剪取位改为可视化控件并新增裁剪放大比例**；**表格图片单元格的「剪裁」真正生效**；**分页改按横向占用列记账**，修复含横竖线与表格的单页模板被误拆两页（[Gitee #IKOUJI](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI) 的 C3）。同时修复大写金额万 / 亿节单位丢失（[Gitee #IKOYG0](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)）与字体下拉撑乱宿主（[Gitee #IKP3MU](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)）。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.8 @worm-vue3-print/canvas@^1.3.8
```

发布到 npm 的正式包仍只有 `core` 与 `canvas`。实验性的 `@worm-vue3-print/common` 仍以预览版发布：dist-tag `next`，当前为 `1.3.7-beta.0`，**不进 `latest`**，安装写 `npm i @worm-vue3-print/common@next`；`services/print-render` 与 `clients/print-client` 不发布 npm，分别以 Docker 镜像与 GitHub Release 安装包分发。

> ⚠️ **渲染口径在出图端**：本版新增的裁剪放大比例、含图单元格剪裁行高都由 `core` 渲染端消费。模板交给 **1.3.7 及更早**的客户端或渲染服务出纸时会静默降级（放大不生效、行高仍被图片撑高）。宿主 npm 包、`print-render` 服务与桌面客户端安装包请一起升级。

### 新增

- **图片裁剪取位可视化**（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：属性台从单一文本值改为「位置档下拉 + 可动轴数字框 + 原图可视窗示意」——红框就是最终会被打印的那块画面，换档、改数字时同步移动。有图片自然尺寸时只显示真正可动的那一轴（两轴都能动才出九宫格），拿不到尺寸时降级为两框；无法归一化的存量写法（mm 偏移、四值语法、`calc`）进入「自定义」并原样保留。缩放模式 `cover` 的用户可见名统一改为「剪裁（等比铺满后裁边）」，档位表收编到 core 一份，canvas 与 print-common 同源。
- **裁剪放大比例** `fitScale`（100~400，仅「剪裁」档消费）：图与框同比例时，等比铺满后恰好等于框、一条边都裁不掉；放大比例把画面按百分比再推大，两轴才各多出一条可裁的边。声明落在 core 新增的 `render/crop-style.ts`，出纸、画布与 print-common 五处同源；`transform: scale()` 的缩放原点复用同一条锚点值（锚点既是取位钉住点也是放大不动点）。100 与缺省不落声明，存量模板逐字不变。

### 变更

- **锚点行只在「剪裁」档出现**：包含 / 拉伸填满 / 原始尺寸 / 缩小四档不再显示裁剪锚点与放大比例——这些档没有真被裁掉的边，方框配方图时整行只报「两轴都没有可挪的余量」属噪声。canvas 与 print-common 的元素台、单元格台四处统一。
- 表格**含图单元格选「剪裁」后出纸行高不再被图片撑高**：`cover` 档把外框钉在可用框高、`<img>` 铺满该盒；真 Chromium 实测声明 12mm 的行由约 23.8mm 回到 12mm，取顶 / 取底时画面按锚点裁切（取顶打出顶端红带、取底打出底端蓝带）。其余四档逐字保持存量形态。

### 修复

- **大写金额万 / 亿 节单位丢失**（[Gitee #IKOYG0](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)）：原实现按四位一节换算时，节单位取的是「当前节」下标，首个满四位时下标仍落在第 0 节、取到空串，万 / 亿永远拼不上。现改为按四位一节从高位向下拼接，节单位取本节下标，并补齐跨节零；顺带纠正角位为 0 而分位非 0 时「元」后必须写「零」、不足一元保留「元」位。仅「≥1 万」「x.0y 元」「0<|金额|<1」三类输出变化，全部由错转对。
- **字体下拉展开时把宿主撑变形**（[Gitee #IKP3MU](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)）：候选列表此前留在文档流里，展开时把顶栏收纳单元由 28px 撑到 157px、属性台字体字段下移 122px；现改为浮层并按可用空间上下翻档，顶栏 /「更多」面板 / 属性台三处不再被撑开。该缺陷自 1.3.3 格式工具栏并入顶栏起存在，不是 1.3.7 工具栏收纳的回归。
- **含表格与横竖线的单页模板被拆成两页**（[Gitee #IKOUJI](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI)，C3）：分页预算原按一维纵向流累加，两条与表格横向不相交的竖线也会吃掉纵向预算，表格放不下即虚假换页；换页后元素改用流式光标，设计坐标随之丢失。现改为按横向占用列记账，横竖线与表格各算各列；报告人模板由 2 页 / 横线跳到第 2 页 y=38.9 恢复为 1 页 / y=86.8（设计 86.87）。
- **设计态未求值的图片表达式**（如 `{image}`）不再被当成真实图片：属性台回落到内置示例图并明确标注「示例图」，换图或加载失败时清掉上一张图的可挪量与取景窗，不再出现「破图 + 旧余量」；同时修正取景示意框被面板宽度拉成横条的几何错（红框现与示例图同框）。

### 行为变更与影响面

- **既有表格图片单元格若用了「剪裁」**：升级后出纸行高会变矮（不再被图片撑高），请复核版式；其余四档不受影响。
- **Gitee #IKOUJI 未全部关闭**：本次只修 C3（虚假换页与设计坐标丢失）；C2（表格跟随区数据驱动漂移）与 C1（跟随区内竖线高度丢失）仍在 TODO T-11。
- **Gitee #IKN95F 的二维码修复在 1.3.7 已发布**：仍在使用 1.3.6 及更早版本的用户，请升级到 1.3.7 或本版后验证 50×50 标签。

### 关联 Issue

- GitHub：[#4 补齐中文排版缺口：文本 justify 两端对齐、首行缩进、image 裁剪锚点](https://github.com/worm-longliu/worm-vue3-print/issues/4)
- Gitee：[IKOUJI 竖线/横线 和 表格 布局排版，打印预览出现异常](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI)（C3）
- Gitee：[IKOYG0 关于大写金额的问题](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)
- Gitee：[IKP3MU 模板设计页面点击修改字体的时候页面错乱](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)
- Gitee：[IKN95F 二维码修改尺寸后无法继续增大](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)（1.3.7 已修）

### 桌面客户端安装包

安装包基线为 `v1.3.8` 标签提交；本版安装包由维护者手工构建并上传到本发行版：

- [WormPrintClient-1.3.8-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-mac-x64.dmg)
- [WormPrintClient-1.3.8-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-mac-arm64.dmg)
- [WormPrintClient-1.3.8-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-win-x64.exe)
- [WormPrintClient-1.3.8-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-amd64.deb)
- [WormPrintClient-1.3.8-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-x86_64.rpm)
- [WormPrintClient-1.3.8-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/SHA256SUMS.txt)

安装包只挂在 GitHub（Gitee 发行版附件单文件上限 100 MB，装不下 Electron 产物）。下载不动或掉速时，把链接交给迅雷 / IDM / qBittorrent 续传；GitHub 页面本身打不开则属访问受阻，换网络或走源码构建。Linux 三包未经真机验证：出纸依赖 CUPS，AppImage 需 `libfuse2`（只有 fuse3 的发行版用 `--appimage-extract-and-run`），deb/rpm 内 `chrome-sandbox` 为非 setuid。

### 质量

- `npm run build` exit 0。
- 单测：core 69 文件 / 935 例、canvas 57 文件 / 511 例、common 14 文件 / 173 例、print-client 14 文件 / 110 例，合计 **1729 例全过、0 跳过**。
- 渲染服务：`npm run test -w @worm-vue3-print/render` **9 文件 / 30 例**（真实 Chromium）全过。
- `npm run lint:print-architecture` 通过。
- 内部浏览器实测（9303 canvas / 9331 common）：元素台与单元格台 × 五个缩放档共 **20 个状态**的锚点门禁全部符合预期。
- 未经真机验证：Windows / Linux 客户端的真实打印，以及厂商驱动对自定义尺寸的夹取行为（本机为 macOS）。

---

<a id="english"></a>

## v1.3.8 (2026-10-22) — English

12 commits since `v1.3.7`. Three headline items: **visual crop positioning for images plus a new crop zoom**; **table image cells now really crop under 剪裁**; and **pagination now accounts per horizontal occupied column**, fixing single-page templates with rules and a table being split into two pages (C3 of [Gitee #IKOUJI](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI)). Also fixed: ten-thousands / hundred-millions units lost in uppercase amounts ([Gitee #IKOYG0](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)) and the font dropdown distorting its host ([Gitee #IKP3MU](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)).

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.8 @worm-vue3-print/canvas@^1.3.8
```

Only `core` and `canvas` have stable releases on npm. The experimental `@worm-vue3-print/common` remains a **preview** (dist-tag `next`, currently `1.3.7-beta.0`, **not `latest`** — install it as `npm i @worm-vue3-print/common@next`). `services/print-render` and `clients/print-client` stay in-repo and are not published.

> ⚠️ **Rendering semantics live in the output side.** The new crop zoom and the paper row height of cropped table image cells are consumed by `core` at render time. A template printed by a **1.3.7 or older** client or render service **silently degrades** (zoom ignored, row still stretched by the image). Upgrade host packages, the `print-render` service and the desktop installers together.

### Added

- **Visual crop positioning** ([GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)): the image property panel now offers a position preset, numeric fields for the movable axes, and an original-image window — the red box is exactly the area that will print, moving as presets or numbers change. When the natural size is known, only axes with real travel are shown (the 3×3 grid appears only when both axes move); without a size it falls back to two fields. Legacy values that cannot be normalized (mm offsets, four-value syntax, `calc`) open as "Custom" and are preserved verbatim. The user-facing name of `cover` is now 剪裁（等比铺满后裁边）; the option table lives once in core and both canvas and print-common consume it.
- **Crop zoom `fitScale`** (100–400, consumed only by 剪裁): a picture that matches the frame's ratio fills the frame exactly under `cover`, leaving no edge to crop; the zoom percentage pushes the picture larger so both axes gain a croppable edge. Declarations come from the new core module `render/crop-style.ts` and are shared by the paper renderer, canvas and print-common. `transform: scale()` takes its origin from the same anchor value (the anchor is both the pinned point and the zoom origin). 100 and the default emit nothing; existing templates stay byte-identical.

### Changed

- **The anchor block appears only for 剪裁**: 包含 / 拉伸填满 / 原始尺寸 / 缩小 no longer show crop anchor or zoom rows — those modes have no cropped edge, and with a square frame holding a square image the row only said "no travel on either axis". Both element panels and both cell panels now share this gate.
- **Table image cells in 剪裁 no longer stretch the row on paper**: `cover` pins the outer box to the available height and makes the `<img>` fill it; measured in real Chromium, a declared 12mm row drops from about 23.8mm back to 12mm, and top/bottom anchors really crop (top anchor prints the top red band, bottom anchor the bottom blue band). The other four modes are unchanged.

### Fixed

- **Ten-thousands / hundred-millions units lost in uppercase amounts** ([Gitee #IKOYG0](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)): the old four-digit grouping took the unit from the current group index, which is still 0 when the first group is full, so 万 / 亿 never appeared. The implementation now concatenates groups from the most significant down, takes the unit from each group, and fills zeros across groups; it also fixes the required 零 after 元 when the jiao digit is 0 but the fen digit is not, and keeps the 元 placeholder for amounts below one yuan. Only three output classes change (≥10,000, x.0y yuan, 0<|amount|<1), all from wrong to correct.
- **Font dropdown no longer distorts the host** ([Gitee #IKP3MU](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)): the candidate list used to stay in flow, growing the top-bar unit from 28px to 157px and pushing the property panel down by 122px; it is now an overlay that flips up or down based on available space, so the top bar, the More panel and the property panel stay put. The defect dates back to the 1.3.3 merge of the format toolbar into the top bar and is not a regression of the 1.3.7 toolbar overflow.
- **Single-page templates with rules and a table were split into two pages** ([Gitee #IKOUJI](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI), C3): pagination used to accumulate a one-dimensional vertical budget, so vertical lines that do not intersect the table still consumed it and forced a false page break; after the break elements switched to a flow cursor and lost their design coordinates. The budget is now accounted per horizontal occupied column, so rules and the table each use their own column; the reporter's template goes from 2 pages with the horizontal rule at page 2 y=38.9 back to 1 page at y=86.8 (design 86.87).
- **Unevaluated image expressions in design mode** (e.g. `{image}`) are no longer treated as real images: the panel falls back to the built-in sample and labels it, and a changed or failed image clears the previous travel/window instead of showing "broken image + stale travel". The preview frame geometry that stretched into a wide rectangle is fixed as well (the red box now shares the sample image's frame).

### Impact

- **Existing table image cells using 剪裁**: their paper row height becomes shorter after upgrade (the image no longer stretches the row); please re-check the layout. The other four modes are unaffected.
- **Gitee #IKOUJI is not fully closed**: this release fixes C3 (false page break and lost design coordinates); C2 (data-driven drift of the table follow area) and C1 (missing height of vertical lines inside the follow area) remain tracked as TODO T-11.
- **The QR fix from Gitee #IKN95F shipped in 1.3.7**: users still on 1.3.6 or older should upgrade to 1.3.7 or this version and verify the 50×50 label.

### Related issues

- GitHub: [#4 CJK typography gaps: text justify, first-line indent, image crop anchor](https://github.com/worm-longliu/worm-vue3-print/issues/4)
- Gitee: [IKOUJI rules / table layout and print preview anomaly](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI) (C3)
- Gitee: [IKOYG0 uppercase amount](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)
- Gitee: [IKP3MU font edit breaks the design page](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)
- Gitee: [IKN95F QR code cannot grow after resizing](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F) (fixed in 1.3.7)

### Desktop client installers

Installer baseline is the `v1.3.8` tag commit; this release's installers are built and uploaded by the maintainer:

- [WormPrintClient-1.3.8-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-mac-x64.dmg)
- [WormPrintClient-1.3.8-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-mac-arm64.dmg)
- [WormPrintClient-1.3.8-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-win-x64.exe)
- [WormPrintClient-1.3.8-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-amd64.deb)
- [WormPrintClient-1.3.8-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-x86_64.rpm)
- [WormPrintClient-1.3.8-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/WormPrintClient-1.3.8-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.8/SHA256SUMS.txt)

Installers are hosted on GitHub only (Gitee release attachments are capped at 100 MB per file). If downloads stall, hand the links to a resumable downloader. The three Linux packages are not verified on real hardware: printing depends on CUPS, AppImage needs `libfuse2` (use `--appimage-extract-and-run` on fuse3-only distributions), and `chrome-sandbox` is not setuid inside deb/rpm.

### Quality

- `npm run build` exits 0.
- Unit tests: core 69 files / 935 cases, canvas 57 / 511, common 14 / 173, print-client 14 / 110 — **1729 cases pass, 0 skipped**.
- Render service: `npm run test -w @worm-vue3-print/render` — **9 files / 30 cases** in real Chromium.
- `npm run lint:print-architecture` passes.
- Internal-browser checks (9303 canvas / 9331 common): the anchor gate matches expectations in all **20 states** (element and cell panels × five fit modes).
- Not verified on real hardware: Windows / Linux client printing and vendor-driver clamping of custom sizes (this machine is macOS).
