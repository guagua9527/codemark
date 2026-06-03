# CodeMark MVP PoC 设计文档

## 目标

验证 CodeMark 的核心假设：**原生 JS 批注覆盖层能否与前端框架无关地工作**。

通过一个端到端 PoC，证明：
1. 原生 JS 覆盖层能在 Vue app 上正常工作（不干扰框架渲染）
2. DOM 选择器能稳定绑定到页面元素
3. Vite 插件能正确注入批注客户端
4. AI（DeepSeek）能从批注内容 + 源码生成有效修复 diff
5. 应用 diff 后 HMR 正常工作

## 架构

```
codemark/
├── packages/
│   ├── frontend/          # 原生 JS 批注覆盖层
│   │   ├── src/
│   │   │   ├── index.ts       # 入口：初始化覆盖层
│   │   │   ├── overlay.ts     # 覆盖层 DOM 管理
│   │   │   ├── selector.ts    # 元素选择与高亮
│   │   │   ├── annotation.ts  # 批注创建与显示
│   │   │   └── ws-client.ts   # WebSocket 客户端
│   │   └── package.json
│   ├── server/            # WebSocket + AI 修复服务
│   │   ├── src/
│   │   │   ├── index.ts       # 入口：启动服务
│   │   │   ├── ws.ts          # WebSocket 服务
│   │   │   ├── api.ts         # REST API
│   │   │   └── ai.ts          # DeepSeek AI 修复
│   │   └── package.json
│   └── vite-plugin/       # Vite 注入插件
│       ├── src/
│       │   └── index.ts       # 插件入口
│       └── package.json
├── examples/
│   └── vue-app/           # Vue 3 测试项目
│       ├── src/
│       │   ├── App.vue
│       │   ├── components/
│       │   │   ├── TodoList.vue    # 待办列表（含故意 bug）
│       │   │   └── Counter.vue     # 计数器（含故意 bug）
│       │   └── main.ts
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
└── package.json           # monorepo root (pnpm workspace)
```

## 数据模型（PoC 最简版）

```typescript
// packages/frontend/src/types.ts

interface Annotation {
  id: string
  selector: string          // CSS 选择器路径
  content: string           // 批注文本
  sourceFile: string        // 关联源码文件
  sourceLine: number        // 关联行号
  componentName: string     // 组件名
  createdAt: number
  status: 'open' | 'resolved'
}

interface FixResult {
  id: string
  annotationId: string
  diff: string              // unified diff
  summary: string           // AI 修复说明
  status: 'pending' | 'applied' | 'failed'
}
```

## 各包详细设计

### packages/frontend

**职责**：纯原生 JS 实现的批注覆盖层，零框架依赖。

**核心模块**：

1. **overlay.ts** — 覆盖层容器
   - 创建一个 `position: fixed; inset: 0; pointer-events: none; z-index: 999999` 的容器
   - 所有批注标记和 UI 元素放在这个容器内
   - 使用 Shadow DOM 隔离样式

2. **selector.ts** — 元素选择
   - `mouseover` 时高亮元素（蓝色虚线边框）
   - `click` 时记录元素，打开批注输入框
   - 生成 CSS 选择器：从元素向上遍历，生成最短唯一路径
   - 获取元素的 `__file` / `__source` 元数据（如果存在）

3. **annotation.ts** — 批注管理
   - 在目标元素旁显示批注标记（小气泡）
   - 点击标记展开详情
   - 批注输入框（Popover）

4. **ws-client.ts** — WebSocket 通信
   - 连接 `ws://localhost:PORT`
   - 发送/接收批注事件
   - 断线自动重连

**关键实现细节**：
- 覆盖层 `pointer-events: none`，批注标记单独设置 `pointer-events: auto`
- 高亮使用 `outline` 而非 `border`，不影响布局
- 滚动/resize 时更新批注标记位置

### packages/server

**职责**：开发服务器，处理批注 CRUD、WebSocket 同步、AI 修复。

**核心模块**：

1. **ws.ts** — WebSocket 服务
   - 使用 `ws` 库
   - 事件：`annotation:create`, `annotation:update`, `annotation:delete`, `fix:trigger`, `fix:result`
   - 广播给所有连接的客户端

2. **api.ts** — REST API
   - `POST /api/annotations` — 创建批注
   - `GET /api/annotations` — 查询批注列表
   - `POST /api/fix` — 触发 AI 修复
   - 使用 Express 或原生 http

3. **ai.ts** — DeepSeek AI 修复
   - 读取批注关联的源码文件
   - 构建 prompt：批注内容 + 源码上下文
   - 调用 DeepSeek API（OpenAI 兼容格式）
   - 解析返回的 diff
   - 应用 diff 到源码文件

**AI Prompt 设计**：
```
你是一个前端代码修复助手。用户在一个 Web 页面上标记了一个问题。

批注内容：{annotation.content}
关联文件：{annotation.sourceFile}
关联行号：{annotation.sourceLine}

源码：
```vue
{fileContent}
```

请分析问题并生成修复。返回 unified diff 格式。
```

### packages/vite-plugin

**职责**：Vite 插件，注入 CodeMark 客户端。

**实现**：
```typescript
export function codemark(options?: { port?: number }): Plugin {
  return {
    name: 'vite-plugin-codemark',
    apply: 'serve',  // 仅 dev 模式

    transformIndexHtml(html) {
      return html.replace('</body>', `
        <script type="module">
          import { initCodeMark } from '@codemark/frontend'
          initCodeMark({ serverPort: ${options?.port || 3001} })
        </script>
        </body>
      `)
    }
  }
}
```

**注入点**：`</body>` 之前

**生产构建**：`apply: 'serve'` 确保 build 时完全不执行

### examples/vue-app

**职责**：测试目标项目，包含故意的 bug 供批注修复。

**组件**：

1. **TodoList.vue**
   - 故意 bug：添加按钮没有绑定点击事件
   - 故意 bug：删除功能删错元素（索引计算错误）

2. **Counter.vue**
   - 故意 bug：计数器显示值与实际值不同步
   - 故意 bug：重置按钮样式不可见

## 端到端验证流程

```
1. pnpm dev  →  启动 Vue app + CodeMark server
2. 浏览器打开 http://localhost:5173
3. 页面上出现 CodeMark 浮标（开启/关闭批注模式）
4. 点击浮标进入批注模式
5. Hover 元素 → 蓝色高亮
6. 点击元素 → 弹出输入框
7. 输入 "这个按钮点击没反应" → 提交
8. 页面上出现批注标记
9. 点击批注标记 → 查看详情 → 点击 "AI 修复"
10. AI 分析源码 → 生成 diff → 应用修改
11. Vite HMR → 页面热更新
12. 按钮可点击 → 修复成功
```

## 技术栈

| 组件 | 技术 |
|------|------|
| Monorepo | pnpm workspace |
| 前端覆盖层 | 原生 TypeScript + DOM API |
| 构建 | Vite（library mode for frontend） |
| 服务端 | Node.js + ws + Express |
| AI | DeepSeek API（OpenAI 兼容） |
| 示例项目 | Vue 3 + Vite |

## PoC 范围边界

### 包含
- 原生 JS 批注覆盖层
- 元素选择与高亮
- 批注创建与显示
- WebSocket 实时同步
- AI 修复（DeepSeek）
- Vite 插件注入
- Vue 3 示例项目

### 不包含
- 错误捕获系统
- 多框架支持（React 等）
- 多用户协作
- Spec 驱动代码生成
- 数据持久化
- 生产构建验证
- 批注回复/状态管理（仅 open）
