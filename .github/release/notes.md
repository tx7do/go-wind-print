## v1.3.6（2026-10-16） · Release Notes

语言导航：**[简体中文](#简体中文)** ｜ **[English](#english)**

---

<a id="简体中文"></a>

## v1.3.6（2026-10-16）—— 简体中文

自 `v1.3.5` 以来 11 次提交。**这是一个修复版本，无 API 变更、模板 JSON 无字段变更**：桌面客户端静默打印的出纸方向修正（Windows 宽幅标签被转 90°、macOS / Linux 的纸张声明此前从未真正下发、横向页被纵向纸型名钉住），并首次提供 Linux 三类安装包。

### 安装与升级

```bash
npm install @worm-vue3-print/core@^1.3.6 @worm-vue3-print/canvas@^1.3.6
```

发布到 npm 的仍然只有 `core`（渲染引擎与表达式系统）与 `canvas`（Vue 3 设计器）两个包。渲染服务 `services/print-render`、桌面客户端 `clients/print-client` 与实验性的 `packages/print-common` 在仓库内维护，不发布 npm。

未使用桌面客户端静默打印的项目，本版本没有可见变化。

### 修复（桌面客户端出纸方向）

- **Windows：宽幅标签被旋转 90° 出纸**。100×75 mm 这类「宽大于高」的标签经客户端静默打印时，纸上内容整体旋转 90°，而产物 PDF 本身方向正确。根因是 Windows 出纸交给 SumatraPDF，其默认 `autoRotate` 对「宽 > 高」的页面无条件加 90°，只在方向被判定为横向时才抵消回 0°；未显式声明方向时，该判定取自打印驱动（标签驱动多为纵向）。现按页面自身长宽比显式声明方向：`-print-settings "<份数>x,landscape|portrait"`，正方形页归 `portrait`（正方页带 `landscape` 会被反向旋转 90°）。
- **macOS / Linux：纸张声明此前从未真正下发**。`printPdfFile` 组装出纸命令时按字段逐个转发参数、漏掉了 `paper`，页面尺寸到不了命令构造层，V1.3.0 起引入的 `-o media=…`（宿主指定驱动纸型 → 标准纸型匹配 → `Custom.<宽>x<高>`）只在宿主显式给出 `paperName` 时才下发。现改为原样透传全部选项。
- **macOS / Linux：横向页只报纸型名仍被转 90°**。判据与 Windows 同源——CUPS 的 `pdftops` 按「生效介质朝向 vs 页面朝向」补 90°，而 `A4` / `Letter` 这类标准纸型名本身就是纵向介质。macOS 出纸在「页面宽 > 高且未指定驱动纸型」时额外下发 `-o orientation-requested=4`（实测 `do_rotate` 由 90 变 0），纵向页与正方页不发；该请求的实现是交换介质长宽，故 macOS 的 `Custom.` 也改按纵向序（短边×长边）声明，翻一次才落回页面真实尺寸。**Linux 反向走纸张**：cups-filters 1.28 实测把该请求实现为「给页面写 `/Rotate 270` 并交换 MediaBox」，标签机反被打歪，故 Linux 不发它，横向页也不再报纵向纸型名，改按页面真实朝向走 `Custom.<宽>x<高>`（A/B 实测：横向 A4 的 MediaBox 由 595×842 变 841.89×595.28，且不写 `/Rotate`）。

> ⚠️ **口径更正（发布时追加）**：上条「该请求的实现是交换介质长宽，故 macOS 的 `Custom.` 按纵向序（短边×长边）声明」已被后续实测推翻——直接收 PDF 的队列（driverless / `_ib`）走 `cgpdftopdf`，该请求的语义是「按声明介质的朝向把内容转过去贴它」，并不交换介质；按纵向序声明物理横向的标签会把介质钉成纵向。`v1.3.6` tag 的代码仍是纵向序版本，修正登记在未发布段。

### 行为变更与影响面

- **升级后同一份宽幅标签的出纸方向与 PDF 一致**。此前为规避旋转而把模板做成竖版、再由人工旋转的做法，需改回按真实出纸方向设计。
- **macOS / Linux 出纸现在会真正声明纸张**。此前按队列默认纸张（多为纵向 A4/Letter）处理的横向页面改用页面真实尺寸，横向 A4 与宽幅自定义纸随之正立（macOS 靠方向请求翻介质，Linux 靠按真实朝向声明 `Custom.`）。
- **队列 PPD 不支持自定义尺寸时 `media=Custom.*` 会被静默忽略**（AirPrint / driverless 队列即如此），并回落队列默认纸张。标签类纸张请在宿主侧传驱动内已定义的 `paperName`。
- **驱动侧仍可能反向旋转**：若驱动中标签定义的朝向与模板不一致，出纸仍可能被驱动转回去，需在驱动 / 机器设置里对齐。
- **Windows 侧不消费 `paperName`**：该通路没有 CUPS 的纸张声明能力，只声明方向；需要指定驱动预置纸型时走 macOS / Linux。
- 客户端协议、WebSocket 接口与宿主 SDK 均无变更。

### 桌面客户端安装包（本版本起含 Linux）

不发布 npm 的桌面客户端 `clients/print-client`（Electron 静默打印，回环 WebSocket 默认端口 17521）以安装包附件形式挂在本发行版页面：

| 附件 | 适用系统 |
| --- | --- |
| `WormPrintClient-1.3.6-mac-x64.dmg` | Intel Mac |
| `WormPrintClient-1.3.6-mac-arm64.dmg` | Apple Silicon Mac |
| `WormPrintClient-1.3.6-win-x64.exe` | Windows 10 / 11 x64（NSIS 安装程序，可选择安装目录、创建桌面快捷方式） |
| `WormPrintClient-1.3.6-linux-amd64.deb` | Debian / Ubuntu x64（`sudo apt install ./<文件>`） |
| `WormPrintClient-1.3.6-linux-x86_64.rpm` | Fedora / RHEL / openSUSE x64（`sudo rpm -i <文件>`） |
| `WormPrintClient-1.3.6-linux-x86_64.AppImage` | 任意 x64 发行版，免安装单文件（需 `libfuse2`） |
| `SHA256SUMS.txt` | 以上安装包的 SHA-256 校验和 |

> ⚠️ **安装包未做 Developer ID 签名与公证**（本项目没有 Apple Developer ID 与 Windows 签名证书）。主程序、Helper 与 `Electron Framework` 保留 Electron 官方预编译自带的 ad-hoc 签名，所以 arm64 包在 Apple Silicon 上不缺执行前提；缺的只是 bundle 级资源封印，表现为 macOS 首次打开被 Gatekeeper 拦截。绕过方式：`xattr -dr com.apple.quarantine /Applications/WormPrintClient.app`（与系统版本无关），或 macOS 15 起在 系统设置 → 隐私与安全性 点「仍要打开」。Windows 会在 SmartScreen 提示「未知发布者」，点「更多信息」→「仍要运行」。arm64 包在 Apple Silicon 真机的实际启动**未经真机验证**（构建机为 Intel）。打包与上传步骤见 [客户端 README](https://github.com/worm-longliu/worm-vue3-print/blob/master/clients/print-client/README.md)。

> 🐧 **Linux 三个包为新产出，在 x64 的 Docker 容器里交叉构建**（`npm run pack:client:linux`）：包内容、依赖声明与 SHA-256 均已核对，但**没有经过任何 Linux 真机安装与出纸验证**。出纸依赖 CUPS；deb/rpm 内的 `chrome-sandbox` 为非 setuid（`0755`），若启动报 `SUID sandbox helper` 错误，需启用非特权用户命名空间或临时加 `--no-sandbox`。只提供 fuse3 的发行版（如 Ubuntu 24.04）跑 AppImage 前要装 `libfuse2`，或用 `--appimage-extract-and-run`。本版不提供 `snap` 与 arm64 包。

> 🧭 **安装包的基线是发布时的 `master`（`8f2d1ba`），不是 `v1.3.6` tag。** tag 之后另有 5 笔提交改动桌面客户端与 demo，安装包一并带上：出纸默认通路改为 **HTML 直打**（`webContents.print`，三端不再依赖外部命令；随之 Windows 的 SumatraPDF 通路整体移除、`config.json` 不再接受 `printRoute`、Windows / Linux 去掉应用菜单，均为破坏性变更），macOS 回退 PDF 通路的 `Custom.` 改按页面真实朝向声明（即上文「口径更正」所指的修正），窗口与托盘图标和安装包同源，demo 自定义字体改为跟随模板声明。逐条明细见 [`docs/中文/CHANGELOG.md`](https://github.com/worm-longliu/worm-vue3-print/blob/master/docs/中文/CHANGELOG.md) 的「未发布」段。npm 的 `core` / `canvas` 不受影响——tag 之后 `packages/` 零改动，发布内容与 tag 一致。

### 质量

- 测试全绿：按安装包基线 `8f2d1ba` 复跑，四工作区 1459 项 —— core 814 / canvas 415 / common 120 / print-client 110（`v1.3.6` tag 基线为 1443 项，多出的 16 项全在 print-client，属 HTML 直打通路）。
- 出纸参数转发新增回归用例：`pdf-printer.test.ts` 以 `execFile` 桩核对 macOS / Windows 分支实际下发的参数（防止再次出现「声明写了但没转发」），并按页面长宽比逐档断言方向 token。
- `npm run build`、`npm test`、`npm run lint:print-architecture`（三端重复实现守卫）退出码均为 0。
- **未验证项如实列出**：macOS 的出纸方向与纸张口径已用开源虚拟打印机（RWTS-PDFwriter）在 macOS 15.7.8 / CUPS 2.3.4 上逐例度量复核（落盘介质的 MediaBox、`/Rotate` 与内容旋转矩阵），HTML 直打与回退的 PDF 通路各自都测；真机打印机（尤其标签机会把自定义尺寸夹回自带表单）与 Windows 的方向修复仍需真机出纸核对；Linux 三个安装包未做真机安装与启动验证。

---

<a id="english"></a>

## v1.3.6 (2026-10-16) — English

11 commits since `v1.3.5`. **This is a fix release: no API changes and no template JSON changes.** It corrects the output orientation of desktop silent printing (wide labels rotated 90° on Windows, the paper declaration that never actually reached the print command on macOS / Linux, and landscape pages pinned to a portrait paper name) and ships Linux installers for the first time.

### Install / upgrade

```bash
npm install @worm-vue3-print/core@^1.3.6 @worm-vue3-print/canvas@^1.3.6
```

Only `core` and `canvas` are published to npm. The render service, the desktop client and the experimental `print-common` package remain in-repo. Projects that do not use desktop silent printing see no visible change.

### Fixes (desktop client output orientation)

- **Windows: wide labels came out a quarter turn off.** A 100×75 mm label printed rotated even though the generated PDF is correct in any viewer. Windows output is handed to SumatraPDF, whose default `autoRotate` unconditionally adds 90° to pages where width > height and cancels it back to 0° only when the page is judged landscape — with no orientation declared, that judgement comes from the print driver (label drivers usually report portrait). The client now declares orientation from the page's own aspect ratio: `-print-settings "<copies>x,landscape|portrait"`, with square pages counted as `portrait` (a square page tagged `landscape` gets rotated the other way).
- **macOS / Linux: the paper declaration was never actually sent.** `printPdfFile` forwarded options field by field and dropped `paper`, so page size never reached argument construction and the `-o media=…` declaration (host driver paper name → standard-size match → `Custom.<w>x<h>`) introduced in V1.3.0 only went out when the host supplied a `paperName`. All options are now passed through unchanged.
- **macOS / Linux: a paper name alone did not stop landscape pages from rotating.** The trigger is the same as on Windows — CUPS' `pdftops` adds 90° whenever the effective media's orientation disagrees with the page's, and standard names such as `A4` / `Letter` are portrait media by definition. On macOS the command now also sends `-o orientation-requested=4` when the page is wider than tall and no driver paper name was given (`do_rotate` measured 90 → 0); it is never sent for portrait or square pages, and since the request swaps the media's dimensions, macOS `Custom.` sizes are declared portrait-canonical (short × long) so one swap lands on the page's real size. **Linux takes the paper route instead**: cups-filters 1.28 implements that request by writing `/Rotate 270` into the page and swapping the MediaBox, which skews label output, so Linux skips it and no longer reports a portrait paper name for landscape pages, declaring `Custom.<width>x<height>` in the page's real orientation (A/B measured: MediaBox went from 595×842 to 841.89×595.28 with no `/Rotate`).

> ⚠️ **Correction added at release time**: the claim above that the request "swaps the media's dimensions, so macOS `Custom.` sizes are declared portrait-canonical (short × long)" has since been refuted by measurement. Queues that take PDF directly (driverless / `_ib`) go through `cgpdftopdf`, whose semantics are "rotate the content onto the declared medium" — the medium itself is not swapped, so declaring a physically landscape label in portrait order pins the media to portrait. The code inside the `v1.3.6` tag is still the portrait-canonical version; the fix is recorded under Unreleased.

### Behavior changes

- **The same wide label now prints in the orientation the PDF shows.** Templates turned sideways to work around the old behavior must go back to their real output orientation.
- **macOS / Linux output now really declares the paper**, so jobs that previously fell back to the queue's default paper (usually portrait A4/Letter) use the page's true size, and landscape A4 / wide custom paper now prints upright (macOS flips the media with an orientation request; Linux declares `Custom.` in the page's real orientation).
- **Queues whose PPD has no custom-size support silently ignore `media=Custom.*`** (AirPrint and driverless queues do this) and fall back to the queue's default paper — for label stock, pass a `paperName` the driver already defines.
- **The driver can still rotate back**: if the label definition in the driver disagrees with the template, align the driver / machine setting.
- **`paperName` is not consumed on Windows**: that path has no CUPS paper declaration, only orientation; use macOS / Linux when a driver preset paper name is required.
- The client protocol, the WebSocket interface and the host SDK are unchanged.

### Desktop client installers (Linux added in this release)

The desktop client `clients/print-client` (Electron silent printing over a loopback WebSocket, port 17521) is not published to npm; its installers are attached to this release page:

| Asset | Target |
| --- | --- |
| `WormPrintClient-1.3.6-mac-x64.dmg` | Intel Mac |
| `WormPrintClient-1.3.6-mac-arm64.dmg` | Apple Silicon Mac |
| `WormPrintClient-1.3.6-win-x64.exe` | Windows 10 / 11 x64 (NSIS, selectable install dir and desktop shortcut) |
| `WormPrintClient-1.3.6-linux-amd64.deb` | Debian / Ubuntu x64 (`sudo apt install ./<file>`) |
| `WormPrintClient-1.3.6-linux-x86_64.rpm` | Fedora / RHEL / openSUSE x64 (`sudo rpm -i <file>`) |
| `WormPrintClient-1.3.6-linux-x86_64.AppImage` | Any x64 distribution, single self-contained file (requires `libfuse2`) |
| `SHA256SUMS.txt` | SHA-256 checksums for the installers above |

> ⚠️ **The installers carry no Developer ID signature and are not notarized** — the project holds no Apple Developer ID or Windows signing certificate. The main executable, the Helpers and `Electron Framework` keep the ad-hoc signature that ships inside Electron's official prebuilds, so the arm64 package is not missing any execution prerequisite on Apple Silicon; what is missing is the bundle-level resource seal, which surfaces as a Gatekeeper prompt on first launch. Bypass it with `xattr -dr com.apple.quarantine /Applications/WormPrintClient.app` (works on every macOS version), or on macOS 15 via System Settings → Privacy & Security → "Open Anyway". On Windows, SmartScreen reports an unknown publisher → More info → Run anyway. Launching the arm64 build on real Apple Silicon hardware has **not been verified** (the build machine is Intel). Packaging and upload steps live in the [client README](https://github.com/worm-longliu/worm-vue3-print/blob/master/clients/print-client/README.md).

> 🐧 **The three Linux packages are new and were cross-built inside an x64 Docker container** (`npm run pack:client:linux`): payload, declared dependencies and SHA-256 are verified, but **no installation or printing on real Linux hardware has been tested**. Printing relies on CUPS; `chrome-sandbox` inside the deb/rpm is not setuid (`0755`), so a `SUID sandbox helper` error at launch means you need unprivileged user namespaces enabled or `--no-sandbox` for now. On distributions that ship only fuse3 (Ubuntu 24.04 and newer), install `libfuse2` before running the AppImage, or launch it with `--appimage-extract-and-run`. No `snap` and no arm64 builds in this release.

> 🧭 **The installers are built from `master` at release time (`8f2d1ba`), not from the `v1.3.6` tag.** Five commits after the tag change the desktop client and the demo, and the bundles carry them: silent printing now defaults to the **direct HTML route** (`webContents.print`, no external command on any platform — which also removes the Windows SumatraPDF path, drops `printRoute` from `config.json` and removes the Windows / Linux application menu, all breaking), the macOS fallback PDF route now declares `Custom.` in the page's real orientation (the correction noted above), window and tray icons share the installer artwork, and the demo's custom fonts follow the template. Each item is detailed in the Unreleased section of [`docs/en/CHANGELOG.en.md`](https://github.com/worm-longliu/worm-vue3-print/blob/master/docs/en/CHANGELOG.en.md). The npm `core` / `canvas` packages are unaffected: `packages/` has no changes after the tag, so the published content matches it exactly.

### Quality

- Tests are green: re-run at the installer baseline `8f2d1ba`, 1459 tests across the four workspaces — core 814 / canvas 415 / common 120 / print-client 110 (the `v1.3.6` tag baseline was 1443; the 16 extra are all in print-client, covering the direct HTML route).
- New regression coverage for argument forwarding: `pdf-printer.test.ts` stubs `execFile` to assert what each platform branch actually sends (so a "declared but never forwarded" bug cannot come back) and checks the orientation token for every aspect-ratio case.
- `npm run build`, `npm test` and `npm run lint:print-architecture` all exit 0.
- **Not yet verified, stated plainly**: macOS orientation and paper declaration have now been measured case by case against an open-source virtual printer (RWTS-PDFwriter) on macOS 15.7.8 / CUPS 2.3.4 — MediaBox, `/Rotate` and the content rotation matrix of the saved PDF, for both the direct HTML route and the fallback PDF route. Real printers (label drivers in particular, which clamp custom sizes back to their own forms) and the Windows orientation fix still need output on hardware; the three Linux installers have not been installed or launched on real Linux machines.

---

感谢所有提交者与反馈者。问题请在 [Issues](https://github.com/worm-longliu/worm-vue3-print/issues) 提出，完整变更见 [`docs/中文/CHANGELOG.md`](/docs/中文/CHANGELOG.md)。
