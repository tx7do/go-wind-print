## v1.3.9（2026-10-22） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.9（2026-10-22）—— 简体中文

自 `v1.3.8` 以来 2 次提交。这是一个**纯补丁版**，只补一件事：设计器内置「更新记录」里漏登了 [Gitee #IKPAGV](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV) 那一条说明。

素材台字段树「变量名过长时中文名自动占满一行」的**功能修复已经随 `1.3.8` 发布并在包内生效**——证据取自官方 registry 的已发布产物：`canvas@1.3.8` 的 `dist/canvas.css` 内含 `.node-meta{…flex-wrap:wrap…}` 与新 `.node-key` 规则，`dist/index.js` 内含 `.node-meta` 结构。缺的只是那条文案没进 `help-content/changelog.ts`，所以装 1.3.8 的用户在应用内的「更新记录」面板里看不到它。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.9 @worm-vue3-print/canvas@^1.3.9
```

发布到 npm 的正式包仍只有 `core` 与 `canvas`。实验性的 `@worm-vue3-print/common` 仍以预览版发布：dist-tag `next`，自身版本 `1.3.7-beta.0` 与主线**不同步**（本版只把它对 `core` 的依赖范围抬到 `^1.3.9`），**不进 `latest`**，安装写 `npm i @worm-vue3-print/common@next`；`services/print-render` 与 `clients/print-client` 不发布 npm，分别以 Docker 镜像与 GitHub Release 安装包分发。

### 修复

- **内置「更新记录」补齐 #IKPAGV 那条说明**：四处同步点一次改齐——中文 CHANGELOG、英文 CHANGELOG、canvas 与 print-common 两份 `help-content/changelog.ts`（两份正文逐字一致，已用 diff 复核）。jquery 宿主的 `public/vendor/worm-print-common.js` 已按新产物重跑 `sync-assets.mjs` 同步。

### 行为变更与影响面

- **功能与模板 schema 零变化**：本版不改任何渲染、分页、出纸逻辑，存量模板字节不变。
- **已在 1.3.8 的用户不必强制升级**：字段树显示已经正常，升级 1.3.9 只会多出那条应用内更新说明。
- **`v1.3.8` 标签已在今天重打过**（落点从 `9f198c0` 移到 `fcf58fe`，含 #IKPAGV 的源码修复）；1.3.9 是在其之上的补丁段，不回填 1.3.8 的历史条目。

### 关联 Issue

- Gitee：[IKPAGV 设计面板 素材台的字段如果变量太长，中文就看不全了](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV)

### 桌面客户端安装包

安装包基线为 `v1.3.9` 标签提交（实际构建自 `5e141be`，与标签树只差 `TODO.md` 台账两行，代码内容逐字一致）；六个安装包与校验和清单已作为本发行版附件上传：

- [WormPrintClient-1.3.9-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-mac-x64.dmg)
- [WormPrintClient-1.3.9-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-mac-arm64.dmg)
- [WormPrintClient-1.3.9-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-win-x64.exe)
- [WormPrintClient-1.3.9-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-amd64.deb)
- [WormPrintClient-1.3.9-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-x86_64.rpm)
- [WormPrintClient-1.3.9-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/SHA256SUMS.txt)

以上七个附件已上传并逐个复核：GitHub 资产字节数与本地 `stat` 逐一对齐（621 B ~ 139 MB），直链全部回 `200`。安装包只挂在 GitHub（Gitee 发行版附件单文件上限 100 MB，装不下 Electron 产物）。下载不动或掉速时，把链接交给迅雷 / IDM / qBittorrent 续传；GitHub 页面本身打不开则属访问受阻，换网络或走源码构建。Linux 三包未经真机验证：出纸依赖 CUPS，AppImage 需 `libfuse2`（只有 fuse3 的发行版用 `--appimage-extract-and-run`），deb/rpm 内 `chrome-sandbox` 为非 setuid。

### 质量

- `npm run build` exit 0（六包全绿）。
- 单测：core 69 文件 / 935 例、canvas 58 文件 / 514 例、common 15 文件 / 176 例、print-client 14 文件 / 110 例，合计 **1735 例全过、0 跳过**。
- 渲染服务：`npm run test -w @worm-vue3-print/render` **9 文件 / 30 例**（真实 Chromium）全过。
- `npm run lint:print-architecture` 通过。
- 发布面取证：官方 registry `@worm-vue3-print/{core,canvas}` 的 `latest` 已是 `1.3.8`（发布于 2026-10-22 12:20 / 12:25 +0800），npmmirror 镜像当时仍显示 `1.3.7` —— 判据一律指名 `registry.npmjs.org`。
- 安装包载荷核对：mac x64 / mac arm64 / win 的 `app.asar` 与 deb（`data/opt/WormPrintClient/resources/app.asar`）、rpm（`./opt/...`）解包后**同为 5,435,317 字节**，内含 22 处 `1.3.9` 与 HTML 直打通路标记 `worm-print-client-html`；AppImage 内嵌 squashfs 本机无工具可解，只给到校验和级证据。
- 构建通路：mac/win 在宿主用 `ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR`（npmmirror）出包；Linux 三包走 Docker（`node:22-bookworm`，容器内装 `rpmbuild`）。构建前已把构建卷里 1.3.5/1.3.6/1.3.7 的旧 Linux 产物改名避让（`dist.pre-1.3.9-backup`），确保 `dist/` 只有本次六件。
- 本版**未新增测试**（纯文案与基线），1.3.9 的 npm 发布由维护者手工执行。

---

<a id="english"></a>

## v1.3.9 (2026-10-22) — English

2 commits since `v1.3.8`. This is a **documentation-level patch**: it only restores the missing [Gitee #IKPAGV](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV) entry inside the designer's built-in changelog.

The functional fix — long field keys wrapping to a second line so the CJK label keeps the full first line — **already shipped and works in `1.3.8`**. Evidence from the published artifact on the official registry: `canvas@1.3.8`'s `dist/canvas.css` carries `.node-meta{…flex-wrap:wrap…}` plus the new `.node-key` rules, and `dist/index.js` carries the `.node-meta` structure. What was missing was the wording in `help-content/changelog.ts`, so users on 1.3.8 could not see that entry in the app's own 更新记录 panel.

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.9 @worm-vue3-print/canvas@^1.3.9
```

Only `core` and `canvas` have stable releases on npm. The experimental `@worm-vue3-print/common` remains a **preview** (dist-tag `next`; its own version `1.3.7-beta.0` is intentionally out of sync with the mainline — this release only raises its `core` range to `^1.3.9`) and is **not `latest`**; install it as `npm i @worm-vue3-print/common@next`. `services/print-render` and `clients/print-client` stay in-repo and are not published.

### Fixed

- **Built-in changelog now lists the #IKPAGV entry**: all four sync points updated together — Chinese CHANGELOG, English CHANGELOG, and the two `help-content/changelog.ts` files in canvas and print-common (verified byte-identical with `diff`). The jQuery host's `public/vendor/worm-print-common.js` was re-synced from the rebuilt bundle via `sync-assets.mjs`.

### Impact

- **No behaviour or template-schema changes**: nothing in rendering, pagination or output logic moved; existing templates stay byte-identical.
- **Users already on 1.3.8 do not have to upgrade**: the field tree already behaves correctly; 1.3.9 only adds the missing in-app changelog line.
- **The `v1.3.8` tag was moved earlier today** (from `9f198c0` to `fcf58fe`, now containing the #IKPAGV source fix); 1.3.9 sits on top as a patch segment and does not rewrite 1.3.8 history.

### Related issues

- Gitee: [IKPAGV long variable names hide the Chinese label in the material panel](https://gitee.com/liulong_oschina/worm-vue3-print/issues/IKPAGV)

### Desktop client installers

Installer baseline is the `v1.3.9` tag commit (actually built from `5e141be`, whose tree differs from the tag only by two ledger lines in `TODO.md`, so the code content is identical); all six installers plus the checksum list are attached to this release:

- [WormPrintClient-1.3.9-mac-x64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-mac-x64.dmg)
- [WormPrintClient-1.3.9-mac-arm64.dmg](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-mac-arm64.dmg)
- [WormPrintClient-1.3.9-win-x64.exe](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-win-x64.exe)
- [WormPrintClient-1.3.9-linux-amd64.deb](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-amd64.deb)
- [WormPrintClient-1.3.9-linux-x86_64.rpm](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-x86_64.rpm)
- [WormPrintClient-1.3.9-linux-x86_64.AppImage](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/WormPrintClient-1.3.9-linux-x86_64.AppImage)
- [SHA256SUMS.txt](https://github.com/worm-longliu/worm-vue3-print/releases/download/v1.3.9/SHA256SUMS.txt)

All seven attachments are uploaded and re-checked one by one: every GitHub asset size matches the local `stat` byte count (621 B ~ 139 MB) and every direct link returns `200`. Installers are hosted on GitHub only (Gitee release attachments are capped at 100 MB per file). If downloads stall, hand the links to a resumable downloader. The three Linux packages are not verified on real hardware: printing depends on CUPS, AppImage needs `libfuse2` (use `--appimage-extract-and-run` on fuse3-only distributions), and `chrome-sandbox` is not setuid inside deb/rpm.

### Quality

- `npm run build` exits 0 (all six packages).
- Unit tests: core 69 files / 935 cases, canvas 58 / 514, common 15 / 176, print-client 14 / 110 — **1735 cases pass, 0 skipped**.
- Render service: `npm run test -w @worm-vue3-print/render` — **9 files / 30 cases** in real Chromium.
- `npm run lint:print-architecture` passes.
- Registry check: `latest` for `@worm-vue3-print/{core,canvas}` is already `1.3.8` on `registry.npmjs.org` (published 2026-10-22 12:20 / 12:25 +0800) while npmmirror still showed `1.3.7` — always pin the registry when checking.
- Installer payload check: the `app.asar` inside mac x64, mac arm64, the Windows NSIS exe, the deb (`data/opt/WormPrintClient/resources/app.asar`) and the rpm (`./opt/...`) is **the same 5,435,317 bytes** in every artifact, carrying 22 `1.3.9` literals and the `worm-print-client-html` direct-print marker; the AppImage's embedded squashfs cannot be unpacked on this host, so it stays at checksum-level evidence.
- Build route: mac/win built on the host with `ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR` pointed at npmmirror; the three Linux packages via Docker (`node:22-bookworm` with `rpmbuild` installed in-container). Before building, the stale 1.3.5/1.3.6/1.3.7 Linux artifacts inside the build volume were renamed out of the way (`dist.pre-1.3.9-backup`) so `dist/` ends up with exactly this release's six files.
- **No new tests in this release** (copy and baseline only); the npm publish of 1.3.9 is run manually by the maintainer.
