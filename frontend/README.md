# Echo 前端

Vue 3 + TypeScript + Vite + Capacitor（Android）本地优先 AI 角色聊天应用。

完整说明见仓库根目录 [README.md](../README.md) 与 [docs/PROJECT.md](../docs/PROJECT.md)。

## 技术栈

- Vue 3、Vue Router、Pinia
- Vite 5、TypeScript、Sass
- Capacitor 8（Android 打包）
- localStorage 本地存储

## 快速开始

```bash
cp .env.example .env
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # 生产构建
npm run typecheck    # 类型检查
npm test             # 单元测试
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 后端 API 地址（默认 `http://127.0.0.1:8000`） |
| `VITE_LLM_*` | 可选：内置默认文本模型（开发用） |

## Android

```bash
npm run build
npx cap sync android
npx cap open android
```

## 目录

- `src/pages/` — 页面
- `src/components/` — 组件（含 `CharacterForm/` 卡片化表单）
- `src/services/` — 业务服务
- `src/stores/` — Pinia 状态
