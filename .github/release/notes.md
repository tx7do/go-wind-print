## v1.3.10（2026-10-22） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.10（2026-10-22）—— 简体中文

本版是功能版，主题是让「预览所见」更接近「纸上所得」：预览可按打印机点阵缩放，条形码可单独控制条高与静区，新建元素默认使用热敏更友好的黑体。模板 schema 无破坏性变更；未使用新字段的存量模板出纸逐字不变（两处单元格条码参数修正除外，见「行为变更与影响面」）。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.10 @worm-vue3-print/canvas@^1.3.10
```

发布到 npm 的正式包仍只有 `core` 与 `canvas`。实验性的 `@worm-vue3-print/common` 仍以预览版发布：dist-tag `next`，自身版本 `1.3.7-beta.0` 与主线**不同步**（本版只把它对 `core` 的依赖范围抬到 `^1.3.10`），**不进 `latest`**，安装写 `npm i @worm-vue3-print/common@next`；`services/print-render` 与 `clients/print-client` 不发布 npm，分别以 Docker 镜像与 GitHub Release 安装包分发。

### 新增

- **打印预览缩放档位**（点阵 / 适配 / 100% / 200% / 400%）：模板填了 `printerDpi` 时默认落在「点阵」档＝1 屏幕像素 = 1 打印点（203dpi ≈ 2.11 倍），细条码在预览里不再糊成一片；「适配」档按 core 的真实纸宽计算，A3 / A5 横版、Letter / Legal、针式与热敏 / 连续纸都正确。缩放只写进预览 iframe 的守卫样式并带 `@media print{zoom:1}` 复位，不进渲染产物、不改分页，模板契约零改动。
- **新建元素默认字体改为黑体，字体下拉补「本机系统字体」档**：`DEFAULT_PRINT_FONT_FAMILY = 'SimHei'`，系统档列出免字体文件的本机已装字体（黑体、苹方、雅黑、思源黑体、宋体、楷体、仿宋等），并为每项标注「热敏推荐 / 屏幕体 / 热敏慎用」。`createDefaultOptions` 给新元素写默认族名，表格另带 `tableDefaultFontFamily`，单元格按「单元格自身 → 表格默认 → CSS 继承」取字。画布与出纸共用 core 的 `resolveCanvasFontFamily` 补兜底栈，修掉本机缺字体时两端看到两套字的问题。字重仍留 `normal`，避免合成粗体造成度量漂移。
- **条形码条高** `barHeight`（单位 mm）：条形码元素与表格单元格同口径，只量黑白条本体、不含下方文字。结算规则是「条宽优先」——可用框高装不下时期望条高让位，绝不挤窄条宽；未填或折算结果落在缺省档时仍只生成一趟，存量模板逐毫米不变。
- **条形码静区** `barQuietZone`（单位「模块」，范围 0~20，缺省 10）：只留左右，数值越小白边越窄、同样框内条越粗；10 正是一维码码制对静区的下限要求。二维码的静区仍是另一条 `qrQuietZone`（缺省 0），两者互不影响。
- **条形码「条宽（倍率）」上限由 4 抬到 8**：每模块首选宽度可到 `8/2 × 0.25mm = 1mm`；设置了 `printerDpi` 时仍吸附到整数打印点，结算规则仍是只缩不放。

### 修复

- **表格单元格的 `barWidth` / `barFontSize` 在出纸端整条失效**：`data-binder` 的单元格字段白名单漏了这两项，属性台把条宽调到 3/4/8 只有设计器里变大、出纸仍按缺省值。现补进白名单与 `RenderCell` 类型，设计态与出纸共用同一份几何。
- **单元格条码的文本字号取错字段**：出纸读的是单元格正文 `fontSize`（pt），而属性台写入的是 `barFontSize`（相对条高 30）。现按 `barFontSize ?? fontSize` 取值，与画布 `CellBarcode` 同源。
- **预览「适配」档按真实纸宽计算**：缩放此前自带一份纸型宽度表，漏了 Letter / Legal / 针式 / 热敏纸，A3 / A5 横版也算错；现改为复用 core 的 `getPaperDimensions`，与出纸几何同源。
- **素材台与页签的悬停提示统一为设计器气泡**：字段行与分组名此前挂浏览器原生 `title`，长字段名被省略后只能看系统提示；现改为同一套 `data-tip` 固定浮层，悬停可看全「中文名 (变量名)」，并按实宽夹回视口、不被侧栏或页签列表的 `overflow` 裁掉。顺带修掉 Common 宿主里页签 / 素材台同时冒出原生与浮层两份气泡的存量问题。

### 行为变更与影响面

- **默认字体只影响新建元素**：未显式设置 `fontFamily` 的存量模板，出图仍不输出该声明，出纸逐字不变。
- **系统字体三端解析不同**：画布、浏览器直印与桌面客户端用用户机的字体，服务端 PDF 用渲染容器里的（镜像内中文只有 `fonts-noto-cjk`）；缺名时按兜底栈逐级回落不会出豆腐块，但字宽变化可能引起换行与分页差异。要三端字面完全一致仍应走模板字体声明；**黑体 / 微软雅黑是微软授权字体，不允许随镜像或安装包再分发**（Noto / 思源系为 OFL 可自由分发）。
- **两类单元格条码配置会改变出纸**：设置了 `barWidth` / `barFontSize` 的单元格现在真正生效；仅设 `fontSize` 而未设 `barFontSize` 的条形码单元格，文本区回到缺省档。两者都是把出纸拉回设计器所见。
- **条高与静区的缺省档不变**；静区填 0 会压掉白边，紧邻文字或表格线时可能扫不出，请实打验证。
- **预览缩放不进产物**：模板 schema、分页与出纸均未改动；`printerDpi` 仍只读。
- **安装包需要重建**：本版改了 core 的渲染与默认字体，桌面客户端须按 v1.3.10 重新构建。六个安装包与 `SHA256SUMS.txt` 将在构建完成后补传为本发行版附件，下载直链以本页 Assets 为准；上传前本页暂无安装包附件。Linux 三包仍未做真机安装与出纸验证（出纸依赖 CUPS，AppImage 需 `libfuse2`，deb/rpm 内 `chrome-sandbox` 为非 setuid）。

### 质量

- `npm run build` exit 0，core / render / canvas / common / print-client 全部构建通过。
- 单测：core 70 文件 / 983 例、canvas 59 / 547、common 16 / 191（188 过 + 3 条既有基线红灯：`store.spec` 在 happy-dom 下没有 `window.alert`，与本版改动无关）、print-client 14 / 110 —— **1828 例通过**。
- 渲染服务：`npm run test -w @worm-vue3-print/render` **9 文件 / 30 例**（真实 Chromium）全过。
- `npm run lint:print-architecture` 通过。
- 本版修复了预览缩放新增代码里重复维护的第二份纸型表，并补了对应测试；未新增安装包构建与真机出纸验证，`cross-end` 比对因缺少客户端 PDF 未执行。npm 发布由维护者手工执行。

---

<a id="english"></a>

## v1.3.10 (2026-10-22) — English

This is a feature release focused on making the preview match the paper more closely: the print preview can zoom to the printer's dot grid, barcodes gain independent bar-height and quiet-zone controls, and new elements default to Heiti, which prints more cleanly on thermal heads. There are no breaking template-schema changes; existing templates that do not use the new fields stay byte-identical on paper (except the two cell-barcode corrections described under Impact).

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.10 @worm-vue3-print/canvas@^1.3.10
```

Only `core` and `canvas` have stable releases on npm. The experimental `@worm-vue3-print/common` remains a **preview** (dist-tag `next`; its own version `1.3.7-beta.0` is intentionally out of sync with the mainline — this release only raises its `core` range to `^1.3.10`) and is **not `latest`**; install it as `npm i @worm-vue3-print/common@next`. `services/print-render` and `clients/print-client` stay in-repo and are not published.

### Added

- **Print preview zoom presets** (dot grid / fit / 100% / 200% / 400%): templates that set `printerDpi` default to the dot-grid tier — one screen pixel per print dot (≈2.11× at 203 dpi) — so fine barcodes no longer blur together in the preview. The fit tier computes from core's real paper width, covering A3 / A5 landscape, Letter / Legal, tractor-feed and thermal / continuous paper. The zoom is written only into a guard style inside the preview iframe with `@media print{zoom:1}`, so it never enters the rendered artifact or pagination; the template contract is unchanged.
- **New elements default to Heiti, and the font dropdown gains a local-system-fonts tier**: `DEFAULT_PRINT_FONT_FAMILY = 'SimHei'`; the system tier lists installed fonts that need no font file (Heiti, PingFang, YaHei, Noto Sans CJK, SimSun, KaiTi, FangSong, …) each labelled "thermal pick / screen-tuned / use with care on thermal". `createDefaultOptions` stamps the default family on new elements, tables additionally carry `tableDefaultFontFamily`, and cells resolve cell → table default → CSS inherit. Canvas and output now share core's `resolveCanvasFontFamily` fallback stack, fixing the case where a machine missing the font showed a different face than the paper. Weight stays `normal` to avoid synthetic bold and metric drift.
- **Barcode bar height** `barHeight` (mm): available on both the barcode element and table cells, measuring the bars only — not the human-readable text below. The hard rule is *bar width wins*: when the box is too short the requested height gives way rather than squeezing the bar width. Unset values, or conversions that land on the default band, still render in one pass and keep existing templates byte-identical on paper.
- **Barcode quiet zone** `barQuietZone` (modules, 0–20, default 10): left/right only; smaller values mean thinner white edges and thicker bars in the same box. 10 is exactly the floor the 1D symbologies demand. The QR quiet zone remains a separate `qrQuietZone` (default 0).
- **Bar-width multiplier upper bound raised from 4 to 8**: the preferred module width can now reach `8/2 × 0.25 mm = 1 mm`; with `printerDpi` set it still snaps to whole print dots, and the rule is still scale-down only.

### Fixed

- **Table cells dropped `barWidth` / `barFontSize` on the print path**: the `data-binder` cell whitelist missed both fields, so raising the bar width to 3/4/8 only grew the barcode in the designer while paper kept the default. Both fields are now carried through, and design view and output share one geometry again.
- **Cell barcodes read the wrong font-size field**: output used the cell body `fontSize` (pt) while the panel writes `barFontSize` (relative to the 30-module bar height). It now resolves `barFontSize ?? fontSize`, matching canvas `CellBarcode`.
- **The "fit" preview tier now uses the real paper width**: the zoom kept its own paper-width table that omitted Letter / Legal / tractor-feed / thermal paper and mis-computed A3 / A5 landscape. It now reuses core's `getPaperDimensions`, the same geometry as output.
- **Hover tips in the field tree and page tabs now use the designer's bubble**: field rows and group names used the native `title` attribute, so an ellipsized long field could only be read in the system tooltip. They now share the same `data-tip` fixed overlay showing the full "中文名 (变量名)", clamped to the viewport by its measured width and no longer clipped by the side panel or tab list's `overflow`. This also fixes the pre-existing double bubble (native plus overlay) in the Common host.

### Impact

- **The default font only affects new elements**: existing templates that never set `fontFamily` still emit no such declaration and stay byte-identical on paper.
- **System fonts resolve differently per target**: canvas, browser print and the desktop client use the user machine's fonts; server PDFs use the render container, whose only CJK font is `fonts-noto-cjk`. Missing names degrade through the fallback stack rather than showing tofu, but metric changes can shift wrapping and pagination. For byte-exact cross-target output keep using template font declarations; **SimHei and Microsoft YaHei are Microsoft-licensed and must not be redistributed inside images or installers** (Noto / Source Han are OFL).
- **Two cell-barcode configurations change output**: cells that set `barWidth` / `barFontSize` now honour them; barcode cells that set only `fontSize` without `barFontSize` return the text area to the default band. Both pull output back to what the designer shows.
- **The defaults for bar height and quiet zone are unchanged**; setting the quiet zone to 0 removes the white edge and may break scanning next to text or table rules — verify on paper.
- **Preview zoom never enters the artifact**: template schema, pagination and output are untouched; `printerDpi` remains read-only.
- **Installers must be rebuilt**: core's rendering and default font changed, so the desktop client needs a v1.3.10 build. The six installers and `SHA256SUMS.txt` will be uploaded as assets of this release once built; use the Assets section for download links (no links exist before upload). The three Linux packages are still not verified on real hardware: printing depends on CUPS, AppImage needs `libfuse2`, and `chrome-sandbox` is not setuid inside deb/rpm.

### Quality

- `npm run build` exits 0 for core / render / canvas / common / print-client.
- Unit tests: core 70 files / 983 cases, canvas 59 / 547, common 16 / 191 (188 pass plus 3 pre-existing baseline failures: `store.spec` spies on `window.alert`, which happy-dom does not provide — unrelated to this release), print-client 14 / 110 — **1828 cases pass**.
- Render service: `npm run test -w @worm-vue3-print/render` — **9 files / 30 cases** in real Chromium, all pass.
- `npm run lint:print-architecture` passes.
- This release removed the duplicate paper-width table introduced with the preview zoom and added tests for it. No installer build or real-hardware print verification was run for this release, and the `cross-end` comparison was skipped for lack of a client PDF. The npm publish is run manually by the maintainer.
