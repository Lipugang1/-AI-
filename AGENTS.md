# AGENTS.md — 三合一管理系统

## 项目概述

三合一管理系统是一个统一的管理平台，整合了三个遗留系统：
- **隐患提报** — 安全隐患排查、上报、治理跟踪
- **智能晨会** — 每日晨会记录与培训管理
- **器材巡查** — 消防器材日常巡查与状态管理

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14.2 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS v3 + shadcn/ui |
| 后端 | Next.js API Routes |
| 数据库 | MySQL 8.0 (mysql2/promise) |
| 认证 | JWT (jsonwebtoken) |
| AI | MiMo v2.5 (OpenAI 兼容格式) |
| 语音 | 硅基流动 TeleSpeech ASR |

## 目录结构

```
app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根布局 (viewport meta)
│   │   ├── globals.css             # 全局样式 + shadcn CSS变量
│   │   ├── login/                  # 登录页
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Dashboard布局 (sidebar + main)
│   │   │   ├── page.tsx            # 首页仪表盘
│   │   │   ├── hazards/            # 隐患提报模块
│   │   │   ├── equipment/          # 器材巡查模块
│   │   │   ├── meetings/           # 智能晨会模块
│   │   │   ├── analytics/          # 数据分析
│   │   │   ├── admin/              # 系统管理
│   │   │   └── risk-database/      # 风险数据库
│   │   └── api/                    # API路由
│   │       ├── auth/               # 认证API
│   │       ├── hazards/            # 隐患API
│   │       ├── inspection/         # 巡查API
│   │       ├── meeting/            # 晨会API
│   │       ├── departments/        # 部门API
│   │       ├── teams/              # 班组API
│   │       ├── warehouses/         # 仓库API
│   │       ├── analytics/          # 数据分析API
│   │       └── admin/              # 管理API
│   ├── components/
│   │   ├── dashboard-sidebar.tsx    # 侧边栏 (支持移动端折叠)
│   │   ├── dashboard-layout-client.tsx  # 响应式布局客户端组件
│   │   ├── DepartmentSelector.tsx   # 部门选择器
│   │   └── ui/                     # shadcn/ui 组件
│   ├── lib/
│   │   ├── auth.ts                 # JWT认证 + 权限工具
│   │   └── db.ts                   # MySQL连接池
│   └── hooks/                      # React hooks
├── server.mjs                      # 自定义服务器 (WebSocket支持)
├── tailwind.config.js
├── next.config.js
└── package.json
```

## 关键约定

### API 响应格式
```typescript
// 成功
{ success: true, data: {...} }
// 失败
{ success: false, error: "错误信息" }
```

### 认证
- 所有 API 请求需要 `auth_token` cookie
- 前端 fetch 必须带 `credentials: 'include'`
- JWT payload 包含: id, username, role, department_id, team_id

### 权限模型
- `admin`: 可看所有数据，无部门限制
- `reviewer`: 可审核隐患
- `inspector`: 普通排查员，只能看本部门数据

### 数据库
- Charset: utf8mb4
- 连接池: 10 connections max
- 表名前缀: 无，直接使用业务名称
- 时间字段: datetime 类型，格式 YYYY-MM-DD HH:mm:ss

### 移动端适配
- 侧边栏在 `<lg` 屏幕默认隐藏，点击汉堡菜单展开
- Viewport meta: width=device-width, initialScale=1
- 响应式类名: 使用 Tailwind `sm:` `md:` `lg:` 断点
- 表格使用 `overflow-x-auto` 包装

## 开发命令

```bash
# 开发模式 (不推荐，动态路由有Jest worker bug)
npm run dev

# 生产构建 + 启动 (推荐)
npm run build && npm start

# WebSocket模式
node server.mjs
```

## 环境变量 (.env.local)

```env
DB_HOST=10.214.88.95
DB_USER=sanheyi
DB_PASSWORD=sanheyi2024
DB_NAME=sanheyi
DB_PORT=3306
JWT_SECRET=sanheyi_super_secret_key_2024_!@#$%^&*()
AI_API_BASE=https://api.xiaomimimo.com/v1
AI_API_KEY=sk-xxx
AI_VISION_MODEL=mimo-v2.5
AI_TEXT_MODEL=mimo-v2.5
```

## 已知问题

1. Next.js 14.2 在 Windows dev 模式下动态路由 `[id]` 存在 Jest worker 崩溃 bug，必须用 `next build + next start`
2. package-lock.json 频繁变更，建议不提交到 Git
3. GitHub 在企业网络下需要代理访问
