# tauri-runtime-cef

Windows、macOS 与 Linux 桌面端的 Tauri runtime 适配器：统一使用 CEF/Chromium 作为 WebView 后端。

它实现 `tauri-runtime` trait，并在桌面 Kabegame GUI 的 `standard` 构建中被选用。Android 仍使用系统 WebView。

## Runtime 模型

CEF runtime 只支持一个渲染路径：**CEF Views/windowed**。

```text
Tauri Builder
  -> tauri-runtime-cef
    -> CEF Views Window
      -> CEF BrowserView
        -> Chromium GPU composition
```

- CEF 创建并拥有顶层原生窗口与 `BrowserView`；不创建 tao 顶层窗口。
- 窗口和 webview 操作统一通过 CEF UI 线程执行；主循环持续 pump 平台消息（Linux 为 GLib，Windows 为 Win32 message queue，macOS 为 NSApplication event queue）与 CEF。
- `BrowserView` 尺寸由 CEF Window client area 布局，不转发 tao resize、鼠标、键盘或 IME 事件。
- `KABEGAME_CEF_WINDOW_MODE` 已废弃且不再读取；CEF 始终 windowed。
- GPU 模式可用 `KABEGAME_CEF_GPU_MODE`（或 `CEF_WINDOWED_GPU_MODE`）覆盖：`default`（不加开关）/ `disabled` / 任意 ANGLE 后端名（`gl`、`d3d11`、`vulkan`…）。默认值：Linux `gl`（Vulkan 后端曾触发 GPU device-lost），Windows `default`（Chromium 自选，ANGLE D3D11）。
- 不包含替代的离屏渲染、软件帧缓冲或 dmabuf/wgpu 合成路径。

CEF `KeyboardHandler` 提供 DevTools 快捷键：macOS 使用 `Command+Shift+D`，
Windows/Linux 使用 `Ctrl+Shift+D`。

## Tauri 适配边界

| Tauri 能力        | CEF 实现                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 前端资源          | 全局 scheme handler factory 服务前端/asset 资源。Linux/macOS 走自定义 scheme（`tauri://localhost` / `asset://localhost`）；Windows 上 Tauri core 把自定义 scheme `X` 改写为 `http://X.localhost`（见 `tauri` manager `webview.rs`），故 CEF 改为对 `http` scheme + `X.localhost` 域注册 factory（`protocol::cef_scheme_and_domain`），否则 `http://tauri.localhost` 会当成真实网络请求 → `ERR_CONNECTION_REFUSED` |
| `invoke()`        | `ipc://` 主路径与 `cef-ipc://` postMessage 后备桥接；内部 IPC scheme 允许绕过页面 CSP，以支持 surf 等第三方页面中的 Tauri IPC                                                                                                                                                                                                                                                                                     |
| 初始化脚本        | browser 创建时通过版本化 `extra_info` 传给 renderer，在每个新 V8 context 的 `RenderProcessHandler::on_context_created` 中同步执行，保证首次加载、刷新与跨页面导航均为 document-start                                                                                                                                                                                                                              |
| 页面生命周期      | `LoadHandler` 映射到 Tauri page-load hook                                                                                                                                                                                                                                                                                                                                                                         |
| Cookie API        | CEF 全局 `CookieManager` 映射到 Tauri `cookies_for_url` / `cookies` / `set_cookie` / `delete_cookie`                                                                                                                                                                                                                                                                                                              |
| 窗口事件          | CEF `WindowDelegate` 回流为 Tauri runtime events                                                                                                                                                                                                                                                                                                                                                                  |
| Raw window handle | Linux 返回 Xlib window，Windows 返回 Win32 HWND（+HINSTANCE）；macOS CEF Views 暂不暴露 NSView，返回 unavailable                                                                                                                                                                                                                                                                                                  |

## 平台门控

`src-tauri/kabegame/Cargo.toml` 在 Windows、macOS 与 Linux 声明本 crate；应用入口在桌面 `standard` 下使用：

```rust
tauri::Builder::<tauri_runtime_cef::Cef<tauri::EventLoopMessage>>::new()
```

Android 不会把 CEF 放入 Kabegame 的依赖树。

## macOS 运行模型

- libcef 由**构建期直链**（`third/cef-rs` fork 的 cef-dll-sys，分支 `kabegame-149`）：framework 的 install_name `@executable_path/../Frameworks/Chromium Embedded Framework.framework/...` 写入 exe 的 LC_LOAD_DYLIB，dev 经 cef-dll-sys build.rs 创建的 `target/Frameworks` 符号链接（→ `$CEF_PATH`）解析，release 经 bundle `Contents/Frameworks/` 解析。dyld 在 `main` 前完成绑定——不存在 `LibraryLoader` 加载顺序问题，`cef_load_library` 在 fork 里是 no-op stub。
- browser 主进程 dev 下直接裸跑 `target/debug/kabegame`（不再生成 `gen/Kabegame.app`）；release 打包仍是 `.app`。裸跑时 `src-tauri/kabegame/macos/embedded-Info.plist` 经 `-sectcreate __TEXT __info_plist` 内嵌进 exe，提供 Retina/进程名/GPU 切换元数据（bundle 内运行时以 bundle 的 Info.plist 为准）。
- `dispatch_cef_subprocess()` 创建实现 `CefAppProtocol` 的 `KabegameCefApplication`，并在入口调用 `execute_process` 做单 binary 子进程分流。
- `Settings.browser_subprocess_path` 指向**主程序自身**（Electron 式单 binary）：CEF 再 exec 同一路径并带 `--type=...`，`dispatch_cef_subprocess()` / `maybe_exit_as_cef_subprocess` 接管 renderer/GPU/utility。browser 与子进程复用 runtime 内唯一的 `CefRuntimeApp` 和 renderer initialization-script handler。**macOS release（bundled）若仍用扁平旁路 helper，才依赖 `third-patches/cef/0001-flat-subprocess-path.patch`**（见「CEF 依赖与 patch」）；单 binary 自举时 path 就是主 exe。
- runtime 使用 `external_message_pump=1`，每轮非阻塞排空 NSApplication event queue，再执行 `do_message_loop_work()`。
- `framework_dir_path` 仍显式设为 canonicalize 后的真实路径（dev 的 `target/Frameworks` 是符号链接），与 dyld 实际加载路径一致；留空或不一致会导致 GPU 合成黑屏（JS/输入正常、画面全黑）。

## Windows 注意事项

- **application manifest 是硬性要求**。Chromium GPU 进程用 `WS_EX_LAYERED` 子窗口做
  DirectComposition 呈现（`ui/gl/child_window_win.cc`），layered 子窗口只对声明了
  Windows 8+ 兼容性（`<compatibility>` supportedOS）的进程开放；不带 manifest 的
  cargo 默认 exe 会让 GPU 进程 `CreateWindowEx` 失败 → NOTREACHED 崩溃循环
  （CEF #3765）。`kabegame` package 的 build.rs 通过 tauri-build
  `WindowsAttributes::app_manifest` 同时为主程序、helper 和 example 注入
  `src-tauri/kabegame/windows-app.manifest`。
- CEF 子进程 = 再 exec 主程序自身（`browser_subprocess_path = current_exe`），
  `dispatch_cef_subprocess()` 必须在 `main` 最早期调用（与 Linux 相同）。Windows 无
  zygote，`no-zygote` 开关仅 Linux 追加。
- cookies/localStorage 落 `%LOCALAPPDATA%\kabegame-cef`（Linux 为 XDG cache）。
  **dev 与安装态目录必须分开**：CEF 是 Chrome runtime，`cef_initialize` 会在该目录建
  Chrome profile 并注册进程级 ProcessSingleton（单实例锁）。若 `bun dev` 与已安装正式版
  共用目录，后启动者会命中对方 singleton → `Opening in existing browser session.` →
  `cef_initialize` 返回 false → panic。故按构建 profile 隔离：debug（`bun dev`）用
  `kabegame-cef-dev`，release（安装态）用 `kabegame-cef`（见 `cef_cache_dir_name`）。
- **前端/asset scheme 与 Linux 不同**：Windows/Android 上 Tauri core 用 `http://<scheme>.localhost`
  提供自定义 scheme 资源（`tauri_protocol_url` / `window_origin` 改写，默认 `http`，
  由 `use_https_scheme` 决定 http/https），主框架加载的是 `http://tauri.localhost`。因此
  `protocol.rs` 在 Windows 对 `http` scheme + `<scheme>.localhost` 域注册 factory，而非
  自定义 scheme（否则连接被当真实网络请求 → `ERR_CONNECTION_REFUSED`，页面 refused/白屏）。
  `cef-ipc`（runtime 自有 postMessage 通道）在所有平台仍是自定义 scheme。
- **请求 URI 还原**：Tauri 的 handler 仍按自定义 scheme 约定解析 URI（`protocol/tauri.rs`
  对整串 `strip_prefix("tauri://localhost")`）。CEF 拿到的是 `http://tauri.localhost/...`，
  strip 失败 → 空路径 → 回退 `index.html`（JS 模块被当 `text/html` → MIME 报错）。故
  `request_to_http` 在 Windows 把 `http(s)://<scheme>.localhost/<path>` 还原为
  `<scheme>://localhost/<path>` 再交给 handler，与 wry 行为对齐。
- `WindowBuilder::owner` / `parent` 通过创建后的 `SetWindowLongPtrW(GWLP_HWNDPARENT)` /
  `SetParent` 尽力实现（CEF Views 不暴露创建参数）；kabegame 当前无调用方。
  `shadow` 无运行时等价物，no-op。不设置 AppUserModelID（与 tauri-runtime-wry 对齐，
  由安装器快捷方式承载）。

## 开发与校验

`tauri-runtime-cef` crate 本身就是 CEF 后端，不再需要额外 backend feature：

```bash
CEF_PATH=... cargo check -p tauri-runtime-cef
```

`cef-rs` 默认下载对应的官方预编译 CEF（**不含 H.264/AAC**）；必须设置 `CEF_PATH` 指向自编运行时目录（见 `.cursor/rules/cef-path-set.mdc`）。构建脚本回退约定：Linux `~/i/cef-{dev,prod}`，Windows `H:\cef-{dev,prod}`，macOS `/Volumes/KIOXIA/cef-{dev,prod}`（`scripts/plugins/mode-plugin.ts`）。

Windows 构建 `libcef_dll_wrapper` 需要 cmake + ninja + MSVC；cef-dll-sys 的 build.rs 会把整个 CEF runtime 拷进 `target/{debug,release}/`，dev 运行免手工拷贝。

CEF 是多进程运行时。`dispatch_cef_subprocess()` 必须在 Tauri Builder 前调用：若本进程是 CEF 以 `--type=` re-exec 的子进程则 `execute_process` 后退出，否则初始化 browser。单 binary 部署下不再需要旁路 `*-cef-helper` 可执行文件；macOS 额外完成 CefAppProtocol NSApplication 的早期初始化。

## Example / demo

历史上 `cef-example` 与 `kabegame-cef-helper` 用于在不接入 Tauri 的情况下验证 CEF 链路。当前推荐单 binary：主程序 `main` 最早期调用 `dispatch_cef_subprocess()`，`browser_subprocess_path` 指向自身。`run_cef_subprocess()` 仍保留，仅兼容旧的独立 helper binary。

macOS 适配的硬性要点(实测踩坑,移植主 runtime 时同样适用):

1. **构建期直链框架**:cef-dll-sys(`third/cef-rs` fork)在 macOS 直接链接 framework 二进制,dyld 按 LC_LOAD_DYLIB(install_name `@executable_path/../Frameworks/...`)在 `main` 前加载。dev 裸跑依赖 `target/Frameworks` 符号链接(build.rs 自动创建/校正指向 `$CEF_PATH`);切换 `CEF_PATH` 会触发 cef-dll-sys 重跑并更新链接。历史上的运行时 `LibraryLoader` 加载顺序坑(先调 CEF API → SIGSEGV 跳零地址)已随直链消失。
2. **helper 变体改写已被 patch 豁免**:stock Chromium 在 bundled 状态下按子进程类型改写路径找 `<name> Helper (Renderer).app` 等 5 个 `.app` 变体,变体缺失时 renderer **静默失败**(初始导航 `ERR_ABORTED`、黑屏无日志)。`third/cef` 的 `kabegame_flat_subprocess_path` patch 让显式 `browser_subprocess_path` 对所有子进程类型原样生效,单一扁平 `kabegame-cef-helper` 即可;dev 裸跑(非 bundled)时 stock CEF 本就不改写,不依赖该 patch。
3. **CefAppProtocol NSApplication**:`cef_initialize` 前必须用实现 `CrAppProtocol`/`CrAppControlProtocol`/`CefAppProtocol`(binding 在 `cef::application_mac`)的 NSApplication 子类创建 shared application(cefsimple 的 `SimpleApplication` 等价物),否则窗口无标题栏按钮、事件循环异常。协议类由 libcef 注册,直链模式下 dyld 已在 `main` 前加载 libcef,无时序约束。
4. **framework_dir_path 与符号链接**:`target/Frameworks`(dev)是符号链接,`Settings.framework_dir_path` 必须显式设为 canonicalize 后的真实路径,与 dyld 实际加载路径一致;留空或不一致会导致 GPU 合成黑屏(JS/输入正常、画面全黑)。发布打包时框架整份拷入 bundle 则无此问题。
5. **裸跑 exe 的 Info.plist**:`kabegame/build.rs` 按 binary 分别嵌入主程序/example plist 与带 `LSUIElement` 的 helper plist(`-sectcreate __TEXT __info_plist`);bundle id 一致性见第 6 点。
6. **MachPortRendezvous 的 bundle id 一致性**(实测踩坑,症状是窗口壳正常但内容全空/黑屏):Chromium 子进程通过 bootstrap 服务 `<BaseBundleID>.MachPortRendezvousServer.<browser pid>` 从 browser 拿 Mojo/共享内存句柄;不一致时子进程 `bootstrap_look_up ... Unknown service name (1102)`、起来即退、"Network service crashed" 循环。**browser 注册名与子进程查找名必须完全相同**,而这个 id 有四处来源,全部必须等于 `tauri.conf.json.handlebars` 的桌面 `identifier`(当前 `Kabegame`,也即 release `.app/Contents/Info.plist` 的 `CFBundleIdentifier`,是 release 下 browser 的注册名):
   - `kabegame/macos/embedded-Info.plist`(主程序 / example 裸跑内嵌 plist);
   - `kabegame/macos/kabegame-cef-helper-Info.plist`(helper 内嵌 plist;**实测子进程即使位于 `.app` 内也优先取内嵌 `__info_plist` 而非 bundle 的 Info.plist**,这是 release 黑屏的直接原因);
   - `runtime.rs` 的 `macos_unbundled_main_bundle` 生成的 `<exe>/kabegame-main-bundle/Contents/Info.plist`(仅裸跑,配合 `settings.main_bundle_path` 令 browser 注册名对齐);
   - 上述 tauri 桌面 `identifier` 本身。

   改动 identifier 时四处同步。dev 裸跑与 release bundled 走的注册名来源不同(前者是生成的 main-bundle,后者是 `.app` 的 Info.plist),但只要四者同值即两条路径都成立。

另:dev 下追加 `use-mock-keychain` 开关,避免 Chromium Safe Storage 初始化弹系统 Keychain 密码框。example 仍使用 CEF 自持 `run_message_loop`；主 runtime 已实现 CefAppProtocol NSApplication external pump。

cef-rs `wrap_window_delegate!` 的宏默认值坑(未实现的方法一律返回 0):macOS 上 `with_standard_window_buttons` 默认 0 → 窗口没有红绿灯;`can_resize`/`can_maximize`/`can_minimize` 默认 0 → 绿灯置灰、窗口不可缩放。Views 窗口 delegate 需要显式实现这些方法返回 1。

## 打包

- **Linux**：`bin/linux/` 收集 `libcef.so` + 资源 + locales 白名单，注入 deb 到 `/usr/lib/kabegame/`（见 `cocs/build/PLATFORM_SHARED_LIBS.md`）。
- **Windows**：`scripts/plugins/os-plugin.ts` 的 `collectWindowsCefRuntime()` 把 `WINDOWS_CEF_RUNTIME_FILES` + locales 白名单收进 `src-tauri/kabegame/resources/cef/`，随 `resources/**/*` 进 NSIS 安装包；`nsis/installer-hooks.nsh` 的 POSTINSTALL 再把它们搬到 `$INSTDIR`（exe 同目录）与 `$INSTDIR\locales\`。
- **macOS dev**：`bun dev -c kabegame` 的 ComponentPlugin `beforeBuild` 先构建 `kabegame-cef-helper`，再直接运行裸 `target/debug/kabegame`。CEF framework 经 `target/Frameworks` 符号链接由 dyld 解析，helper 在同目录。
- **macOS release**：Tauri 在打 dmg 前通过原生 `macOS.frameworks` 注入 CEF framework 到 `Contents/Frameworks/`，`macOS.files` 把单一扁平 `kabegame-cef-helper` 放进 `Contents/MacOS/`；扁平 helper 依赖含 `kabegame_flat_subprocess_path` patch 的 CEF 构建。

## CEF 依赖与 patch(`third/cef-rs`、`third/cef`)

`cef-rs` 暂时保留 kabegame fork；CEF 源码则直接 pin 官方上游，Kabegame 分歧以编号 patch series 独立维护：

- **`third/cef-rs`**(kabegame/cef-rs,分支 `kabegame-149`,基于 tag `cef-dll-sys-v149.0.0+149.0.2`):
  cef-dll-sys 在 macOS 改为构建期直链 framework(`rustc-link-lib=framework`)、
  创建/校正 `target/Frameworks` 符号链接、提供 no-op `cef_load_library` stub、
  不再跑 cmake 编 `cef_dll_wrapper`。根 `Cargo.toml` 以
  `[patch.crates-io] cef-dll-sys = { path = "third/cef-rs/sys" }` 接入,
  `cef` crate 本体仍来自 crates.io。Linux/Windows 行为不变。
- **`third/cef`**直接跟随官方 `chromiumembedded/cef` 的 `7827` 分支，pin 在
  `0d0eeb611`（Chromium 149.0.7827.201）。Kabegame 的改动位于
  `third-patches/cef/0001-flat-subprocess-path.patch`：它向 CEF patch 配置加入
  `kabegame_flat_subprocess_path`，令 `ChildProcessHost::GetChildPath()` 读到显式
  `--browser-subprocess-path` 时原样返回，跳过 macOS helper `.app` 变体改写。
  **只影响 release(bundled)**；dev 裸跑不依赖。

`scripts/build-chromium.sh` 在构建前以仓库内 `third/cef` 为本地源码引用:
把它的路径和当前提交分别传给 `automate-git.py --url` / `--checkout`。首次或
`--clean` 构建会从该引用创建 `cefbuild/chromium_git/cef`，增量构建会把已有
checkout 的 origin 校正到该引用、同步当前提交，并由 CEF 标准 patch 流程将
`kabegame_flat_subprocess_path` 应用到 Chromium 源码。构建前需初始化子模块并手动
应用 Kabegame patch series：

```bash
git submodule update --init third/cef
bun run patch cef
scripts/build-chromium.sh dev
scripts/build-chromium.sh prod
```

升级 CEF 大版本时：cef-rs fork 从新的 `cef-dll-sys-v<ver>` tag 重建分支并
cherry-pick 直链 commit；CEF 源码先以 `bun run patch cef -r` 还原，再 bump 官方上游
pin，最后按 `third-patches/cef/README.md` 修复并重新生成 patch series。

## 当前限制

- CEF Views 对部分 Tauri window API 没有等价能力；运行时对这些 API 返回保守值或 no-op。
- Linux CEF 窗口固定采用 X11/ANGLE GL 配置；原生 Wayland 路径尚未接入。
- Windows 下 tauri `theme` 恒报 Light；`shadow` / `drag_and_drop` 为 best-effort。
