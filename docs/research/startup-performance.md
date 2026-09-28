> 研究依据：保留研究时点的结论与限制；当前实施范围以 [首版规格](../specs/first-release.md) 为准。文中“当前环境”等描述指研究当时。

# Godot 4 启动性能调研

范围：仅依据 Godot 官方文档与 Godot 官方源码仓库；不修改项目文件，也未运行项目。结论针对“开机启动很慢”和启动画面设计。

## 结论摘要

- 先区分两类等待：引擎初始化/渲染器与 shader pipeline 编译发生在主场景可见前；主场景及依赖资源加载则属于项目自己的场景加载。自定义启动场景只能覆盖后者，不能消除前者。
- 启动场景应尽量小。对较重的主场景，启动场景中使用 `ResourceLoader.load_threaded_request()`，每帧轮询 `load_threaded_get_status()`，完成后再调用 `load_threaded_get()`；如果过早调用 `load_threaded_get()`，调用线程仍会阻塞。
- Forward+/Mobile 在 Godot 4.4 起使用 ubershader 与加载时 pipeline 预编译来减少首次绘制卡顿；Godot 4.5 起可在导出时 bake shader，以缩短首次启动时间。它们主要影响 shader/pipeline 成本，不会替代场景拆分和异步资源加载。
- 导入资源应在编辑器/导出流程中完成；运行时应通过 `ResourceLoader` 使用已导入资源。不要把大型原始资源或不必要的依赖全部挂到启动场景上。
- Splash 的职责是遮盖不可避免的引擎初始化并立即给出反馈。应使用原生 Boot Splash 的静态 PNG 与合适背景色；`minimum_display_time` 不宜设置过高，否则会人为增加启动时间。动画可放在引擎启动后的轻量启动场景，但它本身不是加速手段。

## 按问题拆解

### 1. 场景加载：同步与异步

Godot 文档明确说明，普通 `ResourceLoader.load()`/GDScript `load()` 会阻塞调用线程；后台加载流程是：请求 `load_threaded_request()`，在后续帧检查 `load_threaded_get_status()`（可读取进度），状态为完成后再取得资源。官方 API 还提醒，未完成时调用 `load_threaded_get()` 会阻塞，因此不能把“请求”和“取得”放在同一帧。

实务建议：启动场景只保留背景、logo、进度/状态文本和加载器；不要在启动场景脚本中同步 `load()` 主界面、字体包、大图集或大量工具脚本。使用 `use_sub_threads = true` 前应在目标平台验证，因为官方 API 说明它可能更快但也可能影响主线程。

来源：

- [Background loading](https://docs.godotengine.org/en/4.4/tutorials/io/background_loading.html)
- [ResourceLoader API（Godot 4.6）](https://docs.godotengine.org/en/4.6/classes/class_resourceloader.html)
- [Godot ResourceLoader 源码](https://github.com/godotengine/godot/blob/master/core/io/resource_loader.cpp)

### 2. `preload()`、`load()` 与场景结构

`preload()` 会在脚本加载时尽早加载资源，适合稳定且确实需要的轻量依赖；它也可能把不可预期的加载成本前置到脚本初始化。`load()` 是运行到语句时才加载，放在敏感路径中可能造成卡顿。官方建议根据资源何时需要来选择，而不是把所有内容都 `preload()`。

场景使用 `PackedScene` 让引擎批量处理序列化对象；应把可延迟进入的界面/模块拆成独立场景，避免一个根场景递归携带全部资源。启动路径只保留必要依赖，其余模块在真正需要时异步加载。

来源：

- [Logic preferences: loading vs. preloading](https://docs.godotengine.org/en/4.6/tutorials/best_practices/logic_preferences.html)
- [When to use scenes versus scripts](https://docs.godotengine.org/en/4.6/tutorials/best_practices/scenes_versus_scripts.html)
- [ResourcePreloader](https://docs.godotengine.org/en/4.6/classes/class_resourcepreloader.html)

### 3. Shader / pipeline 编译

首次运行、驱动更新或 shader cache 失效后，shader/pipeline 编译可能造成启动变慢或首次绘制卡顿。Godot 4.4 起，Forward+ 和 Mobile 会在资源加载、节点加入场景等时机识别并预编译所需 pipeline；因此动态创建的材质、粒子或渲染特性最好在加载阶段至少实例化一次（必要时用隐藏节点），而不是第一次在游戏过程中出现。

Godot 4.5 起可以在导出时使用 shader baker，把源 shader 烘焙到中间格式，通常可改善首次启动时间，尤其是 Direct3D 12 与 Metal。它不能预先生成依赖具体 GPU/驱动的最终 pipeline，所以不能保证消除所有首次运行成本。

若需要定位成本，可观察 Godot 的 pipeline compilation monitors：Mesh 编译可能增加加载时间，Surface 可能发生在场景实例化的第一帧，Draw 表示运行时按需编译并可能造成游戏中卡顿。

来源：

- [Reducing stutter from shader (pipeline) compilations（Godot 4.6）](https://docs.godotengine.org/en/4.6/tutorials/performance/pipeline_compilations.html)
- [Fixing jitter, stutter and input lag](https://docs.godotengine.org/en/stable/tutorials/rendering/jitter_stutter.html)
- [Performance monitors](https://docs.godotengine.org/en/stable/classes/class_performance.html)
- [Godot troubleshooting: long first startup](https://docs.godotengine.org/en/4.0/about/troubleshooting.html)

### 4. 导入资源与启动依赖

Godot 会把可导入资源转换并保存到项目的隐藏导入目录；运行时资源应通过 Resource Loader 访问。导入参数改变后需要重新导入，删除导入缓存会触发重新导入。由此可得：开发机或首次打开项目时的“导入慢”和玩家运行时的“启动慢”是不同问题；不要用运行时加载策略去解决编辑器重新导入，也不要把原始大资源直接当成启动必需品。

启动性能排查应先列出主场景的直接与递归依赖，特别是大纹理、字体、音频、粒子材质和自动实例化的子场景；再决定哪些应拆分、压缩、延迟或在加载阶段预热。

来源：

- [Import process（Godot 4.0）](https://docs.godotengine.org/en/4.0/tutorials/assets_pipeline/import_process.html)
- [ResourceLoader API（Godot 4.6）](https://docs.godotengine.org/en/4.6/classes/class_resourceloader.html)

### 5. Splash screen 的正确定位

Godot 的 Boot Splash 是引擎级启动画面，支持背景色、PNG、拉伸模式和是否显示图片；图片格式要求为 PNG。`application/boot_splash/minimum_display_time` 只是最短显示时间，官方明确不建议设得过高。它适合尽早显示品牌/反馈，但不会让引擎初始化或 shader 编译更快。

因此，针对本项目“启动慢”的优先级应是：确认启动慢发生在引擎 splash 之前还是之后；缩小启动场景依赖；异步请求主场景并逐帧轮询；检查 shader/pipeline 编译；最后再调整启动画面的动画。动画时长应短且不强制等待资源之外的额外时间。

来源：

- [ProjectSettings Boot Splash properties（Godot 4.6）](https://docs.godotengine.org/en/4.6/classes/class_projectsettings.html)

## 建议的排查顺序

1. 在目标机器/导出版本测量：从进程启动到 Boot Splash、从 Boot Splash 到启动场景、从启动场景到主界面分别耗时多少。
2. 若 Boot Splash 前就慢，优先检查渲染器、首次 shader/pipeline 编译、驱动 cache 与导出配置；不要继续增加启动动画。
3. 若 Boot Splash 后慢，检查启动场景及其递归依赖，移除非必要 `preload()`/同步 `load()`，改为后台加载主场景。
4. 加载完成后观察 pipeline compilation monitors，确认编译发生在加载阶段，而不是主界面第一次显示或交互时。
5. 在低端 CPU/GPU、首次运行、驱动更新后和已建立 cache 的重复运行四种条件下分别比较；不要只用开发机的第二次运行判断结果。

## 对本项目的直接启示

当前需求的关键不是“恢复一个更长的 Godot logo 动画”，而是让 logo 期间并行进行可延迟的主场景资源加载，并避免在动画结束瞬间同步取回未完成的资源。若测得主要等待发生在原生 Boot Splash 之前，则应转向渲染器/shader baker/导出资源检查；若发生在之后，则应优先审查启动场景依赖图和同步加载点。
