# CodeMark 平台架构设计

## 定位

CodeMark 是一个**可视化的 AI 代码修改入口**。用户在 Web 页面上「指哪改哪」，通过批注描述需求，AI 自动修改源码并热更新。

**核心价值：**
- 用户看到的是 UI 结果，不是代码
- 结果导向，对非技术人员友好
- 不只是修复 Bug，也可以实现新功能、重构代码

## 意图类型

| 意图 | 触发方式 | 示例 |
|------|---------|------|
| **Auto（默认）** | 用户输入描述，AI 自动判断 | 「点击按钮没反应」→ Fix |
| **Fix** | 明确选择或 AI 推断 | 「提交表单报 500」 |
| **Feature** | 明确选择或 AI 推断 | 「在这里加一个搜索框」 |
| **Refactor** | 明确选择或 AI 推断 | 「这段代码太乱了」 |

## 架构：分层架构（方案 A）

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

## Monorepo 包结构

```
packages/
├── server/              — @codemark/server（Agent 核心）
├── protocol/            — @codemark/protocol（共享类型 + 接口契约）
├── ui/                  — @codemark/ui（Web Components）
├── vue/                 — @codemark/vue（Vue 3 适配器）
├── react/               — @codemark/react（React 适配器）
├── vite-plugin/         — @codemark/vite-plugin
├── webpack-plugin/      — @codemark/webpack-plugin
├── express/             — @codemark/express（Node.js 后端适配器）
├── spring-boot-starter/ — io.codemark:codemark-spring-boot-starter（Java，Maven 包）
└── examples/
    ├── vue-app/
    ├── react-app/
    └── express-app/
```

每个适配器是独立的 npm 包，版本独立，用户只安装需要的适配器。

---

## Layer 1: UI 层 — @codemark/ui

Web Components 实现的批注组件库，框架无关，Shadow DOM 隔离样式。

### 组件清单

| 组件 | 职责 |
|------|------|
| `<codemark-overlay>` | 全屏透明覆盖层，管理所有批注标记 |
| `<codemark-hover-info>` | 跟随鼠标的浮层，显示当前 hover 的组件信息。**滚轮 ↑ 选择父级，↓ 选择子级** |
| `<codemark-marker>` | 单个批注标记（💬 图标），点击展开详情 |
| `<codemark-panel>` | 单个批注详情面板，显示内容、源码位置、AI 修复按钮 |
| `<codemark-input>` | 批注输入表单，文本框 + 意图选择 + 提交/取消 |
| `<codemark-management>` | 批注管理面板（侧边栏），列出所有批注，支持跳转、编辑、批量提交 |

### 交互流程

1. 开启批注模式 → `<codemark-overlay>` 激活
2. 鼠标移动 → `<codemark-hover-info>` 跟随显示组件名、源文件
   - 滚轮 ↑/↓ → 切换选择父级/子级组件，高亮边界变化
3. 点击确认 → `<codemark-input>` 弹出，输入问题描述
4. 提交 → `<codemark-marker>` 标记出现在元素旁
5. 点击标记 → `<codemark-panel>` 展示详情 + AI 修复
6. 打开管理面板 → `<codemark-management>` 侧边栏列出所有批注

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

**连接建立流程：**
1. 构建插件（Vite/Webpack）通过虚拟模块注入 CodeMark 客户端代码
2. 客户端代码包含 Agent Server 的 WebSocket 地址（默认 `ws://localhost:3001`）
3. 页面加载后，`@codemark/ui` 自动建立 WebSocket 连接
4. 连接成功后，前端可以发送批注、接收任务进度

**前端 WebSocket 事件：**

| 事件 | 方向 | 说明 |
|------|------|------|
| `annotation:create` | Client→Server | 创建批注 |
| `annotation:update` | Client→Server | 更新批注内容 |
| `annotation:delete` | Client→Server | 删除批注 |
| `annotation:resolve` | Client→Server | 标记批注已解决 |
| `task:start` | Server→Client | AI 任务开始处理 |
| `task:progress` | Server→Client | 任务进度更新 |
| `task:proposal` | Server→Client | AI 生成的修复方案（含 Diff 预览） |
| `task:result` | Server→Client | 任务完成（成功/失败） |
| `trace:link` | Server→Client | 跨栈关联通知（前端批注 → 后端错误） |

---

## Layer 2: 适配器层

### 前端适配器接口 — FrontendAdapter

```typescript
interface FrontendAdapter {
  // 获取元素对应的组件信息
  getComponentMeta(el: Element): ComponentMeta

  // 获取组件树
  getComponentTree(): ComponentNode[]

  // 注册错误边界捕获
  onError(cb: (err: ErrorEvent) => void): void

  // 触发 HMR 热更新
  triggerHMR(file: string): void
}
```

**实现包：**
- `@codemark/vue` — Vue 3 适配器（`__vueParentComponent` 元数据、`app.config.errorHandler`）
- `@codemark/react` — React 适配器（`__reactFiber$` 元数据、ErrorBoundary）

### 构建插件接口 — BuildPlugin

```typescript
interface BuildPlugin {
  // 注入 CodeMark 客户端到页面
  injectClient(port: number): void

  // 处理 HMR 事件
  onHMR(cb: (file: string) => void): void
}
```

**实现包：**
- `@codemark/vite-plugin` — Vite 插件（`resolveId`/`load` 虚拟模块）
- `@codemark/webpack-plugin` — Webpack 插件

### 后端适配器接口 — BackendAdapter

```typescript
interface BackendAdapter {
  // 获取路由映射
  getRoutes(): RouteInfo[]

  // 获取运行时日志流
  onLog(cb: (entry: LogEntry) => void): void

  // 获取错误事件流
  onError(cb: (err: BackendError) => void): void

  // 获取接口 Schema
  getSchemas(): APISchema[]

  // 触发服务重启
  restart(): Promise<void>
}
```

**实现包：**
- `@codemark/express` — Express 中间件（路由扫描 + 请求拦截 + 错误捕获）
- `codemark-spring-boot-starter` — Spring Boot Starter（Java，自动配置）

### 后端适配器通信机制

所有后端适配器（无论语言）均作为**独立进程**运行，通过 **WebSocket 长连接**与 Agent Server 通信。适配器是用户应用的一部分（中间件/ Starter），Agent Server 是独立进程。

```
┌──────────────────┐                    ┌──────────────────┐
│  用户 Express App│                    │  Agent Server    │
│  ┌────────────┐  │   WebSocket        │  @codemark/server│
│  │ @codemark/ │  │ ◄───────────────► │                  │
│  │ express    │  │                    │  WSServer        │
│  │ middleware │  │                    │  AdapterRegistry │
│  └────────────┘  │                    │                  │
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

**WebSocket 事件协议（适配器 → Agent Server）：**

| 事件 | 方向 | 说明 |
|------|------|------|
| `adapter:register` | Adapter→Server | 适配器注册，声明类型（backend）和语言 |
| `backend:routes` | Adapter→Server | 推送路由映射表（启动时扫描结果） |
| `backend:error` | Adapter→Server | 运行时错误事件（含堆栈、请求上下文） |
| `backend:log` | Adapter→Server | 请求日志流（可选） |
| `adapter:heartbeat` | Adapter→Server | 心跳保活 |

**WebSocket 事件协议（Agent Server → 适配器）：**

| 事件 | 方向 | 说明 |
|------|------|------|
| `adapter:registered` | Server→Adapter | 注册确认，返回 adapterId |
| `backend:restart` | Server→Adapter | 请求重启应用（AI 修复后触发） |
| `backend:get-source` | Server→Adapter | 请求读取指定文件源码内容 |
| `backend:source-response` | Adapter→Server | 返回源码内容 |

**连接生命周期：**
1. 用户应用启动 → 适配器初始化 → WebSocket 连接 Agent Server
2. 发送 `adapter:register` → Server 注册并返回 adapterId
3. 适配器执行路由扫描 → 发送 `backend:routes`
4. 运行时捕获错误/日志 → 实时推送 `backend:error` / `backend:log`
5. 心跳保活，断线自动重连
6. Server 发送 `backend:get-source` → 适配器读取本地文件并返回

### Spring Boot Starter 实现

**Maven 坐标：** `io.codemark:codemark-spring-boot-starter`

**用户接入方式：**

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.codemark</groupId>
    <artifactId>codemark-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

```yaml
# application.yml
codemark:
  server-url: ws://localhost:3001
  enabled: true
```

**自动配置模块结构：**

```
codemark-spring-boot-starter/
├── CodeMarkAutoConfiguration     — @Configuration 自动装配所有 Bean
├── CodeMarkProperties            — @ConfigurationProperties("codemark") 配置绑定
├── CodeMarkRouteScanner          — 启动时扫描所有 @RequestMapping handler
├── CodeMarkExceptionHandler      — @ControllerAdvice 全局异常捕获
├── CodeMarkWebSocketClient       — 连接 Agent Server 的 WebSocket 客户端
└── CodeMarkRequestInterceptor    — 请求拦截器（注入 X-Request-ID，记录日志）
```

**核心 Bean 职责：**

| Bean | 职责 |
|------|------|
| `CodeMarkRouteScanner` | 实现 `InitializingBean`，启动时通过 `RequestMappingHandlerMapping` 遍历所有 handler 方法，结合反射 + `Class.getProtectionDomain().getCodeSource()` 获取源文件路径和行号，通过 WebSocket 推送给 Agent Server |
| `CodeMarkExceptionHandler` | `@ControllerAdvice` 全局异常处理器，捕获异常后解析堆栈获取 `文件:行号`，关联 `X-Request-ID`，通过 WebSocket 上报 |
| `CodeMarkWebSocketClient` | 使用 Spring `WebSocketClient` 连接 Agent Server，维护长连接，处理断线重连。负责发送路由信息、错误事件、日志，接收 AI 修复指令 |
| `CodeMarkRequestInterceptor` | `HandlerInterceptor`，为每个请求生成/传递 `X-Request-ID`，记录请求开始/结束时间和状态码 |

**源码定位策略（Spring 特有）：**
1. **启动时路由扫描** — 通过 `RequestMappingHandlerMapping` 获取所有 `@RequestMapping` 注解的 handler 方法，通过反射获取 `Method` 对象，再通过 `method.getDeclaringClass().getProtectionDomain().getCodeSource().getLocation()` 获取 class 文件路径，结合行号表（ASM 或 `java.lang.StackTraceElement`）定位源码
2. **运行时错误捕获** — `@ControllerAdvice` + `@ExceptionHandler(Throwable.class)` 全局捕获，解析 `e.getStackTrace()` 获取精确 `文件:行号`，通过 `X-Request-ID` 关联到前端请求上下文

### 后端源码定位策略

两种方式结合，由各语言适配器实现，通过 WebSocket 推送给 Agent Server：

1. **启动时路由扫描** — 适配器在应用启动时扫描路由注册，获取 handler 的 `文件路径:行号`，构建路由映射表，通过 `backend:routes` 事件推送
2. **运行时错误堆栈解析** — 当请求处理出错时，适配器解析错误堆栈获取精确 `文件:行号`，关联请求上下文，通过 `backend:error` 事件推送

### FileSystem 抽象层

```typescript
interface FileSystem {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  listFiles(dir: string, pattern?: string): Promise<string[]>
  watchFile(path: string, cb: () => void): void
}

// 内置实现
class LocalFileSystem implements FileSystem { ... }

// 用户可扩展
class DockerFileSystem implements FileSystem { ... }
class RemoteFileSystem implements FileSystem { ... }
```

---

## Layer 3: 协议层 — @codemark/protocol

共享类型定义 + 适配器接口契约 + 通信协议。

### 核心类型

```typescript
interface Annotation {
  id: string
  selector: string           // CSS 选择器（前端）或 API 路径（后端）
  content: string            // 用户描述
  intent: 'auto' | 'fix' | 'feature' | 'refactor'
  sourceFile: string
  sourceLine: number
  componentName: string
  status: 'open' | 'resolved'
  createdAt: number
}

interface Task {
  id: string
  annotationId: string
  state: 'pending' | 'analyzing' | 'proposing' | 'applying' | 'verifying' | 'done' | 'failed' | 'rolled-back'
  diff: string
  summary: string
  aiModel: string
}

interface ErrorEvent {
  id: string
  source: 'frontend' | 'backend'
  type: string
  message: string
  stack: string
  requestId: string
  linkedAnnotationId?: string
}

interface RouteInfo {
  method: string
  path: string
  handlerFile: string
  handlerLine: number
  middlewareChain: string[]
  schema?: APISchema
}
```

### WebSocket 事件

| 类别 | 事件 | 方向 |
|------|------|------|
| 适配器 | adapter:register / adapter:registered / adapter:heartbeat | 双向 |
| 批注 | annotation:create / update / delete / resolve | 双向 |
| 任务 | task:start / progress / proposal / apply / result / rollback | Server→Client |
| 后端 | backend:routes / backend:error / backend:log / backend:restart | 双向 |
| 源码 | backend:get-source / backend:source-response | 双向 |
| 跨栈 | trace:link / trace:error | 双向 |

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/annotations` | GET/POST | 批注 CRUD |
| `/api/annotations/:id` | DELETE | 删除批注 |
| `/api/task` | POST | 触发 AI 任务 |
| `/api/task/:id/rollback` | POST | 回滚修复 |
| `/api/routes` | GET | 获取后端路由映射 |
| `/api/schemas` | GET | 获取接口 Schema |
| `/api/config` | GET/PUT | 项目配置 |

---

## Layer 4: Agent 层 — @codemark/server

AI Agent Server，独立进程。

### 模块结构

```
@codemark/server
├── Store             — 批注和任务的内存存储
├── CodeAgent         — AI 代码修改代理
├── ContextBuilder    — 构建 AI 上下文
├── IntentClassifier  — 意图分类（Auto 模式）
├── DiffEngine        — Diff 生成 + 上下文模糊匹配应用
├── AdapterRegistry   — 适配器注册和管理
├── WSServer          — WebSocket 服务器
├── RESTAPI           — REST 接口
├── FileSystem        — 抽象文件访问层
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

### 跨栈 Bug 追踪

```
前端按钮批注 → 捕获关联的 fetch('/api/orders')
    ↓ 通过 X-Request-ID 关联
后端插件返回：错误堆栈 + handler 源码位置
    ↓
AI 同时读取前端调用代码 + 后端 handler 代码
    ↓
判断 Bug 在前端还是后端 → 生成修复 Diff
```

### 启动序列

1. 加载配置（`.codemark.config.ts`）
2. 初始化 FileSystem（默认 LocalFileSystem）
3. 启动 WebSocket Server + REST API
4. 等待适配器注册（前端 + 后端）
5. 接收后端路由映射 → Store 缓存
6. 就绪，开始监听批注和任务请求

---

## 实现优先级

| 阶段 | 包 | 说明 |
|------|-----|------|
| P0 | `@codemark/protocol` | 共享类型和接口契约 |
| P0 | `@codemark/server` | Agent 核心（重构现有 server） |
| P0 | `@codemark/ui` | Web Components 批注组件 |
| P0 | `@codemark/vite-plugin` | Vite 插件（重构现有） |
| P0 | `@codemark/vue` | Vue 3 适配器（重构现有） |
| P1 | `@codemark/express` | Express 后端适配器 |
| P2 | `@codemark/react` | React 适配器 |
| P2 | `@codemark/webpack-plugin` | Webpack 插件 |
| P2 | `codemark-spring-boot-starter` | Spring Boot Starter（Java，Maven 包） |

---

## 已知限制与扩展路径

### 微服务支持（当前不支持，设计预留）

当前架构面向**单体应用**（一个前端 + 一个后端）。微服务场景的扩展路径：

1. **核心类型增加 `serviceId`** — `Annotation`、`RouteInfo`、`ErrorEvent` 增加服务来源标识，Agent Server 按服务维度管理数据
2. **AdapterRegistry 支持多实例** — 同一类型适配器可注册多个实例（如 3 个 Spring Boot 服务各跑一个 Starter），每个实例有独立 serviceId
3. **跨服务批注关联** — 通过 `X-Request-ID` 在服务间传递，Agent Server 可串联同一请求在多个服务中的调用链

改动范围：仅扩展类型字段 + Agent Server 的 Store 查询逻辑，不涉及通信协议变更。
