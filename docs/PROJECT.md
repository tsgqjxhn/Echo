# Echo — AI 角色互动叙事平台

> **一句话介绍**：Echo 是一个移动端 AI 角色聊天应用，将 AI 对话、互动剧情、多媒体内容（图片/语音/视频）和小游戏融合为一体，让玩家沉浸在像"真实通讯"般的角色关系空间中。

---

## 这是什么项目？

Echo 是一个 **AI 角色互动叙事平台**，包含：

| 能力 | 说明 |
|------|------|
| **AI 角色聊天** | 用户与 AI 驱动的虚拟角色进行自然对话，支持流式输出、上下文记忆、多轮对话 |
| **互动剧情** | 支持外部导入互动剧情，含分支选择、死亡回溯、线索解锁、图鉴收集 |
| **多媒体内容** | 角色头像、场景图鉴、朋友圈动态、语音消息、视频片段 |
| **H5 小游戏** | 剧情内嵌入的互动小游戏 |
| **角色管理** | 创建/编辑/收藏多个角色，每个角色有独立的提示词、性格、记忆 |
| **数据管理** | 聊天记录导入导出、数据存档、跨端运行 |

当前版本不再内置具体剧情内容，项目架构仍支持承载多个角色和多个故事。

---

## 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| **Vue 3** + TypeScript | UI 框架 |
| **Pinia** | 状态管理 |
| **Vue Router** | 页面路由 |
| **Capacitor** | 跨端打包（Android） |
| **Vite** | 构建工具 |
| **Sass** | 样式 |
| **localStorage** | 本地数据存储 |

### 后端

| 技术 | 用途 |
|------|------|
| **Python FastAPI** | API 服务 |
| **SQLAlchemy** | 数据库 ORM |
| **Uvicorn** | ASGI 服务器 |
| **httpx** | 异步 HTTP 客户端 |
| **pydantic-settings** | 配置管理 |

### AI 与外部服务

| 能力 | 实现方式 |
|------|---------|
| LLM 对话 | 前端直连 / 后端代理，支持多提供商配置（OpenAI 兼容接口） |
| TTS 语音合成 | 后端 `tts_service` / 前端 `tts.ts` |
| STT 语音识别 | 后端 `stt_service` / 前端 `stt.ts` |
| 图片生成 | 前端 `image-gen.ts` |
| 视频生成 | 前端 `video-gen.ts` |
| 语义记忆 | 前端 `embedding.ts` + `semantic-memory.ts` |

---

## 项目结构

```
Echo/
├── frontend/                  # 前端应用（Vue 3 + Capacitor）
│   ├── src/
│   │   ├── pages/             # 页面
│   │   │   ├── character/     #   角色管理（列表/创建/编辑/详情/预览）
│   │   │   ├── chat/          #   聊天页面
│   │   │   ├── history/       #   历史记录
│   │   │   ├── favorites/     #   收藏
│   │   │   ├── liked/         #   点赞
│   │   │   ├── moments/       #   朋友圈动态
│   │   │   ├── dialogue/      #   剧情对话流
│   │   │   ├── game/          #   游戏中心（面板/设置/生成/游玩）
│   │   │   └── settings/      #   设置（用户信息/API配置/全局提示词/语音/导出）
│   │   ├── components/        # 可复用组件
│   │   │   ├── MessageBubble/ #   消息气泡（文本/图片/语音/系统事件）
│   │   │   ├── ChatInput/     #   聊天输入栏
│   │   │   ├── CharacterCard/ #   角色卡片
│   │   │   ├── CharacterForm/ #   角色编辑表单
│   │   │   ├── ImageViewer/   #   图片查看器（缩放/拖拽）
│   │   │   ├── StoryGallery/  #   剧情图鉴画廊
│   │   │   ├── GameCard/      #   游戏卡片
│   │   │   ├── VoicePlayer/   #   语音播放器
│   │   │   ├── VoiceRecorder/ #   语音录制器
│   │   │   ├── TabBar/        #   底部导航栏
│   │   │   └── Loading/       #   加载状态
│   │   ├── services/          # 核心服务层
│   │   │   ├── chat.ts        #   聊天引擎（消息收发/流式输出/上下文组装）
│   │   │   ├── llm-api.ts     #   LLM API 调用
│   │   │   ├── prompt-assembler.ts  # 提示词拼接（corePrompt → globalPrompt → character → memory）
│   │   │   ├── chat-memory.ts #   聊天记忆管理
│   │   │   ├── semantic-memory.ts   # 语义记忆（向量检索）
│   │   │   ├── context-manager.ts   # 上下文窗口管理
│   │   │   ├── character.ts   #   角色 CRUD
│   │   │   ├── story-api.ts   #   剧情 API
│   │   │   ├── story-assets.ts      # 剧情素材管理
│   │   │   ├── story-gallery.ts     # 图鉴系统
│   │   │   ├── image-gen.ts   #   AI 图片生成
│   │   │   ├── video-gen.ts   #   AI 视频生成
│   │   │   ├── tts.ts         #   语音合成
│   │   │   ├── stt.ts         #   语音识别
│   │   │   ├── native-speech.ts     # 原生语音能力
│   │   │   ├── native-chat-stream.ts    # 原生流式聊天
│   │   │   ├── lorebook.ts    #   世界书/设定集
│   │   │   ├── game.ts        #   游戏引擎
│   │   │   ├── export.ts      #   数据导出
│   │   │   └── storage.ts     #   存储抽象层
│   │   ├── stores/            # Pinia 状态管理
│   │   │   ├── chat.ts        #   聊天状态
│   │   │   ├── character.ts   #   角色状态
│   │   │   ├── user.ts        #   用户状态
│   │   │   ├── settings.ts    #   设置状态
│   │   │   ├── moments.ts     #   朋友圈状态
│   │   │   ├── game.ts        #   游戏状态
│   │   │   └── game-generation.ts   # 游戏生成状态
│   │   ├── types/             # TypeScript 类型定义
│   │   ├── entity/            # 实体模型
│   │   ├── styles/            # 全局样式
│   │   └── utils/             # 工具函数
│   └── android/               # Android 原生工程
│
├── backend/                   # 后端服务（Python FastAPI）
│   ├── app/
│   │   ├── api/routes/        # API 路由
│   │   │   ├── chat.py        #   聊天接口
│   │   │   ├── characters.py  #   角色接口
│   │   │   ├── story.py       #   剧情接口
│   │   │   ├── sessions.py    #   会话接口
│   │   │   ├── tts.py         #   语音合成接口
│   │   │   ├── stt.py         #   语音识别接口
│   │   │   ├── files.py       #   文件接口
│   │   │   ├── user.py        #   用户接口
│   │   │   ├── configs.py     #   配置接口
│   │   │   ├── import_export.py     # 导入导出接口
│   │   │   └── health.py      #   健康检查
│   │   ├── models/            # 数据库模型
│   │   ├── schemas/           # Pydantic 数据模式
│   │   ├── services/          # 业务逻辑
│   │   │   ├── llm_service.py #   LLM 调用
│   │   │   ├── tts_service.py #   语音合成
│   │   │   ├── stt_service.py #   语音识别
│   │   │   ├── story_service.py     # 剧情处理
│   │   │   ├── story_parser.py      # 剧情脚本解析
│   │   │   ├── file_service.py      # 文件管理
│   │   │   └── export_service.py    # 数据导出
│   │   └── core/              # 核心配置
│   │       ├── config.py      #   应用配置
│   │       └── database.py    #   数据库连接
│   └── storage/               # 文件存储目录
│
└── docs/                      # 项目文档
    ├── PROJECT.md             #   本文件 — 项目总览
    └── game-phaser-migration-plan.md
```

---

## 核心架构设计

### 提示词组装顺序

聊天时的系统提示词按以下顺序拼接：

```
corePrompt（底层规范） → globalPrompt（全局提示词） → character.settings（角色设定） → memory（记忆摘要）
```

- `corePrompt`：在 `frontend/src/pages/settings/global-prompt.vue` 的"软件底层规范提示词"标签页设置
- `globalPrompt`：在 `frontend/src/pages/settings/global-prompt.vue` 的"全局提示词"标签页设置
- `character.settings`：在 `frontend/src/pages/character/edit.vue` 的"整体设定"字段设置
- `memory`：由 `chat-memory.ts` 自动生成，包含长期记忆和对话摘要

### 聊天消息流

```
用户输入 → ChatInput 组件
         → chat.ts 消息处理
         → prompt-assembler.ts 组装上下文
         → llm-api.ts / native-chat-stream.ts 调用 AI
         → 流式输出到 MessageBubble 组件
         → chat-memory.ts 更新记忆
```

### 数据存储策略

- **前端**：localStorage 存储角色、聊天记录、用户设置等（通过 `storage.ts` 抽象层）
- **后端**：SQLite 数据库（通过 SQLAlchemy ORM）
- **文件**：后端 `storage/` 目录存放上传的图片、音频等文件

---

## 底部导航（TabBar）

| 标签 | 页面 | 功能 |
|------|------|------|
| 角色 | `pages/character/list` | 角色列表、创建、管理 |
| 历史 | `pages/history/history` | 聊天会话历史记录 |
| 收藏 | `pages/favorites/favorites` | 收藏的消息/内容 |
| 设置 | `pages/settings/settings` | 用户信息、API配置、提示词、语音、数据管理 |

---

## 主要功能模块

### 1. 角色系统
- 创建/编辑/删除角色
- 角色卡片展示（头像、简介、标签）
- 角色详情页（完整资料、剧情入口）
- 角色收藏与点赞
- AI 辅助生成角色设定

### 2. 聊天系统
- 自由聊天：与 AI 角色自然对话
- 剧情聊天：按脚本推进互动故事
- 流式输出：AI 回复实时显示
- 多消息类型：文本、图片、语音、系统事件
- 会话管理：多会话切换、历史记录
- 上下文记忆：短期对话 + 长期语义记忆

### 3. 剧情系统
- 60 天主线剧情（10 卷 × 6 天）
- 分支选择影响剧情走向
- 死亡/回溯机制
- 线索解锁与图鉴收集
- 系统事件（头像切换、名字变更、朋友圈发布等）

### 4. 多媒体系统
- 图片查看器（缩放、拖拽、画廊浏览）
- 语音消息（录制、播放、TTS 合成、STT 识别）
- 视频生成与播放
- AI 图片生成
- 朋友圈动态发布与浏览

### 5. 游戏系统
- H5 小游戏嵌入剧情
- 游戏中心面板
- 游戏设置与生成

### 6. 设置系统
- 用户信息管理
- API 配置（支持多 LLM 提供商）
- 全局提示词与底层规范提示词
- 语音设置（TTS/STT 供应商与音色）
- 数据导入/导出
- 存储管理

---

## 后端 API 路由

| 路由模块 | 路径前缀 | 功能 |
|---------|---------|------|
| `chat.py` | `/api/chat` | AI 对话、流式聊天 |
| `characters.py` | `/api/characters` | 角色 CRUD |
| `story.py` | `/api/story` | 剧情数据与脚本 |
| `sessions.py` | `/api/sessions` | 聊天会话管理 |
| `tts.py` | `/api/tts` | 语音合成 |
| `stt.py` | `/api/stt` | 语音识别 |
| `files.py` | `/api/files` | 文件上传/下载 |
| `user.py` | `/api/user` | 用户管理 |
| `configs.py` | `/api/configs` | 配置管理 |
| `import_export.py` | `/api/import-export` | 数据导入导出 |
| `health.py` | `/api/health` | 服务健康检查 |

---

## 当前状态与开发路线

### 已完成
- ✅ 角色管理（CRUD、卡片、详情、收藏）
- ✅ 聊天引擎（自由聊天、流式输出、多消息类型）
- ✅ 剧情系统基础（脚本解析、事件渲染、分支选择）
- ✅ 提示词系统（全局/角色/记忆分层组装）
- ✅ 多媒体基础（图片查看、语音录制/播放、TTS/STT）
- ✅ 设置系统（API 配置、语音设置、数据导出）
- ✅ Android 打包（Capacitor）
- ✅ 后端 API（角色、聊天、剧情、文件、语音等）

### 进行中 / 待完善
- 🔄 图片缩放、画廊与头像弹窗优化
- 🔄 历史记录时间显示优化
- 🔄 离开聊天页面后 AI 回复持久化
- ⏳ 朋友圈动态系统完善
- ⏳ H5 小游戏系统完善
- ⏳ AI 图片/视频生成完善
- ⏳ 语义记忆系统完善
- ⏳ 多角色多剧情扩展

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [PROJECT.md](./PROJECT.md) | 本文件 — 项目总览 |

---

## 快速开始

### 前端开发

```bash
cd frontend
npm install
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
```

### 后端开发

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Android 打包

```bash
cd frontend
npm run build
npx cap sync
npx cap open android
```

---

*最后更新：2025年*
