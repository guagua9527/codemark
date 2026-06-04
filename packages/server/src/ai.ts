import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'
import type { Annotation } from '@codemark/protocol'
import { backupAndApply } from './diff-engine.js'

const INTENT_PROMPTS: Record<string, string> = {
  fix: `你是一个代码修复助手。用户标记了一个 Bug。
要求：最小改动，只修复问题，不要重构。
返回格式：\`\`\`diff ... \`\`\` + 一句话说明。`,

  feature: `你是一个功能开发助手。用户需要新增功能。
要求：遵循现有代码风格，实现用户描述的功能。
返回格式：\`\`\`diff ... \`\`\` + 一句话说明。`,

  refactor: `你是一个代码重构助手。用户希望优化代码。
要求：保持功能不变，改善代码质量。
返回格式：\`\`\`diff ... \`\`\` + 一句话说明。`,
}

export interface AgentResult {
  diff: string
  summary: string
  aiModel: string
}

export class CodeAgent {
  private client: OpenAI
  private projectRoot: string
  private model: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    })
  }

  async execute(
    taskId: string,
    annotation: Annotation,
    sourceContent: string,
    onProgress: (message: string) => void,
  ): Promise<AgentResult> {
    const intent = annotation.intent === 'auto'
      ? await this.classifyIntent(annotation.content)
      : annotation.intent

    onProgress(`意图: ${intent}，分析中...`)

    const systemPrompt = INTENT_PROMPTS[intent] || INTENT_PROMPTS.fix
    const userPrompt = `批注内容：${annotation.content}
关联文件：${annotation.sourceFile}
关联行号：${annotation.sourceLine}
组件名：${annotation.componentName}

源码：
\`\`\`
${sourceContent}
\`\`\`

请修复这个问题。`

    onProgress('AI 生成中...')

    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY 未设置，请配置环境变量后重试')
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content || ''
    console.log('[CodeMark] AI response:\n', content)

    const { diff, summary } = this.parseResponse(content)
    console.log('[CodeMark] Parsed diff:\n', diff)

    return { diff, summary, aiModel: this.model }
  }

  async classifyIntent(content: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `根据用户描述判断意图类型，只返回一个词：fix / feature / refactor
- fix: 修复 bug、错误、不工作
- feature: 新增功能、添加元素
- refactor: 优化、重构、改善代码质量`,
        },
        { role: 'user', content: `用户描述：${content}` },
      ],
      temperature: 0,
      max_tokens: 10,
    })

    const intent = response.choices[0]?.message?.content?.trim().toLowerCase() || 'fix'
    if (['fix', 'feature', 'refactor'].includes(intent)) return intent
    return 'fix'
  }

  private parseResponse(content: string): { diff: string; summary: string } {
    const diffMatch = content.match(/```diff\n([\s\S]*?)```/)
    if (!diffMatch) {
      throw new Error('AI response did not contain a diff block')
    }
    const diff = diffMatch[1].trim()
    const summaryMatch = content.replace(/```diff\n[\s\S]*?```/, '').trim()
    const summary = summaryMatch || '代码已修改'
    return { diff, summary }
  }

  async applyDiff(filePath: string, diff: string): Promise<void> {
    await backupAndApply(this.projectRoot, filePath, diff)
  }
}
