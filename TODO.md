# TODO — 待办与对账台账

> 取证基线：`master` @ `cd6e7c1`（tag `v1.3.10`）；包版本 core/canvas/print-client `1.3.10`、common `1.3.7-beta.0`。
> **本文件只挂未完成项。** 已完成条目压成文末「已完成归档」一行一条；原实施正文、批次记录、浏览器验证实测与探针坑明细
> 已从本文件移出，可在 `git show HEAD:TODO.md`（截至 `cd6e7c1` 的 775 行版）与中英 CHANGELOG 里取回。
>
> **2026-10-26 全量复验**（新鲜跑，非引用旧记录）：`npm run build` exit 0；`npm test` exit 0
> （core 77 文件/1118 例、canvas 72/679、common 26/315、print-client 14/110，合计 189 文件/2222 例零失败）；
> `npm run test -w @worm-vue3-print/render` exit 0（9/30，真实 Chromium）；`verify-demo.mjs` 四宿主 36/36 ×4；
> canvas `npx vue-tsc --noEmit` **exit 2 / 53 条**（T-22）。

## 标记口径

| 标记 | 含义 |
|---|---|
| 【成立】 | 断言与代码一致，已逐坐标或运行时确认 |
| 【口径修正】 | 现象成立，但原描述的性质/影响面需改 |
| 【已推翻】 | 断言不成立，**不要按原话实施** |
| 【新增】 | 核实时新发现，原台账/issue 未提及 |

---

## 一、待办清单

### T-07b `resolveToolbarOverflow` 的公共面定性　【口径修正】

- 原待办「发版前确认是否只作内部共用（则从导出面收回）」**已不可执行**：该函数现被 canvas `useToolbarOverflow.ts` 与
  demo-common 四宿主 `apps/*/src/topbar-overflow.js` 直接消费（vue2/vue3/react 引 `@worm-vue3-print/core/designer`，
  jQuery 从 `window.WormPrintCommon` 取），且 V1.3.10 已带此导出发布。
- 现状坐标：`packages/print-core/src/designer/index.ts:27` `export * from './utils/toolbar-overflow.js'`（同文件 `:34` 是 `preview-zoom.js`，同一形态）。
- 改判后二选一：① 按**公开契约**对待——在文档里登记其入参与链序属稳定面，破坏性变更走 minor 及以上；
  ② 坚持收回——则必须先给宿主等价入口，否则四个宿主 demo 直接断链。推荐 ①，收回省下的边际收益小于抽走已发布公共面的代价。

### T-11 #IKOUJI 剩余两条根因 C1 / C2　【成立】

- **C1 跟随区内 `vline` 丢高度（一行可修）**
  - 落点：`packages/print-core/src/render/html-generator.ts:882` → `needsHeight = type === 'rect' || type === 'oval' || type === 'image'`，**缺 `vline`**。
  - 2026-10-26 动态复现（直调 dist `generateHtml` + `flow-group` section）：跟随区内 vline 输出
    `left:2mm;top:5mm;width:1.8mm;…width:0;` **无 `height`**；同容器内 rect 对照拿到 `height:30mm` ⇒ 探针可信。
  - 机制：`case 'vline'`（`:466`）只出 `border-left` + `width:0`，长度全靠传入 style 的 `height`；跟随区不给就是 0 高、整条消失。
  - **别顺手把 `hline` 一起改**：`hline` 走 `height:0` 是有意为之（`:465`）。
  - 验收：加 `|| type === 'vline'` + 一条断言钉住「跟随区 vline 出 `height`、hline 仍不出」。
- **C2 跟随区无条件几何吸收**（需先定口径，代价中等）
  - 落点：`packages/print-core/src/render/pagination-engine.ts:52-72` `buildFollowMap` → 判据只有 `top >= currentTableBottom`
    （显式编组成员靠 `excludedIds` 豁免），**完全不看 X 轴**。
  - 2026-10-26 动态复现（直调 dist `paginate`）：表格占 x[25.83..175.83]，另放一个 x[200..215]、top 60 的
    **横向零交集**元素，结果 `followElementIds = ["far","over"]` —— 零交集元素照样被吸进跟随区。
  - 上一轮量化后果：加 3 条数据行后实测横线 y=103.1（设计 86.87，+16.2mm）并越过内容区底边 99.7。
  - 需要先拍板：跟随归属是否引入「与表格列横向相交」判据；若引入，与 C3 已落地的「同列扣高」记账（同文件 2D 占用那轮）
    都改 X 轴语义，**分开做会互相打脸。这条不要直接动代码。**

### T-14 ② #IKOYG0 重复评论待删　【成立】

- 2026-10-26 匿名复核评论时间线：`16:38` 与 `16:39` 两条几乎相同的「已定位并修复…」**仍在**（其余 17:35 是报告人表情、
  次日 11:24 是 1.3.8 通知）。issue 现 `closed`，删评论不必重开。
- 自己评论的删除菜单不进无障碍快照，只能网页端手工删一条。

### T-15 common 预览版发布面（dist-tag + 落后主线 40 个提交）　【成立】+【新增】

- **dist-tag 实况未变**：官方 registry `@worm-vue3-print/common` 的 `latest` 与 `next` **同指 `1.3.7-beta.0`**（首次发布 npm 自动打了 latest）。
  后果仍在：`npm i @worm-vue3-print/common`（不带 `@next`）装到的是预览版，与 `CONTRIBUTING.md`「方式三」的预览版定位冲突。
  `latest` 要收回需 registry 上先存在别的稳定版可指向（当前没有）→ 要么改文档强制宿主带 `@next`，要么改发布脚本。
  在此之前，「实验性、不建议用于生产」那句是最后防线，不能删。
- **【新增】预览版已落后主线 40 个提交**：仓库内该包版本仍是 `1.3.7-beta.0`，而自 10-19 那次发布起 `packages/print-common`
  已有 **40 笔提交**未随预览版发出（属性台 75 行「恢复默认值」、单元格台单选回显与边框三行回读、条码静区/字体候选按画布收口、
  缩放档位挂 `WormPrintCommon`、`flowList` 等），而主线 core/canvas 已发到 `1.3.10`。
  ⇒ **四个 common 宿主 demo 的观感 ≠ npm 上能装到的 common 的观感**。
- 待办：按既有口径走 `publish:common:beta` 本地手工发一版（`1.3.7-beta.N`、dist-tag `next`、不进 `latest`），顺手处置 dist-tag。

### T-16 demo-common 四宿主没接 `fonts`，字体链路在 Common 宿主上是暗的　【成立】

- 2026-10-26 复核：四入口 `grep -c fonts` **仍全为 0**（`apps/vue3/src/App.vue`、`apps/vue2/src/App.vue`、`apps/react/src/App.jsx`、`apps/jquery/src/app.js`）。
- 2026-10-26 浏览器动态取证（Playwright + 系统 Chrome，载入示例「综合示例模板」——该示例声明 3 个字体）：
  - 9331（vue3 Common 宿主）：宿主传入 `fonts=null`、`document` 与 shadow 的 `@font-face` **均 0 条**、`document.fonts.size = 0`。
  - **正对照** 9303（canvas 主 demo，同一探针同一示例）：`@font-face` **3 条**、`document.fonts.size = 3`
    ⇒ 缺口确在宿主侧，不是探针假象。
- 外壳契约本身正常：`print-common/src/shell/controls.ts` 收 `fonts`，`property-panel.ts` 透传给 core `normalizeFontCatalog`。
- 待办三条：① 四宿主各补一份与主 demo 同算法的 `activeFonts`（参照 `demo/src/App.vue:78` + `:243`，直挂宿主就地实现）；
  ② `verify-demo.mjs` 补字体断言（应用该示例后 `document.fonts` 应出 3 条 face、下拉行数 = 1 默认 + 3）；
  ③ 核对 PARITY §宿主契约是否已把 `fonts` 标成「demo 未演示」。

### T-19b 残余：`verify-demo` 缺「预览缩放档位」与「字体链路」两条断言　【口径修正】

- **更正原话**：T-19b 写的是「verify-demo 的 36 项不含**顶栏收纳**与预览缩放档位断言」——前半句不属实。
  顶栏收纳两条早已随 T-10 入库：`demo-common/scripts/verify-demo.mjs:118`「顶栏接入自适应收纳（T-10）」、
  `:119`「收纳数与「更多」组显隐一致」。2026-10-26 实测该脚本仍是 **36 项、四宿主 36/36**。
- 真实缺口只剩两条：**预览缩放档位**与**字体链路**（后者即 T-16 的 ②，两条一并做成第 37-38 项）。
- 功能本身是好的，本轮已动态验证：9331 与 9334（jQuery 直挂形态）预览都量到五档齐、默认 active「点阵 203dpi」、
  iframe `computed zoom = 2.11458`、`@media print` 复位守卫在位、说明文案在位。缺的只是把一次性探针固化进脚本。

### T-22 canvas 测试文件类型错误　【成立】+ 数字更正

- **49 → 53**（2026-10-26 于包目录内跑 `npx vue-tsc --noEmit`，exit 2）。全部落在 `src/__tests__/*.spec.ts`，
  `src/components/**` 与 `src/composables/**` **零错**（该结论复核未变）。
- 分布（条数）：`TableElement` 16、`PageTabs` 11、`FormatToolbar` 5、`useFormatToolbar` 4、`TableCellGroup` 3，其余散在 14 个 spec；
  **较上轮涨的 4 条落在近期改动过的 spec**（工具栏回读、恢复默认值、排版一组）。
- 主要形态：`element.options.tableColWidths` 可能 undefined、`findAll(...)` 回调隐式 any、`VueNode<Element>` 上取 `.value` 未转
  `HTMLInputElement`、字段夹具缺 `PrintBusinessField` 必填项。
- 长期项：把 `vue-tsc`/`typecheck` 串进 `npm test` 或 CI 门禁——canvas 的 `test` 只跑 vitest、`build` 走 `tsconfig.build.json`
  排除测试，所以这类红长期不可见。按 spec 分文件推进，别批量改（容易把断言语义一起改掉）。

### T-23 【已验证，2026-10-26】#IKPXQL 的跟随区：主路径已解决，需求2 只解决了一半

- 复现方式：把报告人三件诉求做成一份可控模板（表格绑 6 条明细 + **汇总行**放「温馨提示」四行正文 + 表格下方放四类元素），
  走**真实两趟管线**（Chromium 测量 → 分页 → 最终 HTML），再把最终 HTML 落页量纸面相对坐标与行盒（Range 按 `top` 聚类，不用高度÷line-height）。
  验证件按 `services/print-render/spike/` 约定跑完即删，render 套件已回到 9/30 全绿。
- 实测（mm，纸面相对坐标；表格设计底 34、实际底 **112.53**）：

| 诉求 | 判据 | 实测 | 结论 |
|---|---|---|---|
| 需求1 表格里「温馨提示」挤成一行 | 该 td 行盒数与 `white-space` | **4 行**、`white-space:pre-wrap`、td 由声明 8 撑到 **25.28** | ✅ 已解决（V1.3.10 单元格断行那条） |
| 需求1 元素跟随表格底部 | 设计相对偏移 6 → 实测落点 | 实测 y **118.53** = 表底 112.53 + 6 | ✅ 跟随在出纸态成立 |
| 需求1「没有固定跟随效果」 | 画布侧有无跟随逻辑 | canvas/common 源码 `flow-follow`/`followElementIds`/分页引擎 **0 命中**，画布元素纯 `position:absolute` | ⚠️ 属**两态差异**：跟随只在出纸发生，画布上永远不动——要解释，不是修 |
| 需求2 缩进 | longText 的 `text-indent` | **21.3333px**（2 × 8pt 折算） | ✅ 走「首行缩进 (字符)」字段这条径已解决 |
| 需求2 换行 | text / longText 元素里显式 `\n` | 两者都 **1 行**、computed `white-space: normal` → `\n` 被折叠 | ❌ **未解决**，见 T-26 |
| 需求2 手工空格缩进 | text 元素前导全角空格 | 首行左缘 19.99 = 元素盒 x 19.99 → 空格被吞 | ❌ 同上，见 T-26 |
| C1 | 跟随区 vline 实际高度 | **0mm**（设计 14mm） | ❌ 未修 |
| C2 | 横向零交集元素是否被吸收 | 仍被吸收，实测 y 118.53（设计 top 40 → **偏 78.53mm**） | ❌ 未修 |

- **对外结论**：1.3.10 把报告人的主路径（单元格内固定温馨提示 + 出纸跟随 + `longTextIndent` 缩进）确实修好了，
  关闭站得住；但需求2 的字面形态——**在文本/长文本元素里用换行符排版**——仍未支持。
  建议补一句限定回帖（元素级 `\n` 目前不落纸，多行文字请放单元格，缩进请用「首行缩进 (字符)」字段），
  否则报告人按原用法重试还会提一次。补回帖前无需重开（结论是「部分已解决」）。
- 顺带一条对本台账的更正：本报告人诉求里的「跟随」是**要跟随**，与 T-11 那份模板里「被误吸收导致漂移」是同一机制的两面——
  修 C2 时必须把「用户确实想要跟随」这条需求钉在判据里，别把跟随改成不跟随。

### T-24 【新增】GitHub #6 表格右键菜单很难唤醒 —— 未定性

- 实况：`#6` [bug] 表格的右键菜单很难唤醒，**仍 open**，2026-10-22T04:02Z 提出，正文**只有一段录屏外链**
  （`github.com/user-attachments`），无复现步骤与版本号；维护者 10-22 只回了「已收到，将进行测试验证」，此后零进展。
  此前未进本台账。
- 仓库既有口径：右键菜单四条（右键先单选命中、外点关闭带菜单内守卫、**表格单元格右键不要求先选中**、菜单项点击一律收起）
  已在 2026-09-29 / 10-01 修复并有回归覆盖（`CanvasAreaContextMenu.spec.ts`、`TableElement.spec.ts`、common `table.spec.ts` / `context-menu.spec.ts`）。
  所以「难唤醒」要么是这四条之外的新形态，要么是命中区/时序问题——**先定性再决定改不改**。
- 待办：在 demo 9303 与 common 宿主 9331 上实测表格单元格右键的**命中率**（多点几个位置逐个右键，量菜单是否出、是否要求先选中）。
  录屏外链在本机网络可能不可达，取不到就按文字复现，不要靠猜。
- 已知干扰项：示例两个表格都是 277mm 满宽，插列会弹宽度守卫 alert——那是正确行为不是 bug；
  自动化验证必须处理 dialog，否则 alert 阻塞后续操作会造成假失败。

### T-25 【新增】Linux 三包真机与 `cross-end` 比对

- AppImage/deb/rpm 已在 Docker（`node:22-bookworm` + rpmbuild）内出包并做过载荷与校验和级核对，但**未做真机安装与出纸验证**；
  `cross-end`（浏览器直印 / 服务端 PDF / 客户端静默三链路比对）因缺客户端 PDF 产物**未执行**。
- 本机无 Linux 设备、无签名与公证凭据，这两条只能由维护者在目标机上跑。

### T-26 【已按方案 B 实施，2026-10-26】元素级 `\n` 与前导空格不出纸 —— #IKPXQL 需求2

- 现象（真实管线实测）：`text` 与 `longText` 元素内容里写显式换行符，出纸只出 **1 行**、computed `white-space: normal`；手工全角空格缩进也被吞。
- 根因是**声明缺失**：`html-generator` 的缺省档不输出任何 `white-space`，落回 UA 默认 `normal`。画布与 common 同样没有该规则 → **不是分叉，是这条能力从来没支持过**。
  误导点在属性台：`ExpressionEditor.vue:604` 的预览区是 `pre-wrap`，面板看得见分行、画布与纸面都没有。
- **落地（方案 B，缺省关）**：
  - 判据单点 core `render/text-fit.ts` 新增 `resolveElementWhiteSpace(opts)`（随 `/designer` 导出）：未开→`undefined`（不出声明）、开→`'pre-wrap'`、`wordWrap === false` 时**让位返回 `undefined`**（单行优先）。
  - 三端消费同一份：出纸 `html-generator` 新增 `whiteSpaceStyle()`、画布 `TextElement`/`LongTextElement`、print-common `textLikeStyle`。
    **刻意不进 `elementFitStyle`**——`longText` 缺省显示形式是 `autoHeight`，该函数在该分支提前 `return`，声明放进去会被整条吞掉。
    这条坑由用例钉住并做过变异自证：把声明移进 `elementFitStyle` 后 `text` 仍绿、两条 `longText` 断言必红。
  - 属性台在「自动换行」下方各加一行「保留换行符」（画布 + common 同位置同文案）。
    开关行沿用既有口径**两侧都不挂说明气泡**——先挂了 `.pd-help` 后发现会造成「注册表里有没人消费的死文案 + 两端不对称」，已收回。
    「恢复默认值」按派生出厂值判脏（出厂未设 → 灰态）。新 key `ap-keep-line-breaks`，与「自动换行/不换行」互不串台（双向反面对照）。
- **存量零变化不是推理，是逐字比对**：真实两趟管线（Chromium 测量 → 分页 → 最终 HTML）跑 **27 份**产物（demo 示例库 11 份可出纸示例 + 15 组元素档位组合 + 1 份单元格矩阵），
  改前/改后 **25 份字节级一致**，只有显式打开新档的 2 份各多出一条 `white-space:pre-wrap;`（+21 字符）；「新档开 + 不换行」那组也逐字一致，证明单行优先成立。
  局限如实记：`asset-tag`、`roll-label` 两份拼版示例在该离线 harness 下出不了纸，未计入比对集。
- UI 级实测（导入含预置值的模板，非同一会话写入自测）：画布 9303 与 Common 9331 **逐条同值** ——
  打开的 text/longText 均 3 行 `pre-wrap`，未开的 2 行 `normal`；属性台回显未开 `checked=false/dirty=false`、已开 `true/true`；
  重选未开元素 → 点该行 → 画布由 2 行 `normal` 变 3 行 `pre-wrap`，预览出纸同步；页面 0 异常。
- 门禁：`npm run build` exit 0；`npm test` exit 0（core 77/1129、canvas 73/687、common 27/322、print-client 14/110）；
  `verify-demo` 四宿主 36/36 ×4；canvas `vue-tsc` 仍 53 条（**未新增**，且无一条来自本次文件，见 T-22）；
  render 服务单跑 `multipage` 两条通过，全量并发下出现过 5s 超时红灯（冷启动 Chromium 与五个 dev 服务争 CPU，属该文件既有 flaky 形态，非断言失败）。
- 文档已同步：`docs/中文/指南/使用指南.md`、中英 CHANGELOG「未发布」段、技能 `template-schema.md`——
  并**更正技能里那句「`wordWrap` 缺省 `true` 时 `\n` 也生效」**（旧断言只对单元格成立）。
- 版本建议：新增可选字段 + 打开后才改行为 → **minor**。发版时记得把该条折进版本段并同步两份 `help-content/changelog.ts`。
- 对外动作：#IKPXQL 已 closed，需求2 现在两侧都能解释了——单元格侧 1.3.10 已生效，元素级这一档随下个版本补上；回帖时给字段名与属性台行名即可（见 T-23）。

### T-27 【新增·存量分叉，实施 T-26 时实测撞出】长文本关「自动换行」在出纸端不生效

- 2026-10-26 直调 dist `generateHtml` 实测三种组合：
  - `text` + `wordWrap:false` → 出 `white-space:nowrap;text-overflow:ellipsis;` ✅ 与画布一致
  - `longText` + `wordWrap:false`（未显式设 `textFit`）→ **只出 `overflow:visible;`，没有 nowrap** ❌
  - `longText` + `wordWrap:false` + 显式 `textFit:'clip'` → 出 nowrap ✅
- 根因与 T-26 同一个函数：`elementFitStyle()` 在 `fit === 'autoHeight'` 分支**提前 `return`**，而 `longText` 的缺省显示形式正是 `autoHeight`，
  于是后面那句 `if (opts.wordWrap === false) return 'white-space:nowrap;…'` 永远走不到。
  画布与 print-common 两端都在 `wordWrap === false` 时挂了 `nowrap` + 省略号 → **设计器里单行省略、纸面上照样多行折**。
- 这不是我这次改出来的：本次刻意把新声明放在 `elementFitStyle` **之前**并另走判据，正是为了不被这个早 return 吞掉（已用变异自证，见 T-26）。
- 修法要先出存量影响结论：把 nowrap 补到 autoHeight 分支之前会**改变存量长文本模板的出纸**（凡「关了自动换行、又没显式设溢出形式」的长文本，从多行变单行截断），
  属可见行为变更，建议单独一轮按 minor 走，并在 CHANGELOG 写明触发条件；也可先在属性台把两档联动显式化（关自动换行即写 `textFit:'clip'`）绕开渲染端改动。
- **不自作主张并入 T-26**，等裁决。

---

## 二、本轮对台账的更正（2026-10-26 复验）
1. **T-22 的 49 条 → 实测 53 条**（涨幅来自近期改动过的 spec）。
2. **T-19b「verify-demo 不含顶栏收纳断言」不属实**——收纳两条在 T-10 轮已入库；真实缺口只剩缩放档位与字体链路。
3. **V1.3.10「待办：npm 由维护者手工发 `1.3.10`」实际已完成**：官方 registry `core` 与 `canvas` 的 `latest` 均为 `1.3.10`。
4. **T-07b 的前提被推翻**，改为公共面定性题（见该条）。
5. **Gitee 台账缺两条**：`#IKPMYK`（条码打印问题·严重，10-22 提，10-26 08:58 以「1.3.10 版本已经修复更新」关闭，comments 5）
   与 `#IKPXQL`（10-26 08:52 关闭）此前完全未登记。`#IKPMYK` 的修复确实落在 V1.3.10 段（条高 `barHeight`、静区 `barQuietZone`、
   条宽倍率上限 4→8、按 `printerDpi` 给推荐档、单元格条码字号改取 `barFontSize ?? fontSize`），只是 issue 编号没进任何载体。
6. **`#IKIPD9` 状态已变**：原台账写「未动（无证据表明同一缺陷）」，实况是 10-22 被标为 `rejected`（comments 2）。对外已收口，只是没登记。

---

## 三、对外动作的通路（执行 T-14 与对外回帖前先看）

- 私人令牌在 `~/.zshenv`（`GITEE_TOKEN`），`Bearer` 头对 GET/POST 均生效；回帖所需的 `notes` scope 已于 2026-10-22 补通。
- **issue 写操作走 owner 级端点**：`POST /api/v5/repos/{owner}/issues`、`PATCH .../issues/{number}`，body 的 `repo` 只填仓库名；
  GitHub 式 `/repos/{owner}/{repo}/issues` 在写操作上不存在，误用报的 404 措辞不指向格式错误。
  发行版：`POST /repos/{owner}/{repo}/releases` **必须带 `target_commitish`**（漏了回 400），`PATCH .../releases/{id}` 改正文不必带。
- 仓库配置「已完成 / 已拒绝的 issue 不允许评论」→ 给已关闭的 issue 补通知必须先重开（T-23 即此形态）。
- 写操作后一律用**匿名 GET 复核**落库与 `comments` 计数，防「报错但其实写进去了」或「以为发了其实没发」。
- 浏览器通路两个坑：`fill` 不激活提交按钮（需真点击，点两次会重复发帖——T-14 的重条评论即此形态）；
  自己评论的删除菜单不进无障碍快照，程序化点不到。
- 查 npm 发布面一律加 `--registry=https://registry.npmjs.org`，npmmirror 会滞后一个版本。
- GitHub 侧用 `gh api`，URL 含 `?` 必须整体加引号，否则 zsh 报 `no matches found` 并中断整条命令。

---

## 四、已完成归档（一行一条；正文与取证明细见 git 历史与 CHANGELOG）

| 项 | 一句话结论 | 本轮验证方式 |
|---|---|---|
| D-1 / D-2 / D-3 / D-4 | 拍板 `em` / CSS 值原样透传 / 删除字段 / 工具栏自适应收纳 | 随各条 |
| T-01 | 长文本首行缩进出纸生效：新增 `indentStyle()` 仅 `case 'longText'` 出 `text-indent:Nem`，画布与 common 两处 `pt`→`em` | 代码坐标 + core/canvas/common 单测 + render 集成 30 例全绿 |
| T-02 | 独立 image 的 `object-fit` 不再写死 `contain`，改 `opts.fit \|\| 'contain'`；未设 `fit` 的存量模板逐字不变 | 同上（缺省路径已用断言锁死） |
| T-03 | `objectPosition` 裁剪锚点贯通 core + `data-binder` 逐字段透传 + 画布两端 + common，非法值整条丢弃 | 同上 + 单元格链路用例 |
| T-04 | `TextAlign` 加 `justify`，三端同策（flex 主轴转纵向 + `text-align-last:justify`），单元格第 4 档「两端」同源 | 同上 |
| T-05a–d | 硬编码浅色改 `var(--pd-*, 原值)`，新令牌登记在 `.designer-container`；`.pd-switch::after` 白底显式豁免 | 代码坐标 + `npm run build`/`npm test` 绿；深色注入的浏览器证据系 2026-10-19 所取，本轮未重做 |
| T-06 | 僵尸字段 `lHeight`、`leftSpaceRemoved` 已删净（全仓仅 CHANGELOG 提及） | 精确 grep 源码零命中 |
| T-07 / T-07a | 工具栏自适应收纳（core 共用判定）+ `.tb-more-panel` 最小宽修掉嵌套浮层横向溢出 | 代码坐标（`native-controls.css:386`）+ 收纳两条断言实测在位 |
| T-08 | `PresetColorPicker` 多根告警收口：`defineOptions({ inheritAttrs: false })` + 触发器 `v-bind="$attrs"`，class 落到真实 `div` | `PropertyPanel.vue:124-129` + canvas 单测绿 |
| T-09 | 文档/技能同步：中英 CHANGELOG、`使用指南.md`、`模板设计器.md`、技能 `template-schema.md`，两份内置更新记录均含 V1.3.10 | grep 命中核对 |
| T-10 | demo-common 四宿主顶栏接入收纳 | `verify-demo` 36/36 ×4 新鲜实测 |
| T-12 | #IKP3MU 已回帖（现 `closed`）；#IKIPD9 现 `rejected`（本轮补登记，见 §二.6） | 匿名 API 复核 |
| T-13 | #IKN95F 已回帖通知升级验证，issue `closed`（comments 7） | 匿名 API 复核 |
| T-14 ① | 1.3.8 三处更新记录已登记并回帖（② 仍待办） | 匿名 API 复核 |
| T-17 | 未求值表达式不再当真实图：判据单点收在 `resolveCropPreview()`（空或含 `{`/`}` 即视为无图）+ `@error` 清尺寸 + 取景框 `fit-content` | `crop-anchor.ts:222` 坐标 + 用例绿 |
| T-18 | 素材台长字段名自适应换行（`.node-meta` `flex-wrap`），并入 V1.3.8 重发、已回帖关闭 | 匿名 API 复核 `closed` |
| T-19 | 预览缩放档位判据下沉 core `preview-zoom.ts`，`usePreviewZoom.ts` 删除，四宿主补档位条 | **浏览器动态实测**：9331/9334 五档齐、默认点阵 203dpi、`computed zoom=2.11458`、print 复位守卫在位 |
| T-19b | 宿主顶栏收纳四条缺口（派生产物过期、弹性占位、状态类、兜底类名）已修，判定改调 core | `verify-demo` 收纳两条 + 五档实测收起数 |
| T-20 | 三处分叉全改 canvas：`:target` 传原始值、`LayerPanel` 补 `flowList: '⊟'`、`FlowListGroup` 补 `.pd-help` | `PropertyPanel.vue:124`、`LayerPanel.vue:70`、`FlowListGroup.vue` 9 处命中 + canvas 72 文件全绿 |
| T-21 | 五条备案落地：静区留空靠占位、字体候选收紧成 canvas 判据、模糊匹配单点到 core、技能脚本补 `flowList`、common 类型红清零 | `print-common/src/core/font-catalog.ts` 已不存在 + common 26 文件/315 例全绿 |
| 发布 | V1.3.9 / V1.3.10 已双推；GitHub Release + Gitee 发行版 + 七件安装包附件已传；npm 主线 `1.3.10` 已发 | registry 与台账实况（Linux 真机见 T-25） |

---

## 五、建议执行顺序

| 序 | 项 | 代价 | 备注 |
|---|---|---|---|
| 1 | **T-11 C1** | 一行 + 1 条用例 | 最小红利；#IKPXQL 的「跟随」形态也吃这条 |
| 2 | **T-14 ② / T-15 / §二补登记** | 纯手工与纯文档 | 零代码，可穿插做 |
| 3 | **T-16 + T-19b** | 四宿主各一份 `activeFonts` + `verify-demo` 补 2 项 | 合并做，实现与断言同批落地才防得住回归 |
| 4 | ~~**T-26 元素级换行**~~ **已按方案 B 实施并验完（2026-10-26）** | 见该条 | 27 份真实管线产物逐字比对、两端 UI 实测、门禁全绿；待发版折条目 |
| 5 | **T-27 长文本关自动换行的出纸分叉** | 需先出存量影响结论 | 与 T-26 同函数但改它会动存量出纸，**单独一轮**，等裁决 |
| 6 | **T-24 #6 定性** | 实测命中率，暂不改码 | 定完才知要不要出补丁版 |
| 7 | **T-11 C2** | 需你先定跟随区口径 | 与 C3 的 X 轴记账语义互相影响，且要保住「用户确实要跟随」这条需求（见 T-23），**不要直接动代码** |
| 8 | **T-22** | 按 spec 分文件推进 | 与功能对齐无关，建议独立轮；顺手把 `vue-tsc` 串进 CI |
| 9 | **T-07b** | 文档级定性 | 二选一，见该条 |
| 10 | **T-25** | 需目标机 | 本机不可验证 |

~~T-23 验证 #IKPXQL~~ —— 2026-10-26 已跑完真实管线复现，结论回写在该条；剩下的对外动作是补一句限定回帖。
