# 相 - AI 角色聊天移动应用

> 一款开源单机版 AI 角色聊天移动应用

## 项目简介

"相"是一款基于 UniApp + Vue 3 + TypeScript 开发的 AI 角色聊天移动应用，支持文字、图片、语音多模态交互，所有数据存储在本地。

## 技术栈

- **前端框架**: UniApp + Vue 3 + TypeScript
- **状态管理**: Pinia
- **本地存储**: uni.storage
- **构建工具**: Vite

## 功能特性

### 模块 1 - 角色管理
- ✅ 角色列表展示（支持搜索、筛选、收藏）
- ✅ 角色创建（名称、头像、背景、描述、开场白、总体设定）
- ✅ 角色编辑
- ✅ 角色详情查看
- ✅ 角色删除
- ✅ 收藏/取消收藏

## 项目结构

```
xiang-app/
├── src/
│   ├── pages/              # 页面目录
│   │   └── character/      # 角色管理页面
│   │       ├── list.vue    # 角色列表
│   │       ├── detail.vue  # 角色详情
│   │       └── edit.vue    # 角色编辑
│   ├── components/         # 公共组件
│   │   ├── CharacterCard/  # 角色卡片组件
│   │   └── EmptyState/     # 空状态组件
│   ├── stores/             # 状态管理
│   │   └── character.ts    # 角色状态管理
│   ├── services/           # 业务服务
│   │   ├── storage.ts      # 存储服务
│   │   └── character.ts    # 角色服务
│   ├── types/              # 类型定义
│   │   └── character.ts    # 角色类型
│   ├── entity/             # 实体类
│   │   └── character.ts    # 角色实体
│   ├── utils/              # 工具函数
│   │   └── uuid.ts         # UUID 生成
│   ├── App.vue             # 应用根组件
│   ├── main.ts             # 应用入口
│   ├── pages.json          # 页面配置
│   └── manifest.json       # 应用配置
├── package.json            # 依赖配置
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行项目

```bash
# H5 开发
npm run dev:h5

# App 开发
npm run dev:app
```

### 3. 构建项目

```bash
# H5 构建
npm run build:h5

# App 构建
npm run build:app
```

## 开发规范

- 使用 Vue 3 Composition API
- 使用 TypeScript 进行类型定义
- 遵循 UniApp 开发规范
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case

## 文档

- [需求规格说明书](../docs/需求规格说明书.md)
- [概要设计说明书](../docs/概要设计说明书.md)
- [详细设计说明书](../docs/详细设计说明书.md)

## 许可证

MIT License
