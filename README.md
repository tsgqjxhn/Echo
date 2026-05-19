# Echo

AI 角色互动叙事平台（Vue 3 + Capacitor 前端，FastAPI 后端）。

## 文档

- [项目总览](docs/PROJECT.md)
- [角色创建词条](docs/角色创建词条.md)

## 快速开始

### 前端

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 后端

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 质量检查

```bash
# 前端
cd frontend && npm run typecheck && npm test && npm run build

# 后端
cd backend && pytest -q
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 前端连接的后端地址（默认 `http://127.0.0.1:8000`） |
| `API_TOKEN` | 可选；设置后后端 API 需 `Authorization: Bearer <token>` |

详见 `frontend/.env.example` 与 `backend/.env.example`。

## 许可证

MIT — 见 [LICENSE.txt](LICENSE.txt)
