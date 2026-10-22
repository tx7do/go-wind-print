# 更新日志 (Changelog)

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## 未发布

### 新增

- 条形码**静区** `barQuietZone`（属性台「条码设置」→「静区 (模块)」）：条形码**元素**与**表格单元格**都能设，画布与 print-common 两套宿主的元素台/单元格台四处同口径。单位「模块」（1 模块 = 1 条宽），只留左右（上下留白会白吃掉元素高度），范围 0~20、**缺省 10**——10 正是一维码码制对静区的下限要求（GS1 取 2.54mm 与 10×条宽的大者），所以缺省档没有像二维码那样给 0。数值越小白边越窄、同样的框内条越粗：8 位数字走 CODE128C 时图形共 99 模块，其中 20 模块是白边，填 0 后在 20mm 可用框内每模块由 0.202mm 回到 0.25mm（条粗 +23.7%）。说明挂 `button.pd-help`（悬浮/点击才浮出，文案单一来源是 core 的 `PROPERTY_REGISTRY` 键 `cd-bar-quiet-zone`），属性搜索可用「条码静区 / 条码白边 / 条形码留白」命中。**缺省档不变，存量模板出纸逐字不变**；填 0 后白边压没，而静区参与「条→空→条」跳变，紧邻文字或表格线时可能扫不出，需实打验证。**二维码的静区仍是另一条 `qrQuietZone`（缺省 0），两者互不影响。**
- 条形码「条宽（倍率）」上限由 4 抬到 **8**：每模块首选宽度可到 `8/2 × 0.25mm = 1mm`（可用框足够时条码比原来大一倍），设置了 `printerDpi` 时仍吸附到整数打印点。结算规则不变——**仍只缩不放**，所以「大框里条码只到某个尺寸」是条宽上限决定的，现在这个上限翻倍。画布与 print-common 四处入口同步。

### 修复

- **表格单元格的 `barWidth` / `barFontSize` 在出纸端整条失效**：`data-binder` 的单元格字段是逐个白名单列举，这两项既没进白名单也没进 `RenderCell` 类型，属性台把条宽调到 3/4/8 只有设计器里变大、出纸仍按缺省 0.25mm/模块（与 `qrQuietZone`、`objectPosition` 同一个坑）。现补进白名单与类型声明，设计态与出纸重新共用同一份几何。
- **单元格条码的文本字号取错字段**：出纸读的是单元格正文字号 `fontSize`（pt），而属性台写入的是 `barFontSize`（相对条高 30），与画布 `CellBarcode` 不同源。现按 `barFontSize ?? fontSize` 取值（条形码元素只有 `fontSize`，该路行为逐字不变）。**存量影响**：仅「条形码单元格同时设了 `fontSize` 且未设 `barFontSize`」时，文本区高度从那个 pt 值回到缺省档，条码随之同比略变——这是把出纸拉回设计器所见的形态。

## V1.3.9(2026-10-22)

### 修复

- **设计器内置「更新记录」漏登 #IKPAGV 那一条**（[Gitee #IKPAGV](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV)）：素材台字段树长名自适应换行的**功能修复已随 `1.3.8` 发布并在包内生效**（取证据于官方 registry 的 `canvas@1.3.8`：`dist/canvas.css` 已含 `.node-meta` 与新 `.node-key` 规则），但那条文案当时没进 `help-content/changelog.ts`，装了 1.3.8 的人在应用内的「更新记录」里看不到它。本版补齐该条文案（中英 CHANGELOG 与两份内置更新记录四处同步），并按新基线重打桌面客户端安装包。**功能与模板 schema 零变化**。

## V1.3.8(2026-10-22)

### 新增

- 图片**裁剪锚点改为可视化取位**（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：属性台从单一文本值改为「位置档下拉 + 可动轴数字框 + 原图可视窗示意」——红框就是最终会被打印的那块画面，换档、改数字时同步移动。有图片自然尺寸时只显示真正可动的那一轴（两轴都能动才出九宫格），拿不到尺寸时降级为两框；无法归一化的存量写法（mm 偏移、四值语法、`calc`）进入「自定义」并原样保留。缩放模式 `cover` 的用户可见名统一改为「剪裁（等比铺满后裁边）」，档位表收编到 core 一份，canvas 与 print-common 同源。
- 图片**裁剪放大比例** `fitScale`（100~400，仅「剪裁」档消费）：图与框同比例时，等比铺满后恰好等于框、一条边都裁不掉；放大比例把画面按百分比再推大，两轴才各多出一条可裁的边。声明落在 core 新增的 `render/crop-style.ts`，出纸、画布与 print-common 五处同源；`transform: scale()` 的缩放原点复用同一条锚点值（锚点既是取位钉住点也是放大不动点）。100 与缺省不落声明，存量模板逐字不变。

### 变更

- **锚点行只在「剪裁」档出现**：包含 / 拉伸填满 / 原始尺寸 / 缩小四档不再显示裁剪锚点与放大比例——这些档没有真被裁掉的边，方框配方图时整行只报「两轴都没有可挪的余量」属噪声。canvas 与 print-common 的元素台、单元格台四处统一。
- 表格**含图单元格选「剪裁」后出纸行高不再被图片撑高**：`cover` 档把外框钉在可用框高、`<img>` 铺满该盒；真 Chromium 实测声明 12mm 的行由约 23.8mm 回到 12mm，取顶 / 取底时画面按锚点裁切（取顶打出顶端红带、取底打出底端蓝带）。其余四档逐字保持存量形态。**注意**：既有模板里表格图片单元格若用了「剪裁」，升级后行高会变矮，请复核版式。

### 修复

- **大写金额万 / 亿 节单位丢失**（[Gitee #IKOYG0](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOYG0)）：原实现按四位一节换算时，节单位取的是「当前节」下标，首个满四位时下标仍落在第 0 节、取到空串，万 / 亿永远拼不上。现改为按四位一节从高位向下拼接，节单位取本节下标，并补齐跨节零；顺带纠正角位为 0 而分位非 0 时「元」后必须写「零」、不足一元保留「元」位。仅「≥1 万」「x.0y 元」「0<|金额|<1」三类输出变化，全部由错转对。
- **字体下拉展开时把宿主撑变形**（[Gitee #IKP3MU](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKP3MU)）：候选列表此前留在文档流里，展开时把顶栏收纳单元由 28px 撑到 157px、属性台字体字段下移 122px；现改为浮层并按可用空间上下翻档，顶栏 /「更多」面板 / 属性台三处不再被撑开。该缺陷自 1.3.3 格式工具栏并入顶栏起存在，不是 1.3.7 工具栏收纳的回归。
- **含表格与横竖线的单页模板被拆成两页**（[Gitee #IKOUJI](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKOUJI)，C3）：分页预算原按一维纵向流累加，两条与表格横向不相交的竖线也会吃掉纵向预算，表格放不下即虚假换页；换页后元素改用流式光标，设计坐标随之丢失。现改为按横向占用列记账，横竖线与表格各算各列；报告人模板由 2 页 / 横线跳到第 2 页 y=38.9 恢复为 1 页 / y=86.8（设计 86.87）。**说明**：同一 issue 内的 C2（表格跟随区数据驱动漂移）与 C1（跟随区内竖线高度丢失）仍未修复，已登记 TODO T-11，本次不宣称全部关闭。
- 设计态**未求值的图片表达式**（如 `{image}`）不再被当成真实图片：属性台回落到内置示例图并明确标注「示例图」，换图或加载失败时清掉上一张图的可挪量与取景窗，不再出现「破图 + 旧余量」；同时修正取景示意框被面板宽度拉成横条的几何错（红框现与示例图同框）。
- **素材台字段名过长时中文被挤没**（[Gitee #IKPAGV](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV)）：字段行原为「中文名 + 变量名」同行，变量名不限宽，长变量名把中文名挤到 0px、自己也冲出 224px 侧栏被裁。现改为自适应换行——放得下仍同行，放不下时变量名落到第二行、中文名独享整行宽度；两侧各自超长时按省略号截断，整行悬停显示「中文名 (变量名)」全文，分组名同样补悬停全文。canvas 与 print-common 同一结构同一规则，实测长字段中文名 148px 完整显示，原始 14 条字段仍全部单行 33px。

## V1.3.7(2026-10-19)

### 新增

- demo-common 四个子 demo 的顶部操作区接入**同一套自适应收纳**（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4) 拆解项 T-10）：jquery / vue2 / react / vue3 宿主各自新增 `src/topbar-overflow.js`（判定与 core `resolveToolbarOverflow` 一致；直挂形态没有打包器，拿不到 core 子路径，故就地实现同一算法）与 `src/styles/topbar-overflow.css`（`demo-ui.css` 是同源产物、禁止手改，收纳布局另起一份），可折叠项统一包 `.demo-ou`、面板内给 `data-overflow-slot` 落位。四宿主实测 1600/1280/900/700/640 五档：文本折行 0、内容溢出条底 0、顶栏恒 45px、收纳数 0/0/3/5/8；被移进面板的复选框仍随框架状态更新（class 加 `on`、文案改「3 份」）且不回到行内。

- 文本**两端对齐** `justify`（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：`TextAlign` 增档，属性台「对齐」加「两端」radio、格式工具栏对齐面板加第四格（canvas 与 print-common 同图标 `TextAlignJustify`，common 图标表由 canvas 导入自动派生），tip 写明「撑满行宽，含末行」。出纸端与画布/common 同策两处：一是 `justify` 与垂直对齐组合时把 flex 主轴改成纵向，让行盒取满宽（横向 flex 的匿名文本项无法拉伸，改前会静默回落成左对齐）；二是随 `text-align:justify` 一并输出 `text-align-last:justify`——CSS 的 `justify` 不拉伸段落末行，而文本元素通常只有一行、那一行就是末行，改前单行设两端对齐毫无变化（真实设计器实测：元素盒 349px 宽而单行行盒只有 140px，改后行盒撑满 349px）。语义按打印设计器同行取「撑满行宽」，与 Word 的「两端对齐」有别：多行文本的末行同样被拉开（Word 中该形态叫「分散对齐」）。
- 表格**单元格两端对齐**：属性台「水平对齐」补第 4 档「两端」（canvas 与 print-common 同位同文案）。此前格式工具栏的第 4 格在单元格上下文里已经能写入 `align: 'justify'`（`useFormatToolbar` 在 `context==='cells'` 复用同一对齐面板），但属性台看不到也点不到，且出纸只输出 `text-align:justify`——真实设计器实测 83px 宽的表头格里内容仍停在 48px。现三端补齐：core `matrixCellStyle()` 成对输出 `text-align-last:justify`，canvas `TableElement` 与 print-common `table.ts` 的单元格样式同步；真实设计器点「两端」后同一格行盒 48px → 撑满内容宽 73px。缺省仍按 `left`/`center` 走，存量模板零变化（仅 `align === 'justify'` 时多这一条声明）。
- 长文本**首行缩进** `longTextIndent` 真正落纸（属性台「外观」组同时补上「首行缩进 (字符)」入口与说明）：`text-indent` 以 **em** 输出（随字号走，`textFit='shrink'` 把字号缩小后缩进同步变窄），与 Word/WPS「首行缩进 2 字符」同形态；画布与 print-common 两处由 `pt` 同步改为 `em`。仅 `longText` 元素消费，给 `text` 元素塞该键不生效——与画布语义对齐。
- 图片**裁剪锚点** `objectPosition`：独立 image 与表格单元格图片的 `<img>` 输出 `object-position`（如 `center 20%`，证件照保住头顶）；属性台「外观」组为 image 新增「缩放模式」与「裁剪锚点」，表格单元格属性面板同步补「裁剪锚点」（仅图片单元格显示）（canvas 与 print-common 同位同文案，说明挂 `button.pd-help`，文案单一来源是 core 的 `PROPERTY_REGISTRY`）。含 `;`、引号、`url()` 等非法字符的值整条丢弃（宿主侧 CSSOM 同样丢弃，两端行为一致）。
- 桌面客户端出纸通路：**HTML 直打**。core 产出的最终 HTML 直接交给 `webContents.print({ silent: true })`，与浏览器 `window.print()` 同源：纸张按渲染管线算出的 `paperMm` 以**微米**显式声明，边距恒 `none`，出纸前把 `deviceName/pageSize/copies/landscape` 落日志（`Chromium 原生打印参数`）。三端都不再依赖外部命令。勾选「保留生成的 PDF」时才额外产出同一份 `printToPDF` 结果作为比对**参考件**（不勾选则渲染停在准备阶段，省一次出图）；任务记录新增 `printRoute` 留痕，旧记录按 `pdf` 理解。macOS 实测（支持自定义尺寸的标签队列）：落盘介质精确等于声明值（60×40 / 80×60 / 100×80 mm，`/Rotate=0`、内容正立），比 PDF 通路 `printToPDF` 的取整结果（60.4×40.2 mm）更准；`silent` 未弹交互框，60s 回调兜底未触发。
- 设计器顶部工具栏**自适应收纳**：宽度不足以容纳全部按钮组时，按固定优先级链（剪贴板 → 格式刷 → 缩放 → 排列/视图 → 边框 → 颜色 → 对齐 → 文字样式 → 字体与字号）从链首起把按钮组收进新出现的「更多」下拉，面板内保留原有分组标题与图标网格形态；全部收完仍放不下时品牌区文字转为省略号截断。判定函数 `resolveToolbarOverflow` 落在 `@worm-vue3-print/core/designer`，canvas 与 print-common 两套宿主共用同一链序。canvas 侧用 `Teleport` 搬运，组件实例不重挂载，因此「边框」面板里选好的线型/粗细/颜色在窗口反复缩放后存活；common 侧因整树重建模型改为重绘后置遍搬运，并新增 `openMore` 状态使「更多」与内层下拉能同时展开。
- demo 顶部操作区接入同一套收纳：常驻「worm-vue3-print」标识、标题与「打印输出」，其余 9 项按 模板 ID → 业务类型 → 宿主示例切换 → 清空 → 导入模板 → 导出模板 → 自定义字段与数据 → 批量打印 → 加载示例 的顺序收进「更多」，面板用 demo 自身视觉、宿主自持 DOM。改前实测 640px 宽时顶部条只有 45px 高而「自定义字段与数据」按钮被压到 156px 高（逐字竖排），11 个文本项全部折行并溢出条底 55px；改后同宽度全部收进面板，无一项竖排、无溢出。左右分隔改由显式 `.demo-spacer` 承担（原 `.demo-print-btn:first-of-type { margin-left: auto }` 在按钮被包成收纳单元后已选不中）。
- 收纳机制提升为 canvas 公开 API：新增导出 `provideToolbarOverflow` / `useToolbarOverflow` / `emptyToolbarOverflow` / `createOverflowUnitDirective` / `TOOLBAR_OVERFLOW` 与 `ToolbarOverflowContext` / `OverflowUnitDef` 类型，宿主自己的工具栏可复用同一链序与判定；落位容器改按 `data-overflow-slot` 属性配对、自然宽排除项按 `data-overflow-more` / `data-overflow-spacer` 属性识别，不再与 canvas 的类名耦合。

- 桌面客户端窗口与托盘图标改用与安装包同源的 `build/icon.png`（该图随之进 asar，安装包约 +1 MB），任务栏、Alt-Tab 与快捷方式图形一致；macOS 托盘仍用单色模板图以适配菜单栏深浅色。
- 属性台新增「**静区 (模块)**」（[Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)）：二维码四周留出的空白格数，二维码**元素**与**表格单元格**都能设，canvas 与 print-common 两套宿主同口径，范围 0~8、**缺省 0**（此前出纸固定 4 模块，因此既有模板的码面占框比例从 72.4% 变 100%）。0 即不留白边、码面等比铺满元素框，扫码所需静区由元素框外的白纸充当；需要 ISO/IEC 18004 推荐的合规静区时显式填 4。属性搜索可用「静区 / 白边 / 留白 / 铺满」命中。说明文字挂在标签后的帮助图标上（悬浮或点击才浮出，文案单一来源在 core 的属性注册表），不常驻占用属性台纵向空间。
- **`@worm-vue3-print/common` 以预览版发布到 npm**：此前该包只在工作区内构建，非 Vue3 宿主只能走源码安装。本版起发布**预发布版本**——dist-tag `next`、版本 `1.3.7-beta.0`、**不占 `latest`**，安装必须写 `npm i @worm-vue3-print/common@next @worm-vue3-print/core`（npm 上还没有 `latest`，省略 `@next` 会报 `No matching version found`）。同时补开样式公开子路径 `@worm-vue3-print/common/style.css`（→ `dist/common.css`，只有渲染进 light DOM 才需要它；此前 `exports` 只开放 `.` 与 `./browser`，打包器侧引不到这份 CSS）。发布通路**不进 GitHub Actions**，改由本地脚本：演练 `npm run publish:common:dry-run`、正式发布 `npm run publish:common:beta`（固定按 core → canvas → common 构建，再跑 core / canvas / common 三套测试；演练 exit 0，tarball 43 文件 / 380.0 kB / 解包 1.3 MB），步骤与红线见 `CONTRIBUTING.md`「方式三」。**该包仍是实验性质、尚未完成稳定性测试，不建议用于生产**；Vue 3 项目请继续用 `@worm-vue3-print/canvas`。

### 变更

- demo：**自定义字体改为跟随模板声明**。设计器字体候选与画布 `@font-face` 的来源由宿主常量 `DESIGNER_FONTS` 改为**当前模板 JSON 自带的 `fonts`**（多页模板用 core 的 `mergeFontDeclarations` 合并各页），同时删掉与 `template-comprehensive-showcase.json` 内那份重复的声明。只有综合示例模板内嵌三款公开字体（马善政毛笔楷书 / 站酷快乐体 / 站酷庆科黄油体），其余 9 份示例的字体下拉只剩「默认」，保存与导出也不再被写入字体声明；导入自带 `fonts` 的模板同样自动生效。模板内保存的是相对路径 `/fonts/...`（各出图端按自己的 `baseUrl` 解析），传给设计器前补成 `FONT_BASE_URL` 绝对地址，避免 GitHub Pages 子路径部署时 404。

### 变更（破坏性）

- 桌面客户端**取消「出纸方式」配置项**：`config.json` 不再接受 `printRoute`（旧文件里的该键被忽略），出纸固定走 HTML；需要回退到「HTML → `printToPDF` → 系统命令」时改 `print-engine.ts` 的 `ACTIVE_PRINT_ROUTE` 并重新构建，且只对 macOS / Linux 有效。
- 桌面客户端在 **Windows / Linux 不再显示 File/Edit/View/Window 应用菜单**（`Menu.setApplicationMenu(null)`，文本框的 Ctrl+C/V 由 Chromium 自身处理）；macOS 保留默认菜单。

### 移除（破坏性）

- 移除从未被消费的可选字段 `lHeight`（与 `lineHeight` 语义重复）与 `leftSpaceRemoved`：全仓零消费，模板里残留同名键被忽略，渲染行为零变化。

- 桌面客户端 Windows 侧的 **SumatraPDF 出纸通路整体移除**：`print-backend.ts`（三处安装位置探测）、`sumatra-installer.ts`（官方便携版下载 + sha256 校验 + 一键安装）、设置页的出纸后端状态条与 `worm:settings:install-print-backend` IPC 均不再存在，`printPdfFile` 在 win32 直接报错。此前该通路的口径（只发份数与方向、不发任何纸张参数）随代码删除，Windows 不再需要安装外部工具。
- 随之失效的参数口径：`paperName`（驱动纸型名）与 `margins` 在当前出纸通路**不被消费**（协议保留以兼容）。要按驱动纸型出纸请设驱动/队列首选项；`-o media=<名称>` 那条通路只在 macOS / Linux 保留。

### 修复

- 桌面客户端：**含条码或二维码的模板此前一张都打不出来**，任务固定以 `PRINT_FAILED：码值渲染超过 ~30000ms` 结束（无码模板不受影响）。渲染管线要先在页面里生成码值 SVG、再把它填进 HTML 去做测量，即**码值阶段早于任何一次 `setContent`**；而客户端的 Electron driver 在窗口从未提交过任何文档时就调 `webContents.executeJavaScript`——Electron 会把这段脚本排队等一次文档提交，隐藏窗口永远不提交，调用于是静默挂到超时。现 driver 在首次注入执行器前先载入一个空白文档。实测（本机 PDFwriter 虚拟队列）：出厂面单模板（条码 + 二维码、自定义纸 100×150mm）由超时失败变为 **2.5s 出纸**，落盘介质精确 100.00×150.00 mm、`/Rotate=0`；单条码 1.5s、单二维码（静区 4）1.5s、含两端对齐/首行缩进/裁剪锚点/双二维码的排版探针模板 1.9s。**该缺陷自 1.3.5 起即存在**（同一台机器上用户已装的 1.3.5 客户端跑同一模板同样超时，已实测对照），非 V1.3.7 引入，随本版安装包一并修复——升级前用桌面客户端打条码/二维码的用户，此前只能改用浏览器打印或服务端 PDF。
- 子 demo 顶栏的「宿主示例」互跳下拉**常驻可见**并压在画布上：`demo-ui.css` 里 `.demo-host-switch-menu { display: flex }` 这条作者规则盖住了 `<details>` 闭合态的 UA 隐藏。四宿主的 `topbar-overflow.css` 各补一条 `.demo-host-switch:not([open]) > .demo-host-switch-menu { display: none }`；根治应落到 demo 样式源后重跑 `npm run styles:demo-common`。
- common 宿主的属性台**字段帮助气泡与 canvas/vue3 不一致**：canvas `DesignerToolbar.vue` 里裸选择器 `[data-tip]::after`（`bottom:-32px; left:50%; translateX(-50%); padding:4px 8px; white-space:nowrap; z-index:100`）在派生 common 样式表时被剥掉 `[data-v-*]`，连带命中属性台的 `.pd-help::after`——90 多字的「静区 (模块)」说明因此不换行、被拉成超宽长条且左偏居中、层级从 120 掉到 100。`scope-patches.css` 按 `native-controls.css` 的 `.pd-help::after` 逐条还原（top/bottom/left/transform/padding/white-space/z-index）。A/B 实测：同一探针元素两侧现均为 `left:0 / transform:none / padding:5px 7px / white-space:normal / width:196px / z-index:120`，仅 `top` 差 1px（气泡定位基座是 `.pd-label`，其行高两宿主本就有 ±1px 记录内差异）。

- 「更多」收纳面板内的下拉子面板（如「边框」）向右戳出父面板：1000px 视口实测父面板 186px、子面板 218px 且左边距 17px，**溢出 48px**（[GitHub issue #4](https://github.com/worm-longliu/worm-vue3-print/issues/4) 附带项 T-07a）。`.tb-more-panel` 现按实测抬高 `min-width: 244px`（17 + 218 + 9），改后父面板 246px、溢出归 0；print-common 侧「更多」面板本就 282px 容得下 218px 子面板，规则无副作用。

- 独立 image 元素的 `fit` 在出纸端被写死 `object-fit:contain`（画布按 `cover` 裁剪显示，预览/PDF/客户端三路都不一致）：改为读取 `opts.fit`，未设时仍 `contain`，存量模板输出逐字不变。
- 主题变量接通：`native-controls.css` 输入类控件/选项 chip/`​.pd-dialog`、`ExpressionEditor` 类型页签与 hover 与预览错误态与四张帮助卡片、`TableContextMenu` 全量、`PresetColorPicker` 触发器与浮层，以及滚动条三档（含 hover）统一改 `var(--pd-*, 原值)`；26 个新令牌集中登记在 `PrintDesigner.vue` 的 `.designer-container`，浅色默认逐像素不变（浏览器实测 `.pd-input`/`.pd-select`/`.pd-radio` 计算值仍 `rgb(255, 255, 255)`；`.pd-switch::after` 开关滑块白底属正确形态，显式保留）。
- `PresetColorPicker` 双根（button + Teleport）导致 `Extraneous non-props attributes (class)` 告警且样式落空：组件 `inheritAttrs: false` + 显式 `v-bind="$attrs"` 绑到触发器；`.page-bg-picker` 的 `flex: 1` 改由真实节点承载——fragment 根拿不到宿主 scoped 属性，class 即使落位也匹配不上 `.page-bg-picker[data-v-*]`。

- 桌面客户端（macOS）：**回退的 PDF 出纸通路上，横向标签被打成纵向**。V1.3.6 登记的「`-o orientation-requested=4` 的实现是**交换介质长宽**，故 macOS 的 `Custom.` 也按纵向序（短边×长边）声明」**结论有误**——该观测来自 PostScript 通路（`cgpdftops`）的 `do_rotate` 日志，而 driverless / `_ib` 这类**直接收 PDF 的队列走 `cgpdftopdf`**，其语义是「按你声明的介质朝向，把内容转过去贴它」，并不交换介质。实测（macOS 15.7.8 + CUPS 2.3.4，开源 RWTS-PDFwriter 虚拟队列，9 种纸型 × 3 种下发形态共 27 例）：100×75 标签按 `Custom.212.6x283.46` 加方向请求下发时，落盘介质为 212×283pt 的**纵向页**且内容被补 90°；改按 `Custom.283.46x212.6` 真序声明则介质=100×75 mm、内容正立、产物字节与输入一致。现 **`Custom.` 与 Linux 统一按页面真实朝向声明，macOS 不再为它补方向请求**；方向请求只保留给「命中标准纸型名（`A4` / `Letter` 本身就是纵向介质）的横向页」，该场景实测行为不变（在纵向纸上正立出横向）。**行为变更**：仅影响 macOS 上把 `ACTIVE_PRINT_ROUTE` 改回 `pdf` 的回退构建；默认的 HTML 直打不消费 `media=`，不受本条影响。接单前可用 `grep -m1 CustomPageSize /etc/cups/ppd/<队列>.ppd` 确认队列认不认自定义尺寸——不支持时 `Custom.` 仍会被静默忽略并回落驱动默认纸型，标签只能靠驱动内已定义的 `paperName`（仅在 PDF 通路可用）。

- 设计器顶部工具栏**不再折行压画**（[GitHub issue #4 评论 1](https://github.com/worm-longliu/worm-vue3-print/issues/4)）：此前按钮组与其文字标签可被 flex 压缩，实测自然宽合计超出可用宽即出现文字逐字换行，标题区被压到 13px 宽 / 62px 高、整块 146px 高并溢出工具栏底边 47px 叠到画布上；触发点比反馈更靠前——**1520–1600 CSS px 之间**就开始折行（1080p / 2K 屏 100% 缩放即命中），并非只有明显缩小视口才会出现。现由上面的自适应收纳承接：子项一律禁止压缩（仅品牌区可收缩），放不下先收按钮组，收尽仍不足才让品牌区文字走省略号。

- 二维码**不再小一圈，铺满元素框与单元格**（[Gitee issue #IKN95F](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKN95F)）：二维码走 `<img>`，但出图端只写了 `max-width/max-height:100%` 而没有 `width/height:100%`——替换元素因此按内在尺寸绘制，而 SVG 的内在尺寸是「模块数 × 4 + 4 模块静区」（默认码值 116px ≈ 30.7mm），与元素框的 mm 完全无关，框一旦大于它就明显不铺满、`object-fit` 也随之空转（真实 Chromium 实测：60mm 框只画 65.3%、80mm 框 48.9%；24mm 框恰好被 `max-width` 压满，所以小二维码看不出来）。出图端现补 `width:100%;height:100%`，`fit` 未设置时按属性面板默认输出 `object-fit:contain`（此前预览写 contain、出纸不写，两边口径分裂）。设计态四处实现（canvas 的 `QrcodeElement` / `CellBarcode`、print-common 的 `shell/code.ts` / `shell/table.ts`）改用 `@worm-vue3-print/core/browser` 的同一份 SVG：canvas 此前把 mm 数值当 px 传给 `qrcode` 库的 `toDataURL({ width })`，28.2mm 的框只出 28px 的图（实测占容器 26.3%）且模块宽落在非整数像素上；print-common 元素级用 `margin: 0`、单元格用 `margin: 1`、出纸用 4 模块，静区三处各不相同。**静区**：此前出纸固定 4 模块、canvas 预览 1 模块、print-common 预览 0 模块，三处各说各话；现统一由新属性 `qrQuietZone`（属性台「静区 (模块)」）决定，缺省 0 模块（码面即等比铺满元素框），缩放元素框也不再重出图。


## V1.3.6(2026-10-16)

### 新增

- 桌面客户端 Linux 安装包（`deb` / `rpm` / `AppImage`，x64）：`npm run pack:client:linux` 在 Docker 容器内交叉构建（`rpm` 目标依赖 `rpmbuild`，macOS 宿主没有该可执行文件），产物随发行版附件提供。包内容、依赖声明与 SHA-256 均已核对，但**未经任何 Linux 真机安装与出纸验证**：出纸依赖 CUPS，AppImage 需 `libfuse2`（只提供 fuse3 的发行版可用 `--appimage-extract-and-run`），deb/rpm 内 `chrome-sandbox` 为非 setuid（`0755`）。本版不提供 `snap` 与 arm64 包，口径见 [客户端 README](../../clients/print-client/README.md)。

### 修复

- 桌面客户端（Windows）：**静默打印把「宽大于高」的标签页旋转 90° 出纸**。100×75 mm 这类宽幅标签经客户端静默打印时，纸上内容被整体旋转 90°，而生成的 PDF 本身正确（在阅读器里方向正常）。根因是 Windows 出纸交给 SumatraPDF，它默认会对「宽 > 高」的页面无条件加 90°，只在方向被判定为横向时才抵消回 0°，而未显式声明方向时该判定取自打印驱动（标签驱动默认多为纵向）。现按页面自身长宽比显式声明方向（`-print-settings "<份数>x,landscape|portrait"`，正方形页归 `portrait`），宽幅页不再被旋转。**行为变更**：升级后同一份宽幅标签的出纸方向与 PDF 一致；此前为规避该问题把模板做成竖版再手动旋转的做法需改回按真实出纸方向设计。驱动中标签定义的朝向若与模板不一致，仍可能由驱动反向旋转，需在驱动 / 机器设置里对齐。
- 桌面客户端（macOS / Linux）：**纸张声明此前从未真正下发**。`printPdfFile` 组装出纸命令时按字段逐个转发参数、漏掉了 `paper`，页面尺寸因此到不了命令构造层，V1.3.0 起引入的 `-o media=…`（宿主指定驱动纸型 → 标准纸型匹配 → `Custom.<宽>x<高>`）只在宿主显式给出驱动纸型 `paperName` 时才下发。现改为原样透传全部选项。**行为变更**：macOS / Linux 客户端出纸现在会真正声明纸张，此前按队列默认纸张（多为纵向 A4/Letter）处理的任务改用页面真实尺寸；横向页还需下一条的方向声明。
- 桌面客户端（macOS / Linux）：**横向页只声明纸型名仍被转 90°**。实测判据与 Windows 同源——CUPS 的 `pdftops` 按「生效介质朝向 vs 页面朝向」补 90°，而 `A4` / `Letter` 这类标准纸型名本身就是**纵向介质**，声明它等于把横向页贴到纵向纸上，照样被转。macOS 出纸在「页面宽 > 高且未指定驱动纸型」时额外下发 `-o orientation-requested=4`，让滤镜把介质翻成横向（实测 `do_rotate` 由 90 变 0）；纵向页与正方页不发（发了介质被翻成横向、正立内容反被转 90°）。该请求的实现是**交换介质长宽**，所以 macOS 上的 `Custom.` 也随之改按**纵向序（短边×长边）**声明，翻一次正好落回页面真实尺寸（实测支持自定义尺寸的队列上，按真序声明再翻会把 100×75 标签打回 212.6×283.46）。**Linux 反向走纸张**：cups-filters 1.28 实测把 `orientation-requested` 实现为「给页面写 `/Rotate 270` 并交换 MediaBox」，标签机反被打歪，所以 Linux 不发该请求，横向页也不再报纵向纸型名，改按页面真实朝向走 `Custom.<宽>x<高>`（A/B 实测：同一份横向 A4 在支持自定义尺寸的队列上 MediaBox 由 595×842 变为 841.89×595.28，且不写 `/Rotate`）。**行为变更**：macOS 与 Linux 上横向 A4、宽幅自定义纸的出纸方向与 PDF 一致。注意队列 PPD 不支持自定义尺寸时 `media=Custom.*` 会被**静默忽略**并回落队列默认纸张（AirPrint / driverless 队列即如此，实测三种参数下发的旋转结果完全相同），标签类纸张建议在宿主侧传驱动内已定义的 `paperName`。

## V1.3.5(2026-10-05)

### ⚠️ 破坏性变更（移除功能）

- **移除「首页专属」首页叠加区**：`@worm-vue3-print/core` 的 `TemplateData.firstPageOverlay` 字段、分页引擎的首页预算扣减、`.first-page-overlay` CSS 与首页叠加层 HTML 全部删除；`@worm-vue3-print/canvas` 与 `@worm-vue3-print/common` 的工具栏「首页专属」入口、画布叠加区占位、属性面板「首页叠加高度」字段同步移除。**行为变更**：`firstPageOverlay.height > 0` 或含元素的用户自有模板，出纸排版回归「无首页叠加区」——首页内容区可用高度比 1.x 多出该叠加高度，请按新口径复核版式。导入含该字段的旧模板时由 `normalizeTemplateUnits` 自动剥离，不会报错。
- **移除设计器「叠层对比」**：canvas 的 `requestScreenshot` prop 与 `ScreenshotRequest` / `RequestScreenshotFn` 类型、Common 的 `requestScreenshot` 属性与 `setOverlay()` 公开方法删除。宿主无需再注入截图适配器。
- **移除服务端截图能力**：`@worm-vue3-print/core` 的 `renderScreenshot` / `buildScreenshotTargetSpec` / `ScreenshotTargetSpec` / `PrintSession.toScreenshot` / `PageDriver.screenshot` 与 `@worm-vue3-print/render` 的 `POST /render/screenshot` 端点删除。PDF 链路（`renderPdf`、`POST /render/pdf`）以及浏览器打印、服务端 PDF、桌面静默打印三条出纸口径均不受影响。
- **`PrintFailureCode` 联合类型移除成员 `'SCREENSHOT_FAILED'`**：该成员随截图管线一并删除。这是对外公开类型的成员删除——从 npm 升级到 1.3.5 后，任何对该成员值的引用（`switch` 分支、赋值、类型标注）都会编译报错，请删除对应分支或改用其余码值（`INVALID_PAPER` / `MEASURE_FAILED` / `RENDER_TIMEOUT` / `PDF_FAILED` / `UNSUPPORTED_RUNTIME` / `INTERNAL`）。
- `skills/print-template-json` 的模板生成器不再补齐 `firstPageOverlay` 骨架字段；内置示例模板已同步剥离。
- 已知落后：工具栏演示视频仍包含「首页专属」「叠层对比」两个按钮的镜头，本版未重录。

### 修复

- `@worm-vue3-print/canvas`：**右键菜单弹出后所有动作点了没反应**。根因是画布「外点即关」的 `mousedown` 监听会在菜单项的 `click` 之前移除菜单 DOM，元素菜单 8 项与表格菜单 12 项全部落空。现改为菜单根节点 `@mousedown.stop` + `contains` 守卫 + 菜单代次计数（连续右键两处不会互相关闭），动作统一经 `closeContextMenu` 解绑后再派发；表格菜单同理由 `mousedown` 改 `mouseup` 关闭。**行为变更**：此前依赖「右键弹菜单但动作无效」这一表象写的宿主代码会开始真的执行复制 / 粘贴 / 删除 / 层级等操作。
- `@worm-vue3-print/canvas`：**表格单元格右键无反应**。单元格层原本带「表格未选中即忽略」守卫，且 `stopPropagation` 已挡住元素菜单，导致未选中表格时右键完全静默。现改为右键命中即先单选该表格再弹表格菜单，与「单元格右键不要求先选中」的口径一致。
- `@worm-vue3-print/canvas`：**右键不再改变选中态导致操作静默失效**。复制 / 剪切 / 删除 / 层级只作用于当前选中集，而此前点空白取消选中后再右键元素仍是未选中态，操作看似无反应。现右键命中非选中元素时先单选该元素（命中已选中的多选成员不打断多选），元素菜单「粘贴」补剪贴板守卫，与空白菜单口径统一。

### 变更

- **npm 分发署名与产物体积**：`@worm-vue3-print/core`、`@worm-vue3-print/canvas` 补 `LICENSE` 文件与 `author` / `repository` / `readme` 元数据；构建产物统一注入 MIT 版权头（core 由 tsup banner 覆盖 esm / cjs / minify / iife，canvas 由 vite 插件覆盖 lib 产物，类型声明由 `scripts/inject-license-banner.mjs` 兜底）。canvas 关闭 sourcemap，tarball 由 606.9 kB 降至 203.6 kB，且不再随包发布未混淆源码。
- **样式引入入口口径修正**：npm 宿主必须 `import '@worm-vue3-print/canvas/style.css'`。此前文档中的 `@worm-vue3-print/canvas/native-controls.css` 不在包的 `exports` 声明内，Node 解析直接报 `ERR_PACKAGE_PATH_NOT_EXPORTED`；该路径只有源码 / 别名接入方式可用。共修正 7 处文档示例。

### 新增

- 文档：新增英文首页 `docs/en/Overview.md`（页首声明由 AI 依据中文文档生成、中文版为权威版本）；README 新增「依赖开源协议」章节（含 dev 依赖逐包审计，无 GPL / AGPL / LGPL 污染，`dompurify` 按 Apache-2.0 分支使用）。
- demo：新增「双列卷纸标签」示例（60×45 mm 标签拼版到 122 mm 宽卷纸，页高 = 单枚标签高，份数由渲染管线按 `perSheet` 自动分页）；新增竖屏口播视频流水线（1080×1920 成品与 ASS / SRT 字幕）。示例计数修正为 10 份。

### 实验性（不在 npm 发布范围内）

- `@worm-vue3-print/common`（工作区包 `packages/print-common`）与多宿主示例 `demo-common/` 为**实验性质、尚未完成稳定性测试**，只在工作区内构建，未发布 npm；用于以零框架运行时形态（原生自定义元素 `<print-designer>`）向 Vue 3 / Vue 2 / React / jQuery 等多种运行时框架（含无框架宿主）提供设计器。Vue 3 项目请使用 `@worm-vue3-print/canvas`。本版本内该包对齐 canvas 的右键口径，并把双击改走 `mousedown` 判定器（画布重绘会断掉原生 `dblclick`），新增与 `dblclick-element` 对称的宿主事件 `dblclick-cell`；示例库与样式由 `scripts/sync-demo-samples.mjs`、`scripts/sync-demo-styles.mjs` 从 `demo/` 同源生成，五个宿主工程顶栏提供互跳入口。

## V1.3.4(2026-09-27)

### 修复

- `@worm-vue3-print/core`：**出纸页脚左边距丢失**。出纸 CSS 里 `.page-footer` 为绝对定位，包含块是 `.print-page` 的 padding box 外缘（= 纸面左缘），`left: 0` 使 `margins.left` 对其不生效——页脚元素出纸后比设计器预览整体左移一个左边距（页眉 / 内容区在文档流内，正常享受 padding）。现改为 `left: margins.left`，与垂直方向 `top` 显式补偿下边距的既有做法对称；浏览器打印、服务端 PDF、桌面客户端静默打印三条链路共用此 CSS，一并修复，出纸旋转（转子）与批量连续纸场景随之生效。**行为变更**：存量模板出纸页脚会右移 `margins.left`（即与设计器所见对齐，属纯修复）；此前若靠手动加大页脚元素 `left` 补偿过该问题，升级后会出现双重偏移，需在设计器中把 `left` 调回预期位置。

## V1.3.3(2026-09-27)

### 新增

- `@worm-vue3-print/core`：**元素级边框全量生效并支持分边**。新增 `render/element-border`（`resolveElementBorder` / `ELEMENT_BORDER_SIDES` / `acceptsElementBorder`）作为元素边框的唯一判定口径，画布与出纸共用同一函数（px 口径，`box-sizing: border-box`，边框不改变元素几何），并经 `/designer` 子路径导出供设计器复用。`ElementOptions` 新增 `borders` 分边字段（`top` / `right` / `bottom` / `left`，在整圈 `borderWidth` / `borderStyle` / `borderColor` 之上逐边覆盖；未设整圈时仅这些边生效）。`rect` / `oval` / `hline` / `vline`（用 border 画自身本体）与 `table`（走单元格边框）排除在外，避免双重边框；宽度未设、≤0 或非法值一律视为无边框，不兜底成默认边框。**行为变更**：存量模板里已写入元素级 `borderWidth` 的非形状元素（文本、长文本、图片、条码、二维码、HTML、页码）此前画布与出纸都不显边框，升级后会真的画出边框；形状、线条与表格不受影响。
- `@worm-vue3-print/canvas`：**格式工具栏**（仿 Word / WPS）。字体、字号、加粗 / 下划线 / 删除线、文字色 / 背景色、水平与垂直对齐、边框（预设「所有 / 外侧 / 内部 / 无」+ 单边开关 + 线型 / 线宽 / 颜色）可一次作用于全部选中元素或表格单元格；多选样式不一致时以「混合」占位显示。
- `@worm-vue3-print/canvas`：**格式刷**。单击刷一次、双击连续刷、`Esc` 或清空选中退出；从单个源元素捕获格式，按目标类型过滤写入（文本字段仅落文本 / 长文本，元素级边框仅落在可携带边框的类型，背景色各类型通用），分边边框深拷贝，框选多目标一次提交只记一次历史。
- demo：**教学视频流水线**。串起 Playwright 录制 → edge-tts 配音 → ffmpeg 合成，含打样单风格片头封面、`VIDEO_SCRIPT` 多剧本切换（工具栏 / 表达式 / 组合教学）与字幕同步校验。

### 变更

- `@worm-vue3-print/canvas`：格式工具栏由第二行独立条**合并进顶部工具栏单行**，对齐 / 边框 / 排列 / 视图收进下拉分组（新增通用 `ToolbarDropdown`）；原先随选中状态显隐的分组改为**常驻 + 置灰**，禁用按钮悬停提示给出原因。宿主若依赖设计器内部 DOM 结构 / 类名，需重新核对。

### 修复

- demo：字幕同步校验的停顿采样窗由 `[end+0.1, +0.35]` 收窄为 `[end+0.05, +0.2]`，避免探入下一句声母而把上一句误判为「抢跑」。

### 文档与维护

- 设计器内置帮助新增「格式工具栏与格式刷」说明，更新记录同步本版本。
- demo 录制器新增 `reload` 步骤，16:9 1920×1080 画面口径与路径口径拆出 `paths.mjs`。

## V1.3.2(2026-09-26)

### 新增

- demo：新增**「分页极限测试」多页示例**（组合 + 表格的极端版式，用于复现与验证换页后的元素放置），纳入示例库；`SampleThumb` 缩略图兼容多页模板 wrapper。

### 变更

- `@worm-vue3-print/canvas`：设计台图标全面换为 **lucide 按需引入**（工具栏 / 图层面板共 17 个图标，统一补齐 tooltip），组合 / 取消组合改用 `Group` / `Ungroup` 专属图标。
- `@worm-vue3-print/canvas`：**组合与多选交互口径修正**：① 取消组合入口在任一选中元素属于组时即显示（旧「单选才显示」对整组多选是死分支）；② 元素拖拽起点不再重复发送 select，Ctrl/⌘ 逐个加选生效，画布与图层面板均可多选；③ 图层面板底部新增独立一行的组合 / 取消组合按钮，支持 Ctrl/⌘ 加选；④ 画布右键菜单移除此前并不生效的「编组/取消编组」入口，组合入口统一为：工具栏按钮、图层面板底部按钮、快捷键 `Ctrl+G` / `Ctrl+Shift+G`；⑤ 帮助文档补充框选规则（从空白区起拖：左上→右下=相交命中、右下→左上=完全包围命中）、组合强制同页与超高裁切警示，用户可见文案统一为「组合 / 取消组合」。

### 修复

- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：**表格下方跟随元素的打印间距被拉大**。表格设计底部（`tableDesignBottom`）旧口径只取 `tableRows` 行高之和（min-height 语义），忽略设计器实测回写的 `options.height`——当行内容把表格撑高时，跟随偏移多算出「实测高 − 行高和」的虚假间距（实测模板最大达 3.77mm）。现改为 `top + max(options.height, Σ行高)`：以画布视觉底部为基准，行高之和保留为物理下界，避免脏数据把跟随元素反向叠压表格。**行为变更**：存量模板中「行内容把表格撑高」的模板，表下跟随元素的出纸间距会收回到与设计台所见一致；在设计器保存过的模板属纯修复，三端（浏览器预览 / 服务端 PDF / 桌面客户端）同源生效。
- `@worm-vue3-print/core`：**分页换页后区块一律锚 0，导致末页组合元素叠压表格**。换页后表格续片、组合、普通元素原本都从新页顶部 0 开始放置，应顺排的元素互相叠在一起。现改为流式光标（`pageCursorTop`）顺排放置，且表格切片起点在行组扣预算前提前捕获，保证跨页续片后跟随元素正确接排；并补充分页引擎极限回归测试（组合整组不拆分、多区块叠页场景）。
- demo：移除对 `@worm-vue3-print/canvas/native-controls.css` 的错误全局引入（该样式文件已不存在）。

### 维护

- `@worm-vue3-print/canvas`：修复测试间歇性 `localStorage` 未定义——新增全局 vitest setup 兜底。
- 仓库脚本：根 `package.json` 清理对已删除工作区 `@worm-vue3-print/client` 的残留引用。
- 文档：补充 Electron 客户端依赖 core **dist 子路径**（`@worm-vue3-print/core/client`）的构建约定——新增或改动 core 子入口后必须重建 core 的 dist。

## V1.3.1(2026-09-21)

### 新增

- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：表达式**数值运算与修约**。
  ① 四则函数：`ADD(a,b,…)`、`SUB(a,b,…)`、`MUL(a,b,…)`、`DIV(a,b)`，与运算符 `+ - * / %` 共用同一套数值语义，不便写运算符的场景可直接调函数。
  ② 修约函数：`ROUND(n,d)` 四舍五入、`ROUNDUP` / `CEIL` 进一法（远离零）、`ROUNDDOWN` / `FLOOR` 去尾法（朝零）、`ROUNDBANK` 四舍六入五成双（GB/T 8170）；`d` 缺省 2，传负数修约到整十 / 整百（`-2` → 百位）。修约按十进制字符串精确判定，不存在 `toFixed` 的浮点舍入陷阱，`ROUND` 与 `ROUNDBANK` 只在「恰好一半」时不同（前者进位、后者凑偶）。
  ③ 运算符补齐数值语义：字符串数字按数值参与运算、消除二进制浮点噪声、除零与空值兜底。详见下条「变更」。
  ④ 设计器表达式编辑器「函数」页新增「数值运算」分组，四则与修约函数可双击插入；帮助面板内置函数表同步补充。
- `@worm-vue3-print/core`：新增底层数值模块（`numeric.ts`），函数与运算符共用；主入口导出 `addNumbers` / `subtractNumbers` / `multiplyNumbers` / `divideNumbers` / `round` / `roundUp` / `roundDown` / `roundHalfEven`，宿主自有逻辑可复用。
- demo：新增**综合示例模板**（A4 横向、多级表头、表格单元格内图片 / 条形码 / 二维码混排），纳入示例库与 `print-template-json` 技能资源；顶栏「加载默认布局」改为「加载示例」，进入页面即自动载入该模板。
- demo：新增**「自定义字段与数据」弹窗**——直接在页面上增删打印数据字段、编辑多份打印数据，批量打印同步适配。
- demo：支持**静态托管在线预览**——新增 `edgeone.json`（EdgeOne Pages）与 `.github/workflows/pages.yml`（GitHub Pages，推送 master 自动构建部署，预览地址见 README）；字体基址与示例图片路径改用 `import.meta.env.BASE_URL` 与当前站点 origin，去掉 localhost 硬编码，适配子路径部署。

### 变更

- **静默打印浏览器端 SDK 并入 core，不再单独发布**：原独立包 `@worm-vue3-print/client`（`0.1.0`，从未发布到 npm）迁移为 `@worm-vue3-print/core` 的子路径导出 `@worm-vue3-print/core/client`，导入方式由 `import { PrintClient } from '@worm-vue3-print/client'` 改为 `from '@worm-vue3-print/core/client'`。SDK 零运行时依赖（仅用浏览器 WebSocket），core 不新增依赖；`PrintClient`、`WsTransport`、`WormPrintError`、`MESSAGE_TYPES` 等全部导出符号与能力保持不变。`packages/print-client-sdk` 目录删除；桌面客户端（Electron）内部引用同步改走 core。
- `@worm-vue3-print/core`：**行为变更** 算术运算符（四则与一元正负号）改为数值语义，存量模板在以下场景结果会变（都是朝「符合直觉」的方向修）：
  ① 两侧都是数字或数字字符串时按数值运算——`'3' + 4` 由 `'34'` 变为 `7`，`{qty + price}` 不再拼出 `312.5`；
  ② 消除二进制浮点噪声——`0.1 + 0.2` 由 `0.30000000000000004` 变为 `0.3`，`12.5 * 3 * 1.13` 由 `42.37499999999999` 变为 `42.375`；
  ③ 除数为 0 或无法解析为数字时返回 `0`，不再输出 `Infinity` / `NaN`；`null` / 空串参与算术按 0、拼接时按空串（此前拼接会印出 `null`）；
  ④ 任一侧不是数字时 `+` 仍保持字符串拼接（`name + '有限公司'` 行为不变）。
- demo：打印预览弹框改为**全屏**（内容区占满视口），移除「点击空白处关闭」，新增 Esc 关闭。

### 修复

- `ROUND(n, d)` 此前由 `Number.toFixed` 实现，存在浮点舍入错误：`ROUND(1.005, 2)` 得到 `1`（应为 `1.01`）、`ROUND(2.675, 2)` 得到 `2.67`（应为 `2.68`）。现按十进制精确修约。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：系统变量**无法在表达式内参与运算或函数调用**——`{pageIndex + 1}`、`{ADD(pageIndex,1)}`、`{DATE(printDate,'YYYY')}` 求值失败后会被当作原文印出（模板求值失败的降级行为），只有「整个花括号就是一个变量」的 `{pageIndex}` 能出结果（靠出图后的文本替换）。原因是绑定阶段的表达式上下文里只有业务数据，不含系统变量，而页码要等分页后才有值。现改为：① `printDate` / `printTime` 在数据绑定时并入上下文（业务数据同名时优先）；② 引用 `pageIndex` / `totalPages` 的表达式在绑定阶段保留原始表达式（测量趟按原始文本测量），最终渲染时按所在页页码重新求值——元素、页眉/页脚、首页叠加与表格单元格四者一致，三端（浏览器预览 / 服务端 PDF / 桌面客户端）同源。**存量模板产物不变**：无 rawFormatter 的模板走快速路径，不做任何重算。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：**多级表头分页续片会丢掉下面几级表头**。多级表头的各行由 `rowspan` / `colspan` 连成一个结构整体，而「每页重复」此前按行独立判定——只勾选首行时，续片只重复首行，第二级及以后的表头整段丢失，首行的跨行主格还会越界吃掉数据行的位置。现改为：① 表头区（第 0 行起的连续标题行）内任一行勾选即**整个表头区**重复；② 重复行数按 `rowspan` 完整性对齐到最近的闭合边界，跨出表头区的主格在续片渲染时裁剪到边界内，不再越界吞格；③ 插入标题行、把行改为标题行时自动继承相邻标题行的重复设置，避免漏勾；④ 属性面板开关更名为「表头每页重复」，作用于整个表头区。单行表头行为不变，存量单行表头模板产物逐字一致。

## V1.3.0(2026-09-20)

- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：新增**多页面模板**——一份文书由多篇**版式不同**的页面按固定顺序组成，全部绑定**同一份数据**（如「封面 + 正文 + 条款」）。此前一份模板只能描述单页版式，多页只能来自内容溢出切片或同模板多份拼接，无法在同一份文档里组合不同版式。
  ① 数据模型：新增 wrapper 类型 `MultiPageTemplateData`（`{ version?: 1, pages: TemplateData[] }`），`RenderRequest.templateJson` 与 `PrintJob.templateJson` 放宽为 `TemplateData | MultiPageTemplateData`；`TemplateData` 新增可选 `name`（页面名，页签显示与错误上下文用，渲染端忽略）。
  ② 新增 `print/multi-template.ts`（主出口导出）：`normalizeTemplate`（归一化 + 统一校验）、`isMultiPageTemplate`、`mergeFontDeclarations`（各页声明的字体按族名去重合并）、`composeMultiPageDocument`（多页面拼接为单文档）。
  ③ 渲染语义：每个页面模板**各自独立跑一遍完整的「绑定 → 测量 → 分页」**，共用同一份数据；「下一模板必须新开一页」由各自产出的整页 `.print-page` 天然保证，无需额外分页指令；页码 `{pageIndex}` / `{totalPages}` 在**份内全局连续**（按前序模板页数累计 `pageOffset`）；`firstPageOverlay` 的生效条件由「文档第 1 页」改为「**各模板自身的首页**」（单模板时两者等价，行为不变）；`pageCount` 为份内全部模板页数之和，整份文档**一次出图**（单次 `page.pdf()`）。
  ④ CSS 随之作用域化拆分为 `buildBasePageCss()`（模板无关部分）+ `buildPageGeometryCss(template, '.mt-N')`（各页几何）；**单模板产物与旧版逐字一致**，由护栏测试锁死，存量模板零迁移。
  ⑤ 三条硬校验由 `normalizeTemplate` 统一抛出，设计器保存/预览、render 服务共用：至少 1 页；各页纸张尺寸（含方向）必须一致；**不支持连续纸与标签拼版**（二者与「必须新开一页」语义冲突）。错误信息带页面名，如 `多页面模板不支持标签拼版（第 2 页「条款」）`。
- `@worm-vue3-print/canvas`：多页面设计能力。新增**页面栏**（`PageTabs`），支持新增、复制、删除、前移/后移、**双击重命名**、点击切换，操作按钮带上下文悬浮提示；删到只剩一页时自动回落单模板模式。纸张设置（纸型/方向/自定义尺寸）绑定当前页但**改一次即写入所有页**（多页面要求纸张一致，UI 只暴露一份纸张设置），页边距、页眉页脚、首页叠加、水印与内容元素则按页各自独立；多页模式下隐藏拼版配置、禁用连续纸纸型（与渲染端校验互为双保险）；`getTemplateJson()` 单页输出裸 `TemplateData`、≥2 页输出 wrapper，`initialTemplate` prop 放宽为联合类型并在载入时归一化；保存/预览前用 core 的 `normalizeTemplate` 同款校验，错误在 UI 内直接提示。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：新增**页面内容旋转角度**（`TemplateData.outputRotation`，取值 `0 / 90 / 180 / 270`，属性面板「内容旋转角度」，缺省 `0`）——解决「横版设计、竖版出纸」：90/270 时出纸纸张宽高互换（`PreparedDocument.paperMm` 随之改变），页面内容整体旋转填满出纸版面，**不缩放、不裁切**；0/180 纸张不变。最终渲染层按角度追加 rotor 类包裹页面（测量趟不包裹，避免两次结果不一致）。单页与预览/服务端/客户端三端同源。
- `@worm-vue3-print/core`：打印管线支持**批量打印**——`printData` 传对象数组即按数组长度拼出同一个文档的多份副本（此前只能宿主页自己做 HTML 拼接）：同模板多份共用一次渲染管线，份间强制分页（`.print-copy` + 份间分页 CSS；连续纸走命名页，各份高度可不同）；`PreparedDocument` 新增 `copies` 与批量时每份的物理纸张尺寸 `copyPaperMm`。新增纯字符串合并器 `composeBatchHtml`（单份产物类型 `BatchCopyInput`）与 `normalizePrintData` / `MAX_BATCH_COPIES`（**上限 500 份**，空数组或含非对象项直接报错并给出 1 基项序号）。`@worm-vue3-print/render` 的 PDF 接口与桌面客户端 `print` 协议同步接受数组并按同一上限校验（截图接口同样接受数组，但按既有语义**只渲染首条**），浏览器预览回传渲染份数。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：新增**设计背景（定位底图）**——`TemplateData.designBackground`（`src` + `rotation`，90° 步进），页面属性支持上传、旋转、移除；**只在设计画布显示**用于套打对位，预览、服务端 PDF 与静默打印一律忽略（不产出）。宿主通过 `uploadDesignBackground` 适配器提供上传实现（须返回完整可访问图片路径，不参与 `baseUrl` 拼接），也可由深层注入键 `UPLOAD_DESIGN_BACKGROUND_KEY` 提供。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：纸张尺寸切到**标签纸**（80×60 / 60×40 / 40×30mm）时，默认套用「整张纸都给内容区」的版面——四边页边距归零、页眉页脚高度归零（页眉页脚里已有的元素保留，把高度改回即可恢复）。该默认值**只在切换纸型时套用一次**，之后用户仍可在「页边距」「三区高度」里自行改回；存量标签纸模板打开时不会被改写。core 新增 `isLabelPaperSize` / `labelPaperDefaults` 两个纯函数，宿主与自建设计器可复用同一口径。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：**行为变更** 条形码（**元素**与**表格单元格**）不再拉伸填满可用框，改为同一套「条宽 → 打印机 dpi → 等比缩小」结算（`render/barcode-dot.ts` 的 `resolveBarcodeSize`）：
  ① **首选尺寸来自条宽**：每模块 `barWidth/2 × 0.25mm`，可用框装得下就按原样落纸、不再放大——放大到填满必然得到非整数条宽，正是出纸「忽宽忽窄」的根因；
  ② **设置了打印机分辨率时 dpi 优先适配**：首选尺寸吸附到「每模块整数个打印点」（DPI 优先于条宽的精确毫米值，如 0.25mm 在 300dpi 下取 3 点 ≈ 0.254mm），宽度足够即按此落纸；
  ③ **可用宽度不足时等比缩小**：有点阵时按整数点逐级缩小以保住点对齐，连 1 点/模块都放不下才退回连续等比缩放（此时已无法对齐，但不会溢出可用框）；宽高始终同比缩放，条码不会被拉变形。
  三端（设计器画布 / 浏览器出图 / 服务端渲染）的元素与单元格共用同一份常量与算法；尺寸统一由该
  结算函数给出后，条形码出图改为**恒内联 `<svg>`**（`<img>` 承载 SVG 时 Chromium 会把内在尺寸取整到 CSS px，结算出的 mm 会被改写），`maxWidth`/`maxHeight` 并入可用框参与结算；
  拉伸会把条宽变成非整数，故**条形码不再提供「缩放模式」**（条宽与 dpi 决定尺寸，需要上限用「最大宽高」），属性面板同步调整。**同一份旧模板的条码会变小**（缺省 barWidth=2 时约为元素框的一半），这是有意为之——放大条宽即可加大条码，换来的是出纸条宽稳定。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：文本元素与表格单元格支持**三种文字溢出显示形式**（属性面板「文字溢出」，模板字段 `textFit`）：
  `clip` 截断（不换行 `wordWrap:false` 时以省略号收尾）、`shrink` 自动缩小（下限 `shrinkMinFontSize`，缺省 6pt，缩到下限仍放不下则退化为截断）、
  `autoHeight` 自适应行高（元素高度/行高随内容增高）。**缺省值与既有行为一致，存量模板不受影响**（`text` 缺省截断、`longText` 与单元格缺省自适应行高）；
  自动缩小在测量趟用真实排版引擎二分求解并通过 `applyTextFit` 回写模板（会话原语 `measure` 返回值由 `RawMeasurement[]` 变为 `{ measurements, fits }`），
  三端字号一致；设计器画布复用同一份算法与可用高度换算（`fitTextNode`），设计态字号即出纸字号。DOM 执行器产物版本升到 `2`（新增 `applyTextFit`）。
- `@worm-vue3-print/core`：新增打印管线模块（driver 契约 + 共享 DOM 宿主 runtime + 三端 driver），
  浏览器、服务端、桌面客户端统一使用同一份测量、分页、连续纸推导、码制渲染与出图规格；
  新增 IIFE 执行器产物与 `@worm-vue3-print/core/node` 出口（`loadExecutorBundle`）。
- `@worm-vue3-print/render`：**行为变更** ① 连续纸模板按内容推导纸高（此前固定 `80×297mm`）；
  ② 条码/二维码渲染基线由 `bwip-js` 切换为 `jsbarcode`/`qrcode`（与浏览器预览一致）；
  ③ 就绪等待由 `networkidle` 改为 `domcontentloaded` + 5s 就绪等待；服务端不再依赖 `bwip-js`。
- `print-client`：**行为变更** 测量就绪等待由 3s 调整为 5s；渲染 worker 与 IPC 桥删除，
  改由主进程装配 core 管线与 Electron driver（`print.submit` / `print.submitHtml` 协议与出纸行为不变）。
- 已知缺口（本次未实现）：协议接受 `color` 与 `pageRanges`，但 PDF→系统打印链路从未应用这两个参数。
- `@worm-vue3-print/core`：**行为变更** 表格单元格此前已存有 `fontFamily` 的模板，渲染时该字段被静默丢弃（`data-binder` 的字段映射表未收录）；本次修复后单元格字体会真正生效，**同一份旧模板的呈现会发生变化**。同时修复 `font-family` 输出未加引号、未带兜底栈的问题（含空格的族名如 `Microsoft YaHei` 此前不生效）。
- `@worm-vue3-print/canvas` / `@worm-vue3-print/core`：新增 `PrintDesigner` 的 `fonts` prop（`PrintFontDeclaration[]`）——**模板级字体声明**，宿主配置后设计器注入 `@font-face`、在字体下拉中列出，保存/预览/截图时同步写入模板 JSON 的 `fonts` 字段，服务端与桌面客户端据此出图，三端不再依赖各自系统里装了什么字体。字体的 `url` 以 `/` 开头时按渲染端 `baseUrl` 解析（复用图片相对路径那套规则），绝对 URL 原样使用。
- `@worm-vue3-print/core`：渲染出的 HTML 会带上模板声明字体的 `@font-face`（`font-display: block`），且第一遍测量与最终出图都注入；DOM 执行器在就绪等待时**显式加载**文档里声明的字体，避免只等 `fonts.ready` 提前 resolve、按兜底字体度量导致分页与出图错版。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：字体声明新增可选 `label`（业务名，如「马善政毛笔楷书」），字体输入框与下拉优先展示 label 并在括号里附上真实族名（如「马善政毛笔楷书（Ma Shan Zheng）」），搜索同时匹配 label 与族名；**写入模板与 `@font-face` 的始终是 `family`**，输入 label 回车会映射回族名，避免把展示名写进模板导致字体静默失效。
- 字体基址与图片基址解耦（**修复自定义字体只在设计稿生效**）：模板声明字体的相对 URL 此前被拼到图片 `baseUrl` 上（如业务 OSS 域名），出图端因此 404、静默回退系统字体。现改为 `bindData(template, data, baseUrl, fontBaseUrl)`——`fontBaseUrl` 独立指定，缺省回落 `baseUrl`，传空串表示不拼接（浏览器端按文档 origin 解析，缺省行为）；`PrintJob`、render 服务的请求体与 `FONT_BASE_URL` 环境变量、SDK `print(..., { fontBaseUrl })`、客户端校验与渲染、`PrintHtmlPreview` 均支持。另外 **字体站点/CDN 必须返回 `Access-Control-Allow-Origin`**：出图端加载模板 HTML 时的 origin 为 `null`/应用协议，缺 CORS 头字体同样会被拦下。
- `@worm-vue3-print/canvas`：文本元素与表格单元格属性面板的「字体」下拉只列出模板声明字体（展示 label，模板当前值不在声明内时保留并标注「（未知）」）；声明之外的字体名仍可直接输入，不做静默清除。
- `@worm-vue3-print/core`：分页引擎支持**元素堆叠与显式编组同页**。此前内容区每个非表格元素各自扣减一次实测高度，纵向重叠的元素会被重复计高（触发本不需要的换页），且放不下时单个元素被独自推到下一页，导致设计器里的层叠组合在打印时被静默拆散。现改为：① 纵向区间相交的元素按并查集聚为「堆叠单元」，纵向只按并集占用一次版面、放不下时整组一起换页（上下边相切不算重叠，顺序流式排版结果不变）；② `options.groupId` 相同的显式编组成员强绑定同页，不参与表格跟随区归属，组内含 `pageable:false` 成员时整组锁定首页；③ 换页后整组平移到内容区顶部，组内相对偏移保持设计值；④ 内容区层序排序由仅按 `top` 改为 `top → zIndex → 模板数组序`，无 zIndex 时与设计器 DOM 层序确定一致。
- `@worm-vue3-print/canvas`：单击已编组元素的任一成员即选中整组（此前只选中单个成员），整组拖拽移动、Ctrl+G 编组、Ctrl+Shift+G 取消编组、右键菜单与图层层级保持一致；Ctrl/⌘ 多选仍按单元素切换。
- **破坏性变更：移除字体查询功能（含服务端与桌面客户端）** 不再获取两端系统字体清单——删除 `PrintDesigner` 的 `serverFonts` / `clientFonts` / `loadFonts` props 与「查询字体」按钮、离线与缺失字体提示；删除 `@worm-vue3-print/render` 的 `GET /fonts` 与 `X-Font-Warnings` 响应头、`@worm-vue3-print/client` 的 `fonts.list` 协议与 `PrintClient.listFonts()`、桌面客户端 `print.submit` 的缺字 `warn` 日志，以及 core 的 `readSystemFonts` / `mergeFontSources` / `findMissingFonts` 等清单合并与缺失校验能力。字体可用性完全由模板 `fonts` 声明与 `@font-face` 决定。

### 新增

- `@worm-vue3-print/core`：新增**条形码打印点对齐**（新模块 `render/barcode-dot.ts`）——把条码最终尺寸吸附到打印机点阵网格，修复热敏打印机出纸「条宽忽宽忽窄、边缘发灰」。根因（实测）：元素框 56.4×14.1mm、CODE128 编 8 位数字时单模块 0.318mm，在 203dpi（8 点/mm）下等于 **2.55 个打印点**；PDF 里条码是纯矢量且几何精确，但打印机/RIP 只能按整点成像，非整数条宽被各自取整成 2 点或 3 点。工具类软件之所以清楚，是因为它把窄条宽度定为整数打印点（如 3 点 = 0.375mm）。条形码元素新增 `printerDpi`（`options.printerDpi`，常见 203/300/600）；**表格单元格条形码同样支持**（`TableCell.printerDpi`，可用框 = 单元格内容区：所跨列宽/行高扣除内边距与塌陷边框，由新增的 `cellFitWidthMm` 与既有 `cellFitCapMm` 同一口径求出；表格未配置 `tableColWidths` 时宽度未知，不启用点对齐）——两者都在面板提供「打印机分辨率」下拉，且点对齐时隐藏缩放模式与最大宽高（叠加会把对齐结果重新缩成非整数点）；单元格类型切离条形码时清除该字段。同时修复另外两处清晰的元凶：① 条形码 SVG 补 `shape-rendering="crispEdges"`（二维码一直是这么设的；实测条边缘灰像素占墨迹 11.3% → 1.7%）；② 恢复**左右静区**（jsbarcode 缺省 10 模块，此前出图端写死 `margin:0`，EAN13/UPC/ITF14 会直接扫不出），且静区只留左右以免上下留白白白吃掉元素高度。设计器画布 `BarcodeElement` 与出图端共用同一份常量与算法（jsbarcode 参数统一以「模块」为单位表达），修掉此前设计态与出纸两套图形、`fontSize` 被当成 pt 的问题。**未设置 `printerDpi` 时几何与既有行为一致**（仅静区与去抗锯齿生效）。
- `@worm-vue3-print/canvas` / `@worm-vue3-print/core`：条形码/二维码**元素**补齐与表格单元格同口径的配置能力——属性台新增「条码设置」分组（此前该分组组件存在但未挂载，码制/条宽/显示文本/字号/纠错级别在界面上无处可改）：条形码可选码制（CODE128 / EAN13 / EAN8 / UPC / CODE39 / ITF14，存量大写归一化，选缺省码制时清字段）、条宽（倍率 2~4，启用打印机分辨率后隐藏并改为自动对齐）、显示文本（`hideTitle`）、文本字号（相对条高）；二维码可选纠错级别；「自定义设置」段与单元格一致：缩放模式（`fit`）、最大宽度/最大高度（mm，`ElementOptions` 新增 `maxWidth`/`maxHeight`）。新增字段经 `codeImgHtml` 透传到出图 `<img>` 的 `object-fit`/`max-width`/`max-height`，画布侧同步生效（内联 `<svg>` 用 `preserveAspectRatio` 等价映射，`fit='none'` 退化为 meet）。**未设置新字段时产物零变化。**另修复：单元格条形码在设计态默认不显示码值下方文本——`showText` 是布尔 prop，缺省会被 Vue 转成 `false`，而出图端 `showBarcodeText` 缺省为显示，两者不一致；现由 `TableElement` 显式传 `cell.showBarcodeText !== false`，画布侧 jsbarcode 参数（条高 30 / 字号 10 / 左右静区 10 模块 / 关抗锯齿）也与出图端同源。
- 打印客户端：新增「保留生成的 PDF」排查开关（配置窗口勾选，`config.json` 的 `keepGeneratedPdf` / `pdfOutputDir`，留空默认 `userData/pdf`）——保留每次打印生成的 PDF，任务记录显示其绝对路径并提供「打开目录」，用于判断问题出在 PDF 生成还是打印机/驱动。
- `@worm-vue3-print/client`：新增浏览器预渲染直提交通道——协议消息 `print.submitHtml` 与 SDK 方法 `PrintClient.printHtml(rendered, options, templateName)`。宿主页用 `@worm-vue3-print/core/browser` 的 `renderHtmlPages` 在浏览器内完成两遍渲染，把最终 HTML（含纸张/方向/边距/连续纸高度）直送客户端静默出纸，客户端不再执行模板渲染；旧 `print`（客户端内渲染）链路保留兼容。
- 打印客户端：`print.submitHtml` 入站校验（HTML 非空、≤20MB、`paperMm` 毫米正数、`continuous`/`pageCount` 类型），纸张/方向/边距覆盖项一律以 `INVALID_REQUEST` 拒绝；打印引擎重构为「准备（渲染或直取 HTML）→ 出纸」双路共用流程。
- demo：「客户端静默打印」改为浏览器侧渲染后经 `printHtml` 提交（新增 `src/browser-render.ts` 封装）。
- 新增仓库内技能 `skills/print-template-json`：**用简写 JSON 生成打印模板**。SKILL.md 定义工作流，`scripts/build_template.py` 把简写（box / size / align / code / cols / rows …）展开为完整 `TemplateData`（自动补骨架、元素 id、`printElementType`、表格合并占位格），`scripts/validate_template.py` 按管线硬规则出纸前校验（越界、2mm 安全余量、列宽行高和、每行列数、拼版列数上限、连续纸禁拼版、表达式花括号配对与函数白名单），`assets/templates/` 附 7 份成品模板与数据。
- demo：新增**示例模板库**（`src/samples/`）——7 份静态数据示例（采购收货单、称签、价签、快递面单、零售小票、资产标签、销售出库单），「加载示例」改为分组选择弹窗，卡片缩略图按元素坐标等比绘制；选中即载入模板、字段树与打印数据，批量数据按示例自带或安全派生。
- `@worm-vue3-print/canvas`：设计器多页面 API——`useDesignerState` 与 `PrintDesigner` 实例暴露 `pages` / `activePageIndex` / `switchPage` / `addPage` / `duplicatePage` / `deletePage` / `renamePage` / `movePage`；撤销历史与选区管理由单页扩展为按页收敛（页操作即清空当前页选区）。

- `@worm-vue3-print/core`：新增同构水印模块（`render/watermark.ts`）——`generateHtml` 在每页最底层输出 `.watermark-layer`（**显式矢量瓦片**，逐块 `<svg class="watermark-tile">`），设计模板、浏览器预览、服务端 PDF、静默打印四端水印渲染完全一致。
- `@worm-vue3-print/core`：`WatermarkOptions` 新增 `tileWidth`/`tileHeight`（瓦片尺寸，控制水印密度，默认 260×180）；导出 `WATERMARK_DEFAULTS`、`WATERMARK_DENSITY_PRESETS`、`PX_PER_MM`、`MM_PER_PX`、`isWatermarkVisible`、`resolveWatermarkText`、`formatTimestamp`、`resolveWatermarkLayout`、`renderWatermarkTileSvg`、`renderWatermarkLayerHtml`。
- `@worm-vue3-print/core`：水印表达式支持系统变量 `{printDate}`（打印日期 YYYY-MM-DD）、`{printTime}`（打印时间 HH:mm:ss）、`{pageIndex}`（当前页码）、`{totalPages}`（总页数），与表达式弹框「变量」一致；`injectSystemVariables` 同步支持 `{printTime}` 替换，并导出 `resolveSystemVariables` 供设计器预览复用（预览与打印取值同源）。
- `@worm-vue3-print/canvas`：水印配置面板合并为单一「水印表达式」输入——**纯文本即静态水印（`mode=fixed`）**，含 `{字段}`、函数调用（`CONCAT(...)`）或字段路径（`order.no`）则按表达式解析（`mode=binding`），无需再手选模式；表达式通过表达式弹框（按钮或双击输入框打开）编辑，弹框内可直接选业务字段与打印日期/时间等变量；移除预设绑定字段下拉与时间戳开关（时间戳改由表达式里的 `{printDate}`/`{printTime}` 表达）；测试值仅在表达式模式下展示；保留密度（密/中/疏/自定义瓦片尺寸）等设置。
- `@worm-vue3-print/canvas`：`WatermarkConfig`、`CanvasPaper` 水印渲染改用 core 同构模块，三端渲染一致。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：新增**标签拼版**（模板 `tiling` 配置）——小尺寸标签模板不再「一张纸打一个标签」：开启后按「列 × 行」把多份标签铺进目标纸（默认 A4 纵向、四边留白 10mm、格间距 2mm、列数手工指定、行数按纸面自动推导），单份数据同样走拼版（1 格 1 张）。core 新增 `print/tiling.ts`（`computeTileLayout`：纸面/列数/标签高度校验与行列推导，连续纸不支持拼版）与 `print/tile-compose.ts`（按格铺排合成 HTML）；拼版下 `renderPdf` 的 `pageCount` 改为**实际输出张数**（预览「共 N 页」与客户端任务历史同口径），`paperMm` 为目标纸尺寸。canvas 新增拼版配置面板（开关、目标纸与方向、自定义尺寸、四边留白、横纵间距、列数），实时显示行列数与可容纳格数；任一份标签底部超出其内容区时拼版直接报错，不静默裁切。`@worm-vue3-print/render` 新增拼版端到端集成测试（真实 Chromium 校验张数与格坐标）。
- `@worm-vue3-print/core` / `@worm-vue3-print/canvas`：纸张预设新增**针式打印纸**（`DOT_FULL` 全等分 241×279.4mm、`DOT_HALF` 二等分 241×139.7mm、`DOT_THIRD` 三等分 241×93.1mm）、**标签纸**（`LABEL_80X60` / `LABEL_60X40` / `LABEL_40X30`）、**小票纸**（`THERMAL_57` / `THERMAL_80` / `THERMAL_110`，连续纸：纸宽取预设值、可用 `customWidth` 覆盖如 58mm，出纸高度仍按内容推导、方向强制纵向）。`PaperSize` 与 `PAPER_DIMENSIONS`/`PAPER_PRESETS` 同步扩展，`isContinuousPaperSize(paperSize)` 判定连续纸（小票纸与 `CONTINUOUS` 均为真），拼版目标纸下拉仍排除连续纸；设计器「纸张尺寸」下拉按「常用纸张 / 针式打印纸 / 标签纸 / 小票纸 / 连续纸」分组显示中文名与尺寸。

### 修复

- `@worm-vue3-print/core`：修复水印经**真实打印机出纸**后被放大约 3 倍、位置偏移、平铺错乱的问题。根因是水印原先用 CSS 平铺背景（`background-image` + `background-repeat`）实现，Chromium 会把它编译成 PDF 平铺图案（tiling pattern），PDF 查看器正常但出纸链路的 RIP 忽略图案矩阵（其所在 form 的 CTM 为 3.125 = 300dpi÷96px，实测放大倍数吻合）。现改为显式矢量瓦片：`resolveWatermarkLayout` 按纸张尺寸（含连续纸探针推导的最终纸高）计算瓦片网格，逐块输出内联 `<svg>`，出纸几何回到设计值（A4 默认密度 68.8mm × 47.6mm）。删除 `buildWatermarkSvgDataUrl`，杜绝回归到平铺背景方案。
- 打印客户端：修复**出纸方向与浏览器/服务端预览不一致**（横向页面被打成纵向）。根因是出纸命令未声明纸张，CUPS 按队列默认纸张（多为纵向 A4）处理，`pdftopdf` 把横向页旋转 90°（产物 PDF 带 `/Rotate 90`）。现在按「宿主指定驱动纸型 → 标准纸型匹配 → `Custom.<宽>x<高>`（点）」显式下发 `-o media=…`，实测同一份横向 A4 页面由 `/Rotate 90` 恢复为 `/Rotate 0`，纵向页面不受影响。
- 打印客户端：修复静默打印「PDF 生成超时 → 后续任务全部 BUSY」——`webContents.printToPDF` 已移除回调重载（回调永不触发、Promise 拒绝被静默吞掉），且 `PrintToPDFOptions.pageSize` 单位是**英寸**而非微米（误传微米会得到 210000×297000 英寸纸张，Electron 44 直接生成失败）。改用 Promise + 超时兜底（`src/main/pdf-generator.ts`）、纸张微米→英寸换算、显式零边距与 `printBackground: true`；生成失败/超时统一以 `PRINT_FAILED` 返回并释放串行锁，客户端静默打印产物与服务端 PDF 的水印、纸张尺寸一致。
- 打印客户端：出纸链路文档同步为「HTML → printToPDF → 系统打印命令」（`clients/print-client/README.md`、`docs/中文/指南/静默打印.md`、静默打印技能参考）。
- `@worm-vue3-print/core`：修复小纸张模板输出**空白第一页**（如 80×60mm 自定义纸、边距 10mm、内容高 38mm）。两处根因：① 分页引擎 `finishPage()` 无条件把当前页入列，首个元素/单元判定放不下时会产出一张空纸、内容整体下移一页；现在空页不入列，内容按设计坐标留在本页；同时在 `PageLayout.overflow` 标记「内容底部超出内容区会被纸面裁掉」（按物理边界判定，不看分页预算里的 2mm 安全余量——贴着纸边排仍是合法排版），拼版「每份恰好 1 页」校验据此继续阻断真正超高的内容。② DOM 执行器测量元素高度用 `offsetHeight`（整数 px，向上取整），38mm 被读成 144px = 38.1mm，恰好越过 40mm 内容区扣除 2mm 安全余量后的 38mm 预算，把「放得下」误判为「放不下」；现改用 `getBoundingClientRect().height` 取亚像素真实高度（表格行高同理）。
- `@worm-vue3-print/canvas`：修复多页面模板**页面重排后页签名漂移、新增页重名**——首页（默认模板创建或宿主载入）没有存储 `name`，页签只能按位置回退显示「页面 N」，页面前移/后移后索引变化导致名字整体漂移，与已固化的页名冲突；现在初始化时给无名页补存固定默认名，`addPage` 改取第一个未占用的名字（删页后再新增也不会重名）。
- `@worm-vue3-print/core`：修复多页面模板**批量打印时份间分页失效**——批量拼接时每份虽已包 `.print-copy`，但 CSS 拼接漏了份间强制分页规则，每份最后一个 `.print-page` 命中 `:last-child`（`break-after: auto`），两份会连着排；现复用 `COPY_BREAK_CSS` 并在批量时追加（已导出该常量），render 集成用例验证「2 份 × 3 页 = 6 页」。
- `@worm-vue3-print/core`：浏览器适配器 `renderHtmlPages`（`@worm-vue3-print/core/browser`）入参类型放宽为 `TemplateData | MultiPageTemplateData`，浏览器侧可直接提交多页面模板。

### 变更

- 渲染微服务 `worm-vue3-print-render` 并入本 monorepo，落地为私有服务包 `services/print-render`（包名 `@worm-vue3-print/render` 保持不变，不发布 npm）；通过 npm workspace 本地软链依赖 `@worm-vue3-print/core`，不再从 npm registry 安装 core。
- 根工作区新增 `services/*` 分层；`npm run build` 同时构建 render，根 `npm test` 仍只覆盖 core/canvas，render 的浏览器集成测试由 CI 独立 job 执行。
- 新增根 `.npmrc`：Playwright 浏览器不随依赖安装自动下载，本地/CI 按需执行 `npx playwright install chromium`，Docker 镜像使用基础镜像内置 Chromium；Docker 构建上下文改为仓库根（`docker build -f services/print-render/Dockerfile .`）。
- demo（`demo/`）新增服务端 PDF 打印：顶栏显示渲染服务在线状态，「服务端 PDF」按钮经 Vite dev 代理（`/render-api/*`，代理层注入 `X-Render-Key`）调用 render 微服务，取当前画布 JSON + 示例数据两遍渲染出 PDF 并新标签页打开。
- `@worm-vue3-print/canvas`：**破坏性变更** 删除设计器内置的「加载默认布局」按钮与 `load-default-template` prop——模板加载/重置属于宿主业务。宿主在自有页面区域渲染入口，把新的 `TemplateData` 赋给 `initial-template` 即可重载画布（设计器按引用变化监听并记录一次历史，撤销可回退）。原注入 `load-default-template` 的宿主该 prop 会被忽略，需改为上述写法。
- demo：适配多页面模板——载入/导入/保存接受并处理 `MultiPageTemplateData`（存什么返回什么），预览与批量数据源按整份多页文档渲染。
- `@worm-vue3-print/render`：多页面模板端到端集成测试（真实 Chromium 校验 PDF 页数、各页纸张一致、「下一模板新开一页」的页边界），请求类型放宽为联合类型后逻辑全部落在 core 校验。

### 已知限制

- 多页面模板出纸时「内容旋转角度」取**首页**的 `outputRotation`（各页纸张尺寸已强制一致，但角度尚未纳入一致性校验）；每页独立旋转角度留作后续扩展。
- 多页面模板不支持连续纸与标签拼版，也不支持数据驱动的条件包含页（如金额超阈值才追加条款页）。

## V1.2.2(2026-09-11)

### 变更

- `@worm-vue3-print/core`：新增子路径导出 `@worm-vue3-print/core/designer`——框架无关的设计器内核，包含完整模板模型类型、通用工具（元素工厂、表格矩阵、单位换算、模板迁移、标尺等）与纯交互逻辑（对齐、分组、键盘、缩放、吸附计算），无 Vue/React 等框架依赖。
- `@worm-vue3-print/core`：新增子路径导出 `@worm-vue3-print/core/browser`——浏览器侧渲染适配器（`renderHtmlPages` 两遍分页渲染、`browserCodeRenderer` 条形码/二维码渲染）。
- `@worm-vue3-print/canvas`：设计器模型、工具与纯逻辑下沉至 core 子路径，canvas 仅保留 Vue 适配层；公共导出 API 保持不变，core 主入口仍保持零运行时依赖。

### 修复

- `@worm-vue3-print/canvas`：修复工具栏放大/缩小按钮直接线性修改缩放比例、未做滚动锚点校正导致画面漂移的问题；按钮缩放改为与 Ctrl+滚轮一致的乘性步进，并以视口中心为锚点（与「适应窗口」同一缩放管线）。

## V1.2.1(2026-09-11)

### 变更

- `@worm-vue3-print/canvas`：工具栏编辑区/层级区/视图区图标按钮统一使用 data-tip 自定义悬浮提示，补齐「网格」「吸附」缺失提示；提升提示层级，不再被画布顶部标尺遮挡。
- `@worm-vue3-print/canvas`：优化「适应窗口」——以视口中心为锚点一步缩放到位（与 Ctrl+滚轮同一缩放换算管线），缩放平滑过渡；允许低于交互缩放下限（最小可至 5%），超大纸张也能整版容纳，纸张在画布视口内水平垂直居中。
- `@worm-vue3-print/canvas`：新增 `showHelp` 配置——控制帮助入口（帮助按钮与帮助弹框）显示，默认开启，传入 `false` 即可隐藏。

### 修复

- `@worm-vue3-print/canvas`：修复工具栏悬浮提示气泡被画布顶部固定标尺遮挡无法显示的问题。
- `@worm-vue3-print/canvas`：修复「适应窗口」后超大纸张仍残留滚动条、纸张未在画布视口居中（垂直偏上）的问题。

### 文档

- 新增打印设计工作台布局线框图文档（`docs/中文/打印设计工作台-布局线框图.md`），标注各区域名称、功能与对应组件文件，便于后续布局调整。

## V1.2.0(2026-09-10)

### 新增

- `@worm-vue3-print/canvas`：新增帮助文档模态框（HelpModal），包含功能介绍、快捷键一览、常见问题等帮助内容。
- `@worm-vue3-print/canvas`：标尺参考线增强——支持拖拽添加参考线、双击编辑、删除，参考线对齐吸附实时显示。
- `@worm-vue3-print/canvas`：表格列宽拖拽新增末列右边界手柄，可直接拖拽调整末列宽并受 `maxTableWidth` 钳制。

### 变更

- `@worm-vue3-print/canvas`：优化缩放逻辑，取消放大上限，支持滚轮乘性步进缩放，修复缩放锚点漂移问题。
- `@worm-vue3-print/canvas`：移除设计态元素左上角的 fx 绑定标签提示，简化元素视觉呈现。

### 文档

- 仓库根目录新增 `AGENTS.md` AI 代理行为规范文件，明确代理在本仓库工作时的语言、专家态度、协作约定等强制要求。
- 新增 `worm-vue3-print` 集成支持 skill（`skills/worm-vue3-print-integration/`），包含安装指南、集成 API、故障排查等参考文档。

### 修复

- `@worm-vue3-print/canvas`：修复表格列宽拖拽存在的多个缺陷——内部列边界向左拖时左列宽度不变导致边界线不跟随光标、px→mm 单位换算缺失导致拖拽距离存在约 3.78 倍偏差、`table-layout:fixed` 下拖拽过程中表格 CSS `width(100%)` 与列宽和失配导致浏览器按比例拉伸列使边界线与右侧内容偏离光标；同时删除 `onColResizeStart` 中残留的 `document.title` 调试代码。

## V1.1.0(2026-09-06)

### 新增

- `@worm-vue3-print/canvas`：表格元素支持列宽拖拽——设计态选中表格后，在列边界悬停并拖动即可调整该列宽（左侧列），实时更新画布与元素尺寸；受打印范围宽度（`maxTableWidth`）与最小列宽（5mm）钳制，拖拽结束后计入一次撤销历史。属性面板的列宽数值输入保留作为精确输入兜底。
- `@worm-vue3-print/canvas`：表格单元格支持图片类型——单元格可切换为图片类型，设计态支持选择图片与设置 fit/maxWidth/maxHeight，预览与打印输出完整渲染。
- `@worm-vue3-print/canvas`：条形码与二维码单元格支持 fit/maxWidth/maxHeight 属性。
- `@worm-vue3-print/canvas`：属性面板位置尺寸改用 StepperInput 控件，支持按钮微调数值；StepperInput 支持可选值列表和小数步进。
- `@worm-vue3-print/canvas`：新增统一颜色选择器并重构属性面板字段分组。
- `@worm-vue3-print/canvas`：支持页面（纸张）背景色 `pageBackground`，预览与打印/PDF 输出一致。
- `@worm-vue3-print/canvas`：支持 canvas 库模式构建与 npm 发布。

### 修复

- `@worm-vue3-print/canvas`：打印/导出 PDF 保留元素背景色（`print-color-adjust: exact`）。
- `@worm-vue3-print/canvas`：打印预览保留元素重叠，表格下方跟随元素按设计坐标绝对定位并透传层级 z-index。
- `@worm-vue3-print/canvas`：打印页眉页脚区域贴页面底部，修复页边距失效。
- `@worm-vue3-print/canvas`：条形码渲染缺少 `object-fit: contain`。
- `@worm-vue3-print/canvas`：修复 canvas 测试在 vitest v4 + happy-dom 环境下 `localStorage` 未定义的问题，补充 mock 以兼容测试环境。

## V1.0.0(2026-09-02)

### 新增

- 首次开源发布。
- `@worm-vue3-print/core`：模板表达式引擎与同构渲染管线（HTML 生成/分页/数据绑定）。
- `@worm-vue3-print/canvas`：Vue 3 可视化打印模板设计器画布。
- 渲染微服务拆分为独立仓库 `worm-vue3-print-render`（仅 Docker 部署，不上 npm）。
