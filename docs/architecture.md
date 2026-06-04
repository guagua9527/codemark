# CodeMark 架构设计

## 定位

CodeMark 是一个**可视化的 AI 代码修改入口**。用户在 Web 页面上「指哪改哪」，通过批注描述需求，AI 自动修改源码并热更新。

**核心价值：**
- 用户看到的是 UI 结果，不是代码
- 结果导向，对非技术人员友好
- 不只是修复 Bug，也可以实现新功能、重构代码

## 分层架构

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: UI 层 — @codemark/ui                       │
│  Web Components 批注组件库（框架无关）                  │
│  ↕ WebSocket 直连 Agent Server                       │
├─────────────────────────────────────────────────────┤
│  Layer 2: 适配器层 — 独立进程                          │
│  前端：@codemark/vue @codemark/react                 │
│  构建：@codemark/vite-plugin @codemark/webpack-plugin │
│  后端：@codemark/express codemark-spring-boot-starter │
│  ↕ 后端适配器通过 WebSocket 连接 Agent Server          │
├─────────────────────────────────────────────────────┤
│  Layer 3: 协议层 — @codemark/protocol                │
│  共享类型 + 适配器接口契约 + WebSocket 协议             │
├─────────────────────────────────────────────────────┤
│  Layer 4: Agent 层 — @codemark/server                │
│  AI Agent Server（独立进程，WebSocket 服务端）          │
└─────────────────────────────────────────────────────┘
```

## 意图类型

| 意图 | 触发方式 | 示例 |
|------|---------|------|
| **Auto（默认）** | 用户输入描述，AI 自动判断 | 「点击按钮没反应」→ Fix |
| **Fix** | 明确选择或 AI 推断 | 「提交表单报 500」 |
| **Feature** | 明确选择或 AI 推断 | 「在这里加一个搜索框」 |
| **Refactor** | 明确选择或 AI 推断 | 「这段代码太乱了」 |

## Monorepo 包结构

```
packages/
├── protocol/            — @codemark/protocol（共享类型 + 接口契约）
├── server/              — @codemark/server（Agent 核心）
├── ui/                  — @codemark/ui（Web Components 批注组件）
├── vue/                 — @codemark/vue（Vue 3 适配器）
├── react/               — @codemark/react（React 适配器，规划中）
├── vite-plugin/         — @codemark/vite-plugin（Vite 构建插件）
├── webpack-plugin/      — @codemark/webpack-plugin（Webpack 插件，规划中）
├── express/             — @codemark/express（Express 后端适配器）
├── spring-boot-starter/ — io.codemark:codemark-spring-boot-starter（Java）
└── examples/
    └── vue-app/         — Vue 3 示例项目
```

---

## Layer 1: UI 层 — @codemark/ui

Web Components 实现的批注组件库，框架无关，Shadow DOM 隔离样式。

### 组件清单

| 组件 | 职责 |
|------|------|
| `<codemark-overlay>` | 全屏透明覆盖层，管理所有批注标记 |
| `<codemark-hover-info>` | 跟随鼠标的浮层，显示当前 hover 的组件信息 |

### 交互流程

1. 开启批注模式 → `<codemark-overlay>` 激活
2. 鼠标移动 → `<codemark-hover-info>` 跟随显示组件名、源文件
3. 点击确认 → 输入问题描述
4. 提交 → 标记出现在元素旁
5. 点击标记 → 展示详情 + AI 修复

### 前端通信机制

前端 Web Components 运行在浏览器中，通过 **WebSocket 直连** Agent Server，不经过用户应用后端。

```
┌──────────────────┐                    ┌──────────────────┐
│  浏览器           │                    │  Agent Server    │
│  ┌────────────┐  │   WebSocket        │  @codemark/server│
│  │ @codemark/ │  │ ◄───────────────► │                  │
│  │ ui         │  │   ws://host:3001   │  WSServer        │
│  └────────────┘  │                    │  RESTAPI         │
│  ┌────────────┐  │                    │                  │
│  │ @codemark/ │  │                    │                  │
│  │ vite-plugin│  │                    │                  │
│  └────────────┘  │                    │                  │
└──────────────────┘                    └──────────────────┘
```

---

## Layer 2: 适配器层

### 前端适配器 — @codemark/vue

Vue 3 适配器，提供：
- `createVueAdapter()` — Vue 插件，安装全局错误处理
- `getVueComponentMeta(element)` — 从 DOM 元素获取 Vue 组件源码位置
- `createErrorBoundary()` — 组件级错误捕获

### 构建插件 — @codemark/vite-plugin

Vite 插件，通过虚拟模块注入 CodeMark 客户端：
- `resolveId` 拦截 `/@codemark/client`
- `load` 生成 `import { initCodeMark } from '@codemark/ui'`
- `transformIndexHtml` 注入 `<script>` 标签
- `apply: 'serve'` 仅在开发模式生效

### 后端适配器 — @codemark/express

Express 中间件，提供：
- `codemark(options)` — 返回 `{middleware, errorHandler, client}`
- `scanAndPushRoutes(app, client)` — 扫描并推送路由映射
- `AgentServerClient` — WebSocket 客户端，连接 Agent Server

### 后端适配器 — codemark-spring-boot-starter

Spring Boot Starter，自动配置：
- `CodeMarkWebSocketClient` — WebSocket 客户端
- `CodeMarkRouteScanner` — 启动时扫描 `@RequestMapping`
- `CodeMarkExceptionHandler` — `@ControllerAdvice` 全局异常捕获
- `CodeMarkRequestInterceptor` — 请求拦截，注入 X-Request-ID

### 后端适配器通信机制

所有后端适配器均作为**独立进程**运行，通过 **WebSocket 长连接**与 Agent Server 通信。

```
┌──────────────────┐                    ┌──────────────────┐
│  用户 Express App│                    │  Agent Server    │
│  ┌────────────┐  │   WebSocket        │  @codemark/server│
│  │ @codemark/ │  │ ◄───────────────► │                  │
│  │ express    │  │                    │  WSServer        │
│  └────────────┘  │                    │  AdapterRegistry │
└──────────────────┘                    └──────────────────┘

┌──────────────────┐                    ┌──────────────────┐
│  用户 Spring Boot│                    │  Agent Server    │
│  App             │   WebSocket        │  @codemark/server│
│  ┌────────────┐  │ ◄───────────────► │                  │
│  │codemark-   │  │                    │  WSServer        │
│  │spring-boot │  │                    │  AdapterRegistry │
│  │-starter    │  │                    │                  │
│  └────────────┘  │                    └──────────────────┘
└──────────────────┘
```

**连接生命周期：**
1. 用户应用启动 → 适配器初始化 → WebSocket 连接 Agent Server
2. 发送 `adapter:register` → Server 注册并返回 adapterId
3. 适配器执行路由扫描 → 发送 `backend:routes`
4. 运行时捕获错误/日志 → 实时推送 `backend:error` / `backend:log`
5. 心跳保活，断线自动重连
6. Server 发送 `backend:get-source` → 适配器读取本地文件并返回

---

## Layer 3: 协议层 — @codemark/protocol

共享类型定义 + 适配器接口契约 + 通信协议。

### 核心类型

| 类型 | 说明 |
|------|------|
| `Annotation` | 批注（id, selector, content, intent, sourceFile, sourceLine, componentName, status） |
| `Task` | AI 任务（id, annotationId, state, diff, summary, aiModel） |
| `ErrorEvent` | 错误事件（id, source, type, message, stack, requestId） |
| `LogEntry` | 日志条目（id, requestId, level, message, timestamp） |
| `RouteInfo` | 路由信息（method, path, handlerFile, handlerLine, middlewareChain） |
| `WSMessage` | WebSocket 消息（event, payload, timestamp），带 `WSMessageMap` 泛型映射 |

### WebSocket 事件

| 类别 | 事件 | 方向 |
|------|------|------|
| 适配器 | `adapter:register` / `adapter:registered` / `adapter:heartbeat` | 双向 |
| 批注 | `annotation:create` / `update` / `delete` / `resolve` | 双向 |
| 任务 | `task:start` / `progress` / `proposal` / `result` | Server→Client |
| 后端 | `backend:routes` / `backend:error` / `backend:log` | Adapter→Server |
| 源码 | `backend:source-request` / `backend:source-response` | 双向 |

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/annotations` | GET/POST | 批注 CRUD |
| `/api/annotations/:id` | DELETE | 删除批注 |
| `/api/fix` | POST | 触发 AI 修复 |
| `/api/routes` | GET | 获取后端路由映射 |
| `/api/errors` | POST | 接收后端错误 |
| `/api/logs` | GET | 查询日志 |

---

## Layer 4: Agent 层 — @codemark/server

AI Agent Server，独立进程。

### 模块结构

```
@codemark/server
├── Store             — 批注和任务的内存存储
├── CodeAgent         — AI 代码修改代理（意图分类 + Prompt 策略）
├── ContextBuilder    — 构建 AI 上下文
├── DiffEngine        — Diff 生成 + 上下文模糊匹配应用
├── AdapterRegistry   — 适配器注册和管理
├── WSServer          — WebSocket 服务器
├── RESTAPI           — REST 接口
└── FileWatcher       — 文件变更监听
```

### AI 工作流

```
用户选择元素 + 输入描述（可选选择意图，或 Auto）
    ↓
ContextBuilder 构建上下文（源码、日志、错误、API Schema）
    ↓
IntentClassifier — 若 Auto，根据描述推断意图
    ↓
CodeAgent 根据意图选择对应 Prompt 策略
    ↓
AI 生成 Diff → DiffEngine 上下文模糊匹配应用
    ↓
FileSystem 写入 → HMR/重启 → 用户验证结果
    ↓
不满意 → 回滚 → 重新描述 / 追加描述 → 再次尝试
```

### Prompt 策略

| 意图 | Prompt 重点 |
|------|------------|
| Fix | 错误日志 + 堆栈 + 源码，要求最小改动 |
| Feature | 用户描述 + 相关组件代码，要求新增功能 |
| Refactor | 目标代码 + 上下文，要求保持功能不变 |
| Auto | 综合分析，先分类再按对应策略处理 |

---

## 跨栈 Bug 追踪

```
前端按钮批注 → 捕获关联的 fetch('/api/orders')
    ↓ 通过 X-Request-ID 关联
后端适配器返回：错误堆栈 + handler 源码位置
    ↓
AI 同时读取前端调用代码 + 后端 handler 代码
    ↓
判断 Bug 在前端还是后端 → 生成修复 Diff
```

## 微服务扩展路径

当前架构面向**单体应用**。微服务场景的扩展路径：

1. 核心类型增加 `serviceId`
2. AdapterRegistry 支持多实例
3. 跨服务批注关联通过 `X-Request-ID` 传递

改动范围：仅扩展类型字段 + Store 查询逻辑，不涉及通信协议变更。
