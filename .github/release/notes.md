# Worm Print V1.3.11 (2026-10-26)

V1.3.11 是一个 minor 版本：补上元素级「保留换行符」能力，并修掉两条出纸不一致（表格跟随区的竖线、长文本关「自动换行」）。自 v1.3.10 以来 3 次提交（本次登记提交后 +1）。

## 新增
- **文本 / 长文本「保留换行符」档**（`keepLineBreaks`，缺省关）。打开后内容里手打的 `\n` 各占一行、行首空格与连续空格原样保留，同时仍按框宽自动换行；与「自动换行」同时关掉时单行优先。属性台在「自动换行」下方新增一行，画布与零框架宿主（print-common）同位置同文案。起因是 Gitee #IKPXQL 的需求2。

## 修复
- **表格跟随区里的竖线出纸高度为 0（整条消失）**。跟随区此前只给矩形/椭圆/图片回传设计高度，而竖线的长度完全依赖 `height`，于是「表格下方放一条竖线并跟着表格走」在纸上不存在。横线未受影响（它的长度走宽度，`height:0` 是有意行为）。
- **长文本关掉「自动换行」在出纸端不生效**。`autoHeight` 分支提前返回，把单行声明整条吞掉，导致设计器里单行、纸面上照样多行折。现与画布/宿主同形。**行为变更提示**：凡关掉自动换行又没显式设溢出形式的文本/长文本，出纸从多行折行变单行；该组合的形态是「单行溢出」而非省略号（省略号只在「截断」形式下画得出）。仓库内 13 份示例与技能模板全部逐字未变——没有资产使用该组合。
- **`@worm-vue3-print/common` 的 `latest` 指向预览版**。npm 会给新包首次发布自动打 `latest`，`--tag next` 挡不住这一步，所以裸写 `npm i @worm-vue3-print/common` 不会报错而是静默装到实验包。已按实测更正 README / 包内 README / 集成技能三处口径，并新增发布面自检 `npm run publish:common:check`（退出码 0/1/2 分级，已串进预览版发布脚本）。

## 工程与验收
- 新增 `scripts/check-release-carriers.mjs`（`npm run check:release-carriers`）：发版前后各跑一次，核对版本号同号、版本段折叠、两份内置更新记录、Release 正文底稿、README 安装包直链表、客户端 dist 是否混旧包、改动是否命中 core 渲染管线（命中则七件安装包需重打）。
- 测试：core 77 文件 1139 例 / canvas 73 文件 688 例 / common 27 文件 323 例 / print-client 14 文件 / 渲染服务 10 文件 34 例（真实 Chromium）全绿；`demo-common` 四宿主 `verify-demo` 36/36 ×4。

---

# Worm Print V1.3.11 (2026-10-26)

V1.3.11 is a minor release: it adds element-level "keep line breaks" and fixes two paper-vs-designer inconsistencies (vertical lines inside a table's follow region, and long text with auto wrap turned off).

## Added
- **"保留换行符" (keep line breaks) for text / long-text** (`keepLineBreaks`, off by default): explicit `\n` each start a line, leading and repeated spaces are preserved, and wrapping by box width still applies; when auto wrap is off, the single line wins. A new row appears under "自动换行" in the property panel, identical on the Vue 3 canvas and the zero-framework host.

## Fixed
- **Vertical lines below a table printed with zero height (they vanished).** The follow region only passed the design height to `rect`/`oval`/`image`, while a vline takes its whole length from `height`. Horizontal lines are unaffected (their `height:0` is intentional).
- **Turning off "自动换行" on a long text had no effect on paper.** The `autoHeight` branch returned early and swallowed the nowrap declaration, so the designer showed one line while the sheet still wrapped. All three renderers now agree. **Behaviour change**: any text/long-text with auto wrap off and no explicit overflow form now prints as a single line; that combination prints as a single overflowing line (an ellipsis needs the "截断" form). All 13 demo samples and the skill's template assets are byte-for-byte unchanged — none uses that combination.
- **`@worm-vue3-print/common` had `latest` pointing at the preview build.** npm stamps `latest` on a package's first publish and `--tag next` cannot stop it, so a bare `npm i @worm-vue3-print/common` silently installs the experimental package. Three doc surfaces were corrected against the measurement, and an exit-code-graded self-check (`npm run publish:common:check`) now runs inside the preview publish script.

## Engineering
- New `scripts/check-release-carriers.mjs` (`npm run check:release-carriers`) to verify release carriers before and after a release.
- Tests green: core 77 files / 1139 cases, canvas 73 / 688, common 27 / 323, print-client 14 files, render service 10 files / 34 cases (real Chromium), `verify-demo` 36/36 across four hosts.

> 明细见 `docs/中文/CHANGELOG.md` 的 V1.3.11 段。安装包由本次发版重打后上传，上传前本页与 README 的 v1.3.11 直链会 404。
