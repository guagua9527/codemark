# CodeMark

可视化的 AI 代码修改入口。用户在 Web 页面上「指哪改哪」，通过批注描述需求，AI 自动修改源码并热更新。

## 特性

- **指哪改哪** — 在页面上直接点击元素，描述问题或需求
- **AI 自动修改** — 支持 Fix、Feature、Refactor 三种意图，Auto 模式自动判断
- **跨栈追踪** — 前端批注自动关联后端错误，通过 X-Request-ID 串联请求链路
- **框架无关** — UI 层基于 Web Components，适配 Vue 3、React
- **语言无关** — 后端适配器支持 Express (Node.js) 和 Spring Boot (Java)
- **Dev-only** — 通过构建插件注入，生产构建完全移除

## 架构

```
┌─────────────────────────────────────┐
│  UI 层 — @codemark/ui               │
│  Web Components 批注组件（框架无关）   │
│  ↕ WebSocket 直连                    │
├─────────────────────────────────────┤
│  适配器层                            │
│  前端：@codemark/vue                 │
│  构建：@codemark/vite-plugin         │
│  后端：@codemark/express             │
│        codemark-spring-boot-starter  │
│  ↕ WebSocket                        │
├─────────────────────────────────────┤
│  协议层 — @codemark/protocol         │
│  共享类型 + WebSocket 协议            │
├─────────────────────────────────────┤
│  Agent 层 — @codemark/server         │
│  AI Agent Server（独立进程）          │
└─────────────────────────────────────┘
```

详细架构文档见 [docs/architecture.md](docs/architecture.md)。

## 快速开始

### Vue 3 + Vite 项目

**1. 安装依赖**

```bash
pnpm add @codemark/ui @codemark/vue
pnpm add -D @codemark/vite-plugin
```

**2. 配置 Vite**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import codemark from '@codemark/vite-plugin'

export default defineConfig({
  plugins: [
    vue(),
    codemark({ serverPort: 3001 }),
  ],
})
```

**3. 安装 Vue 插件（可选，启用错误捕获）**

```typescript
// main.ts
import { createApp } from 'vue'
import { createVueAdapter } from '@codemark/vue'
import App from './App.vue'

const app = createApp(App)
app.use(createVueAdapter({ serverPort: 3001 }))
app.mount('#app')
```

**4. 启动 Agent Server**

```bash
pnpm --filter @codemark/server start
```

**5. 启动开发服务器**

```bash
pnpm dev
```

页面右下角出现 CodeMark 按钮，点击即可开启批注模式。

### Express 后端项目

```bash
pnpm add @codemark/express
```

```typescript
import express from 'express'
import { codemark, scanAndPushRoutes } from '@codemark/express'

const app = express()
const { middleware, errorHandler, client } = codemark({
  serverUrl: 'ws://localhost:3001/codemark',
})

app.use(middleware)
// ... 你的路由 ...
app.use(errorHandler)

app.listen(3000, () => {
  scanAndPushRoutes(app, client)
})
```

### Spring Boot 项目

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.codemark</groupId>
    <artifactId>codemark-spring-boot-starter</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</dependency>
```

```yaml
# application.yml
codemark:
  server-url: ws://localhost:3001/codemark
  enabled: true
```

添加依赖即可，其余由 Spring Boot 自动配置。

## 包说明

| 包 | 说明 |
|---|------|
| `@codemark/protocol` | 共享类型定义和 WebSocket 协议 |
| `@codemark/server` | AI Agent Server（WebSocket + REST） |
| `@codemark/ui` | Web Components 批注组件库 |
| `@codemark/vite-plugin` | Vite 构建插件（虚拟模块注入） |
| `@codemark/vue` | Vue 3 适配器（错误捕获、组件元数据） |
| `@codemark/express` | Express 后端适配器 |
| `codemark-spring-boot-starter` | Spring Boot Starter |

## 开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm -r build

# 运行测试
pnpm --filter @codemark/server test

# 启动 Agent Server
pnpm --filter @codemark/server start
```

## 技术栈

- **UI**: Web Components (Custom Elements + Shadow DOM)
- **构建**: Vite 插件（虚拟模块）
- **通信**: WebSocket + REST
- **AI**: 多模型抽象层（Claude、OpenAI 等）
- **前端适配**: Vue 3、React（规划中）
- **后端适配**: Express、Spring Boot

## License

MIT
