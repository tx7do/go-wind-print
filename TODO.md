# TODO — 待办与对账台账

> 取证基线：`master` @ `d913e32`（含 T-26 的 `8bac872`；本轮 C1/T-27/T-15 改动尚在工作区未提交）。上一轮全量复验基线 `cd6e7c1`（tag `v1.3.10`）；包版本 core/canvas/print-client `1.3.10`、common `1.3.7-beta.0`。
> **2026-10-26 本轮交接口径（四条阻断项收口后）**：本轮改动已落 **5 笔本地提交**（`19f0a63` 修复+用例+两条自检脚本 / `261f72a` 文档与技能口径 / `8990944` 台账 / `96652e2` 升版 V1.3.11 / `ae3ebe7` 令牌口径与归档），
> **均未推送**，工作区干净。V1.3.11 已到「可发布态」：`npm run check:release-carriers` FAIL 0，dist 内旧包已整批 mv 至 `~/print-client-dist/1.3.10/`（18 件，未删除，可移回）。
> **只剩两步需要你的 npm 登录态**：① `node scripts/check-common-dist-tag.mjs --fix` 摘掉被预览版占用的 `latest`；
> ② `npm run publish:npm` 发 core/canvas `1.3.11`，随后重打七件安装包并挂 Release（GitHub 附件 + Gitee 发行版正文用 `.github/release/notes.md` 与中文版本段）。
> 发完可跑 `npm run check:release-carriers -- --post` 与线上 `npm pack` 载荷复验（本轮已用同法证过 1.3.10 缺这三条、1.3.11 全带）。
> 另：#IKPXQL 的公开错话已按载荷级实测更正（评论 id 51816315，复核 `state=closed / comments=2`）。
> **2026-10-26 续作**：T-28（longText 缺省行高）已按方案 A 修完并折进尚未发布的 V1.3.11 段，四载体同步、sync-assets 已重跑；T-29（`wordWrap:false` 三份手写实现收编）已完成并双推；T-22（canvas 测试类型错 53→0 并接入 pretest）已完成并双推；T-24（GitHub #6 右键菜单）已定性为**本机两宿主自动化下均正常、未能复现**，并撤回了上一稿的误报（见该条）。
> **2026-10-26 再续**：T-16（四宿主字体链路）与 T-19b（预览缩放档位断言）已完成并双推，`verify-demo` 42 项 ×4 全绿。
> **2026-10-26 发布前复核**：`npm pack` 三包产物里四条修复全在（`needsHeight` 含 `vline`、`overflow:visible;${nowrap}`、`keepLineBreaks`、`resolveElementNowrap`、`line-height:1.5`），canvas 内置更新记录含 V1.3.11；`npm publish --dry-run`：core 1.3.11 / 30 文件 / 346.0 kB / tag latest，canvas 1.3.11 / 86 文件 / 241.7 kB / tag latest，common 1.3.7-beta.0 / 44 文件 / 423.8 kB / tag next（需带脚本那组 flag）。**本机默认 registry 是 npmmirror**，手敲 publish 会发错源，已在 CONTRIBUTING 记红线。
> **T-11 C2 影响面已量化**：资产级横向零交集成员 0 例（8 份模板/15 成员），复现确认 `far`/`over` 仍被吸收、`under` 应当跟随；口径 A/B 待你选，选完按「与 C3 同一轮」实施。待裁决新登记：**T-28**（longText 缺省行高 1.5 vs 出纸 normal）、**T-29**（`wordWrap:false` 三份手写实现待收编），以及原有 T-11 C2、T-24 定性、T-16/T-19b、T-22、T-25。

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

### T-11 #IKOUJI 剩余一条根因 C2　【成立】（C1 已修，见 §四；C2 影响面已量化，待你拍板）

- ~~C1 跟随区内 `vline` 丢高度~~ —— 已修，见 §四。
- **C2 跟随区无条件几何吸收**：`pagination-engine.ts` 的 `buildFollowMap` 判据只有 `top >= currentTableBottom`
  （编组成员靠 `excludedIds` 豁免），**完全不看 X 轴**。
- **2026-10-26 复现（直调 dist `paginate`）**：表格 x[25.83..175.83]，另放 `far`(x 200..215, top 60)、`over`(x 260..280, top 70)、
  `under`(x 30..70, top 60) 三个元素 → 三者**全部**被吸进跟随区。其中 `far`/`over` 与表格横向零交集（本不该跟随），
  `under` 同列正下方（**应当**跟随）——所以判据必须是「横向相交才跟随」，不能简单地把下方元素一律排除。
- **影响面（本轮新量，资产级）**：4 个示例与 4 份技能模板有跟随区，共 15 个成员/份，**横向零交集的成员 = 0**
  ⇒ 引入该判据对仓库内任何资产**零变化**，只影响外部用户模板（#IKOUQL 那类「表格旁另放一栏」的版式）。
- **推荐口径（待你选）**：
  A. `buildFollowMap` 增「成员与表格 X 区间相交」判据（推荐）：相交才跟随，零交集保持原地绝对定位；
     验收 = 上述复现里 `far`/`over` 不再被跟随、`under` 仍跟随 + 资产级 8 份产物逐字不变 + 一条用例钉住三元素组合。
  B. 保持现状，只改文档说明「表格下方的元素都会跟随」，让用户用编组/`excludedIds` 规避。
- **落地前提（别忘）**：与 C3 已落地的「同列扣高」记账都改 X 轴语义，**必须同一轮做**，分开做会互相打脸；
  且 #IKPXQL 的诉求是「确实要跟随」（见 §四 T-23 附注），改动不得把跟随改成不跟随。
- **本轮未改代码**：只补了复现与影响面数字（一次性脚本，跑完即删）。


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
- **【口径修正】原「`latest` 尚不存在，省略 `@next` 会报错」是假的**：README / 包内 README / 集成技能三处都这么写，
  2026-10-26 实测官方 registry 回 `{"latest":"1.3.7-beta.0","next":"1.3.7-beta.0"}` —— 裸写 `npm i @worm-vue3-print/common`
  **不报错、静默装到实验包**（npm 给新包首发自动打 `latest`，`--tag next` 挡不住）。三处文档已按实测更正。
- **仓库侧已固化判据**：新增 `scripts/check-common-dist-tag.mjs`（exit 0 健康 / 1 红灯并给出修复命令 / 2 读不到），
  已串进 `publish:common:beta`（发布后自动 `--fix` 摘 `latest`）与 `publish:common:dry-run`（`--dry-run` 只报不改），单独复查 `npm run publish:common:check`。
  实跑判据：`node scripts/check-common-dist-tag.mjs` → 红灯 exit 1（本机未登录 npm，未做 registry 写）。
  本轮再加两点：**① 我先前把它挂在 `publish:common:dry-run` 链尾是设计缺陷**——既有红灯会把演练判成失败，破坏了文档里「演练 exit 0」的约定；已加 `--warn-only`（照旧打印但 exit 0），实测 `npm run publish:common:dry-run` 回到 **exit 0**（core 77/canvas 73/common 27 全绿、tarball 44 文件 / 422.6 kB、`with tag next`）。**② 试过 `publishConfig.tag` 作结构性兜底，实测无效**（npm 11.19 不带 `--tag` 的 dry-run 仍报 `tag latest`；`access`/`registry` 两项生效并已留在包里）。防线只剩脚本的 `--tag next` 与发布后 `--fix`，别再往 `publishConfig.tag` 上加注。
  **`--fix`/`--dry-run` 四条分支已用离线 npm shim 跑满**（shim 忠实模拟「摘掉 latest 后 npm 不再回该键」）：
  A 现状预览版占 latest→exit 1｜B `latest` 是正式版→exit 0 并提示转正同步文档｜C `latest` 缺失→exit 0｜
  D `--fix`→确实调用 `dist-tag rm` 且复查后 `latest` 消失→exit 0｜E `--dry-run`→exit 1 且 shim 里**没有任何写调用**、状态文件未变。
  `verify-demo` 四宿主 36/36 ×4 本轮新鲜重跑；技能 `template-schema.md` 的 `wordWrap` 行与 `docs/中文/指南/模板设计器.md` 的 `textFit` 三档已回写单行溢出/版本边界口径；`build_template.py` 的 `COMMON_ALIAS` 补了 `keepLineBreaks`（此前技能生成不出该字段），端到端跑通：生成→校验 0 项→core 落值出 nowrap 不出 pre-wrap。
- **剩一条只能维护者本机做**：`npm login` 后跑 `node scripts/check-common-dist-tag.mjs --fix` 摘掉 `latest`；
  以及按既有口径走 `publish:common:beta` 重发预览版（该包已落后主线 40+ 笔提交）。

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
  回帖口径已随 T-26 落地改写（2026-10-26）：**不是「不支持」，而是「下个版本支持」**——
  元素级 `\n` 需在属性台打开「保留换行符」（`keepLineBreaks`），缩进另有「首行缩进 (字符)」字段；
  而 npm 当前 `latest` 是 `1.3.10`、**不含该档**，所以回帖写明「随 V1.3.11 发出」（本轮三条修复按 minor 计，版本段已折叠），否则报告人装最新版重试还是看不到。
  #IKPXQL 现 `closed`，补通知需先重开（见 §三 通路）。
- 顺带一条对本台账的更正：本报告人诉求里的「跟随」是**要跟随**，与 T-11 那份模板里「被误吸收导致漂移」是同一机制的两面——
  修 C2 时必须把「用户确实想要跟随」这条需求钉在判据里，别把跟随改成不跟随。

### T-24 GitHub #6 表格右键菜单很难唤醒 —— **本机两宿主自动化下均正常，未能复现**（2026-10-26 定性）

- **对外结论**：在 demo 9303（Vue3 画布）与 common 9331（零框架宿主）上，用 CDP 真实输入右键表格单元格，
  单元格菜单**稳定唤出**：9303 逐帧 30 帧持续在场（`.table-ctx-menu`）、事件序列 `mousedown(b2) → contextmenu(b2) → mouseup(b2)`；
  9331 菜单渲染在 shadow 内（`shell/table.ts` 注释即如此），穿透 shadow 后量到 **142×398 px、12 个菜单项**。
  ⇒ 四条既有口径（右键先单选、外点关闭、单元格右键不要求先选中、菜单项点击收起）在该构建上成立，**GitHub #6 未复现**。
- **公开撤回我此前的误报**：本台账上一稿写过「三台探针 1/6、0/18、菜单未进 DOM，命中层通但菜单不渲染」。**那是错的**——
  我的探针只查 `.context-menu`，而**单元格菜单的类名是 `.table-ctx-menu`**，且 print-common 的菜单渲染在 shadow root 内；
  换成正确选择器并逐帧采样后，两个宿主都稳定出菜单。责任在探针，不在产品；该结论已作废。
- **仍未解释的部分**：报告人（GitHub #6）在**他的环境**下遇到「很难唤醒」。本机两条通路都正常，说明差异可能来自
  ① 平台（Windows 原生 contextmenu 时序与 macOS 不同）；② 具体模板（超大表格 / 画布滚动容器内 / 缩放档位）；
  ③ 高负载下 `nextTick` 翻转定位的时序。**这些本机都复现不了，不能靠猜**。
- 下一步（需要报告人或 Windows 实机）：
  1. 请报告人补：操作系统与浏览器版本、是否在缩放档（点阵/适配/200%）下、表格是否超出画布可视区需滚动、出现频率；
  2. Windows 实机按同一探针法（右键格中心 → 逐帧数 `.table-ctx-menu`）量命中率，与本机 30/30 对照；
  3. 若确认平台相关，再查 `TableElement.vue` 的 `menu.visible` 置位与 `window.addEventListener('mouseup', closeMenuOnOutsideMouseup)`
     在同一手势里的先后——本机实测 mouseup 晚于 contextmenu 约 40ms 且菜单未被关掉，说明这段时序本身是安全的。
- 本项**未改任何代码**；一次性探针已全部删除。


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

## 二·补 同族形态横向对账（2026-10-26，C1/T-27 修完后穷举同类漏点）

修完两条后，把「同一类写法」在渲染层扫了一遍，结论是**没有兄弟缺陷**，且我的一条怀疑被复现推翻：

1. **「按类型白名单决定发不发 `height`」这一形态**：全仓只有 `html-generator.ts:895` 一处（就是 C1 那条），无其它白名单遗漏。
   页眉/页脚与拼版走的不是这条——它们复用 `elementPositionStyle`（`css-builder.ts:384`），实测页眉 vline 出
   `width:1.8mm;height:14mm;…border-left…` 正常、hline 出 `height:1.8mm;…height:0`（后者是有意覆盖）。**C1 的影响面就到跟随区为止。**
2. **「提前 `return` 吞掉后续声明」这一形态**：元素级（`:409`）已修；单元格级 `:727` 我怀疑同族，**直调 dist 复现后被推翻**——
   `textFit:'autoHeight'` + `wordWrap:false` 的单元格照样出 `white-space:nowrap;overflow:hidden`，因为 td 层的换行声明
   与内层定高容器是两条独立通路（`resolveCellTextFit` 在缺省时也把「不换行」判成 `clip`）。画布 `TableElement.vue:292-293`
   同语义（`pre-wrap` / `nowrap` 二选一），两端一致。**不要按「单元格也有这个 bug」去改代码。**
3. 其余 `return ''` 落点（`:419` fitAttrs、`:800`/`:832` 小计汇总行、`:888` 找不到跟随元素）与本族无关。

### 资产级静态扫描（分页引擎自己的判据，13 份示例 + 8 份技能模板 + 3 份 demo JSON）

补这条是因为我原来的存量结论只到「改前/改后产物逐字一致」，而**没证那批产物里到底有没有真的跑出跟随区**——现在用引擎判据扫完：

- **跟随区路径被真实命中 4 份**：`purchase-receipt`(1 个跟随元素)、`sales-outbound`(5)、`comprehensive-showcase`(1)、`thermal-receipt`(**8，其中含一条 `hline` = `rc-16`**)。
  ⇒ 「harness 里没产生跟随区」这个担忧不成立；且 thermal-receipt 那条 hline 是**天然负对照**：它落在 C1 改动的同一条判据上，改前后字节一致，
  反向证明「不该动的没动」。**技能资产与 demo JSON 与示例同形**（同一份 hline 也出现在 `thermal-receipt.template.json`）。
- **`vline` 在跟随区里零命中** ⇒ C1 在仓库全部资产上**零影响**，受益面只在外部用户模板（#IKPXQL 那类「表格下方放竖线要跟着走」的形态）。
- **`wordWrap: false` 的 text/longText 在仓库资产上零命中** ⇒ T-27 的存量影响面在仓库内同样为零，
  改前/改后 25/31 一致这件事从此有了第二种独立证法（静态扫描 + 字节比对互证），不再只靠一次 harness。
- 局限如实记：`pagination-edge` 与各 `*.data.json` 在该 harness 下报 `template.margins` 缺失（前者是多页包装结构、后者是数据文件），属扫描器口径而非模板缺陷。


---

## 三、对外动作的通路（执行 T-14 与对外回帖前先看）

- 私人令牌在 `~/.zshenv`，**变量名是 `GITEE_ACCESS_TOKEN`**（2026-10-26 实测 `GITEE_TOKEN` 长度为 0，用它发写请求回 `401 Access token does not exist`）。`access_token` 表单参数对 issue 写操作有效；`Bearer` 头这次实测回「登录失效，无权限访问该资源」，**别再按旧口径用 Bearer 试写操作**。
- **issue 写操作走 owner 级端点**：`POST /api/v5/repos/{owner}/issues`、`PATCH .../issues/{number}`，body 的 `repo` 只填仓库名；
  GitHub 式 `/repos/{owner}/{repo}/issues` 在写操作上不存在，误用报的 404 措辞不指向格式错误。
  发行版：`POST /repos/{owner}/{repo}/releases` **必须带 `target_commitish`**（漏了回 400），`PATCH .../releases/{id}` 改正文不必带。
- 仓库配置「已完成 / 已拒绝的 issue 不允许评论」→ 给已关闭的 issue 补通知必须先重开（T-23 即此形态）。
- 写操作后一律用**匿名 GET 复核**落库与 `comments` 计数，防「报错但其实写进去了」或「以为发了其实没发」。
- 浏览器通路两个坑：`fill` 不激活提交按钮（需真点击，点两次会重复发帖——T-14 的重条评论即此形态）；
  自己评论的删除菜单不进无障碍快照，程序化点不到。
- 查 npm 发布面一律加 `--registry=https://registry.npmjs.org`，npmmirror 会滞后一个版本。
- **发版载体自检**：`npm run check:release-carriers`（自动判态）/ 加 `-- --post` 发版后复核 / 加 `-- --base=<上个有资产的 tag>` 判安装包要不要重打。
  它专查历史上真出过的三次事故（内置更新记录漏条目、README 直链指旧版、`clients/print-client/dist` 混旧包）。
  本轮实跑：默认态 FAIL 0 / WARN 2（未发布段待折叠 + 需升号），`--post` 态按预期回 FAIL 1 / exit 1；
  开发过程中它自己有两个 bug 被跑出来了——`(.*?)` 漏 `s` 标志导致未发布段读空、把待发内容误判成"已清空"，以及一处被 Edit 吞掉的换行造成语法错——都已修并复跑。
- GitHub 侧用 `gh api`，URL 含 `?` 必须整体加引号，否则 zsh 报 `no matches found` 并中断整条命令。

---

## 四、已完成归档（一行一条；正文与取证明细见 git 历史与 CHANGELOG）

| 项 | 一句话结论 | 本轮验证方式 |
|---|---|---|
| T-23b | #IKPXQL 那条「请更新最新版本，当前最新版本已经解决」已按载荷级实测更正：重开 → 贴更正（评论 id 51816315，逐条区分 1.3.10 已生效 / V1.3.11 才有的元素级换行）→ 再关闭；匿名复核 `state=closed`、`comments=2` | 三步写操作 + 匿名 GET 复核 |
| T-28 | longText 缺省行高三端不一致已修：出纸在未设 `lineHeight` 时补 `line-height:1.5`（无单位，不覆盖显式 pt）；**存量影响**：29 份产物 25 份一致，差异只有 4 组「longText + 未设行高」各多一条声明，示例库 13 份 + 技能 8 份全未变（资产里 longText 未设行高者 0 个，未设行高的 85 个全是 `text` 且三端本就 normal）；真实 Chromium 每行 22px→24px 与画布同值 | RED/GREEN + 逐份 cmp + Chromium 行盒 + 四载体回写（中英 CHANGELOG / 两份 help-content / 指南 / 技能） |
| T-29 | `wordWrap === false → nowrap` 已收编到 core 单点：新增 `resolveElementNowrap`（随 `/designer` 导出），出纸 `elementFitStyle`、画布 `Text/LongTextElement`、print-common `textLikeStyle` 三端消费同一份；单元格那两处（td 层与 cell-fit 层）属另一套语义，按原样保留 | core 2 条判据用例 + 三端既有落值用例 + 出纸声明逐字复核（`line-height:1.5;overflow:visible;white-space:nowrap;text-overflow:ellipsis;`） |
| T-22 | canvas 测试类型错 **53 → 0**：`tableColWidths` 非空断言 16、`pages` 夹具按最小对象构造并标 `TemplateData` 11、`borders`/`dots` 可空 2、`VueNode.value` 转 `HTMLInputElement`/`HTMLSelectElement` 5、隐式 any 6、`toEqual` 消息参数位置 1、单元格夹具补 `id` 9、TableCellImage 夹具 cast 1 等；并把 `vue-tsc --noEmit` 接进 canvas 的 `pretest`（变异验证：故意插一条类型错 → 门禁 exit 2 且 vitest 根本没跑） | vue-tsc 计数 53→0 + canvas 73 文件/688 例全绿 + 变异自证 |
| T-16 | 四个 common 宿主接上字体链路：各加 `fontsOf(tpl)`（多页合并、按 family 去重）并在 `el.template` 之后赋 `el.fonts`；证据：`verify-demo` 新增 3 条断言——带字体示例声明 3 个字体 / `@font-face` 3 条进文档 / 下拉 1 默认 + 3 候选；**变异自证**：撤掉 vue3 宿主的注入后两条立即变红（matched=0/3、options=1），恢复即绿 | 四宿主 42/42 ×4 实跑 |
| T-19b | 预览缩放档位断言补齐：五档齐（点阵 203dpi/适配/100%/200%/400%）、默认档与出纸文档缩放一致（实测 `html{zoom:2.11458}` = 203/96）、说明文案与 `@media print{html{zoom:1 !important}}` 复位守卫在位；`verify-demo` 由 36 项增至 **42 项** | 四宿主 42/42 ×4 实跑 |
| T-07b | `resolveToolbarOverflow` 按推荐口径 ① 定性为**公开契约**：core README 新增「`/designer` 的稳定面」小节，登记收纳判据（入参 + 链序）、三档文字显示判据、`resolveElementWhiteSpace`/`resolveElementNowrap`、预览缩放六个导出、元素边框五个编辑函数，并写明破坏性变更需 minor 及以上；方案 ②（收回）因四个宿主断链不采用。登记前逐个核过真实导出名（我初稿里编的 `resolvePreviewZoomPresets` 并不存在，已按源码改正） | README 登记 + `designer/index.ts` 导出链核对 |
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
| T-11 C1 | 跟随区 `vline` 丢高度已修：`html-generator` 的 `needsHeight` 补 `vline`（`hline` 的 `height:0` 有意为之，未动）；正对照 rect/oval/image、负对照 hline 各一条用例 | RED→GREEN 实跑（改前 3 红、改后 core 77 文件/1137 例全绿）+ 跟随区产物逐字比对 + 真实 Chromium 落纸（vline 0px→52.91px=14mm，hline 逐值不变） |
| T-27 | 长文本关「自动换行」出纸不生效已修：`elementFitStyle()` 不再在 `autoHeight` 分支提前 `return`，改为 `overflow:visible;` 与 `white-space:nowrap;text-overflow:ellipsis;` 拼接（与画布/Common 逐字同形）。**属可见行为变更，按 minor**：凡关自动换行且未显式设溢出形式的 text/longText，出纸从多行折变单行，`autoHeight` 实测高度随之收缩为 1 行。**分页落点不变**（真实两趟管线实测：内容底边越出内容区 3mm 的形态两档同页，独立元素按 `top` 归页）——撤回上一稿「可能牵动分页」的说法。31 份产物逐字比对：25 份一致，差异只多出这一条声明、全部落在 `wordWrap:false` + `autoHeight` 的 5 组组合，示例库 13 份全一致（无用例采该组合）；`pagination-edge` 在该离线 harness 出不了纸，属取证局限 | RED→GREEN 实跑 + 改前/改后 dist 产物 `cmp` 逐份比对 + 真实 Chromium 行盒（4 行→1 行、6.67px、溢出 816px） + **三端各自落值用例齐备**（canvas `KeepLineBreaks.spec` 与 common `keep-line-breaks.spec` 各补 1 条「longText 关自动换行：`overflow:visible` 与 `nowrap` 并存」，含负对照） |
| C1/T-27 真实管线永久用例 | 渲染服务新增 `follow-region.integration.test.ts`（表格真分页→引擎自己检出跟随区→vline 落纸带 `height:14mm`，对照 hline 仍不出 height）与 `text-fit.integration.test.ts` 两条两趟用例（实测高度折行≥单行 2 倍且单行≈一行行高、两档同页）。**变异自证已做**：分别临时撤掉两处修复——撤 C1 只让跟随区那条变红；撤 T-27 让 core 2 条 + render 2 条变红，而 C1 那条仍绿（两组判据互不牵连）。恢复后 render 10 文件/34 例、core 1137 例、`npm run build` 全 exit 0 | 撤回态与恢复态各实跑一轮 |
| （T-27 附注） | 该组合落纸是**单行溢出**而非「省略号」：`autoHeight` 保留 `overflow:visible`，省略号只在裁剪容器里才画得出——与画布同形，要省略号须显式设「截断」。已写进中英 CHANGELOG | 真实 Chromium `Range` 行盒实测 |
| T-15（仓库侧） | `latest` 占用预览版这条已按实测更正三处文档口径，并新增退出码分级自检 `scripts/check-common-dist-tag.mjs`，串进 `publish:common:beta`（`--fix`）与 `publish:common:dry-run`（`--dry-run`）；**registry 摘除与重发预览版仍需维护者本机 npm 登录态** | `node scripts/check-common-dist-tag.mjs` 实跑回红灯 exit 1 + `npm view` 实况 |
| 发布 | V1.3.9 / V1.3.10 已双推；GitHub Release + Gitee 发行版 + 七件安装包附件已传；npm 主线 `1.3.10` 已发 | registry 与台账实况（Linux 真机见 T-25） |

---

## 五、建议执行顺序

| 序 | 项 | 代价 | 备注 |
|---|---|---|---|
| 1 | ~~**T-11 C1**~~ **已修并验完（2026-10-26）** | 见 §四 | 改前 RED、改后 core 全量 1137 例绿 |
| 2 | **T-14 ② / §二补登记** | 纯手工 | 零代码；T-15 仓库侧已完成，只剩维护者本机 `--fix` 与重发预览版 |
| 3 | **T-16 + T-19b** | 四宿主各一份 `activeFonts` + `verify-demo` 补 2 项 | 合并做，实现与断言同批落地才防得住回归 |
| 4 | ~~**T-26 元素级换行**~~ **已按方案 B 实施并验完（2026-10-26）** | 见该条 | 27 份真实管线产物逐字比对、两端 UI 实测、门禁全绿；待发版折条目 |
| 5 | ~~**T-27**~~ **已修并出存量结论（2026-10-26）** | 见 §四 | 31 份逐字比对，示例库 13 份零变化；发版需按 minor 写明触发条件 |
| 6 | **T-24 #6 定性** | 实测命中率，暂不改码 | 定完才知要不要出补丁版 |
| 7b | **T-28 缺省行高分叉** | 需先出存量结论 | 与 T-27 同一取证通路撞出；三端只有出纸不是 1.5，改它会动存量长文本高度，**等裁决** |
| 7 | **T-11 C2** | 需你先定跟随区口径 | 与 C3 的 X 轴记账语义互相影响，且要保住「用户确实要跟随」这条需求（见 T-23），**不要直接动代码** |
| 8 | **T-22** | 按 spec 分文件推进 | 与功能对齐无关，建议独立轮；顺手把 `vue-tsc` 串进 CI |
| 9 | **T-07b** | 文档级定性 | 二选一，见该条 |
| 10 | **T-25** | 需目标机 | 本机不可验证 |

~~T-23 验证 #IKPXQL~~ —— 2026-10-26 已跑完真实管线复现，结论回写在该条；剩下的对外动作是补一句限定回帖。
