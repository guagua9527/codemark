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
├─────────────────────────────────────────────────────┤
│  Layer 2: 适配器层 — 独立 npm 包                      │
│  前端：@codemark/vue @codemark/react                 │
│  构建：@codemark/vite-plugin @codemark/webpack-plugin │
│  后端：@codemark/express @codemark/spring-boot         │
├─────────────────────────────────────────────────────┤
│  Layer 3: 协议层 — @codemark/protocol                │
│  共享类型 + 适配器接口契约 + WebSocket/REST 协议        │
├─────────────────────────────────────────────────────┤
│  Layer 4: Agent 层 — @codemark/server                │
│  AI Agent Server（独立进程）                           │
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
├── spring-boot/         — @codemark/spring-boot（Java Spring Boot 适配器，独立进程通信）
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
- `@codemark/spring-boot` — Spring Boot 适配器（Java，通过 REST/WebSocket 与 Agent Server 通信）

### 非 Node.js 后端适配器通信

Node.js 适配器（Express）作为 npm 包直接集成到 Agent Server 进程中。非 Node.js 适配器（如 Spring Boot）作为独立进程运行，通过 REST/WebSocket 与 Agent Server 通信：

```
┌──────────────────┐     REST/WebSocket     ┌──────────────────┐
│  Spring Boot App │ ◄──────────────────► │  Agent Server    │
│  @codemark/spring│                        │  @codemark/server│
│  -boot (Java)    │                        │  (Node.js)       │
└──────────────────┘                        └──────────────────┘
```

**Java 适配器接口（对应 BackendAdapter）：**

```java
public interface CodeMarkBackendAdapter {
    List<RouteInfo> getRoutes();
    void onLog(LogCallback callback);
    void onError(ErrorCallback callback);
    List<APISchema> getSchemas();
    void restart();
}
```

**源码定位策略（Spring 特有）：**
1. **启动时路由扫描** — 通过 `RequestMappingHandlerMapping` 获取所有 `@RequestMapping` 注解的 handler 方法，结合反射获取源文件位置
2. **运行时错误捕获** — 通过 `@ControllerAdvice` + `@ExceptionHandler` 全局捕获异常，解析堆栈获取 `文件:行号`

### 后端源码定位策略

两种方式结合：

1. **启动时路由扫描** — 插件在 app 启动时拦截路由注册，通过 `Error.stack` 获取 handler 的 `文件路径:行号`，构建路由映射表
2. **运行时错误堆栈解析** — 当请求处理出错时，解析 `Error.stack` 获取错误发生的精确 `文件:行号`，关联到请求上下文

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
| 批注 | annotation:create / update / delete / resolve | 双向 |
| 任务 | task:start / progress / proposal / apply / result / rollback | Server→Client |
| 后端 | backend:routes / backend:error / backend:log | Adapter→Server |
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
| P2 | `@codemark/spring-boot` | Spring Boot 后端适配器（Java） |
