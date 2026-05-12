# Echo Games · 公共资源目录

本目录存放所有 H5 小游戏共享的库和模板，供 `frontend/public/games/` 下的子游戏（包括 LLM 生成的游戏）公共引用，避免每个游戏都重复打包重型框架。

## 目录结构

```
_shared/
├── README.md           ← 本文档
└── phaser/
    ├── phaser.min.js   ← Phaser 4.1.0（H5 游戏首选框架）
    └── template.html   ← 游戏开发模板（含场景、生命周期、存档桥接）
```

## 引用方式

### 1. 落盘到 `frontend/public/games/<游戏名>/index.html` 的游戏

使用相对路径引用：

```html
<script src="../_shared/phaser/phaser.min.js"></script>
```

也可以使用绝对路径（推荐，可避免 srcdoc / iframe 嵌入差异）：

```html
<script src="/games/_shared/phaser/phaser.min.js"></script>
```

### 2. 生成器预览模式（srcdoc 内联 HTML）

由于 srcdoc iframe 与父页同源（`allow-same-origin`），同样可以使用绝对路径：

```html
<script src="/games/_shared/phaser/phaser.min.js"></script>
```

> ⚠️ 严禁通过 CDN（cdn.jsdelivr.net、unpkg.com 等）拉取 Phaser，离线环境会直接失败。本地引用即可。

## 与 Echo 主应用的桥接（可选）

游戏宿主页面 `frontend/src/pages/game/play.vue` 通过 `postMessage` 与 iframe 内的游戏交互：

| 主应用 → 游戏 | 含义 |
|---|---|
| `{ source: '<game>-host', type: 'switch-screen', screen }` | 切换顶部 Tab 时通知 |
| `{ source: '<game>-host', type: 'request-state' }` | 请求当前界面状态回报 |
| `{ source: '<game>-host', type: 'save-now', requestId }` | 离开页面前要求落盘存档 |

| 游戏 → 主应用 | 含义 |
|---|---|
| `{ source: '<game>-game', type: 'screen', screen }` | 当前激活的内部页签 |
| `{ source: '<game>-game', type: 'save-complete', requestId, ok }` | 存档完成回执 |
| `{ type: 'game-back' }` | 请求宿主返回上一级 |

存档键名约定：`echo_game_<game>_settings` 与 `echo_game_<game>_save`。

## Phaser 4 上手要点

- 通过 `new Phaser.Game(config)` 启动；推荐 `Phaser.Scale.FIT` + `Phaser.Scale.CENTER_BOTH` 实现移动端自适应。
- 资源加载在 `Scene.preload`，构建在 `Scene.create`，每帧逻辑写到 `Scene.update`。
- 多场景流程使用 `this.scene.start(key, data)`、`this.scene.launch(key)`。
- 输入兼容：`pointerdown`/`pointerup` 同时支持鼠标与触摸；可叠加 `setInteractive({ useHandCursor: true })`。
- 移动端默认禁用页面滚动：`<body style="touch-action:none; overscroll-behavior:none">`。
- 离线优先：所有资源使用 dataURI、`Phaser.Textures.Generate`、纯色矩形或代码绘制（`Graphics`），避免外网 fetch。

详见 `phaser/template.html`。
