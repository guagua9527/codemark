import OpenAI from 'openai'
import fs from 'fs/promises'
import path from 'path'
import { Annotation } from './types.js'

const SYSTEM_PROMPT = `你是一个前端代码修复助手。用户在一个 Web 页面上标记了一个问题（批注）。

你需要：
1. 分析批注描述的问题
2. 阅读关联的源码文件
3. 生成修复代码

返回格式（严格遵守）：
\`\`\`diff
[unified diff 格式的修复]
\`\`\`

然后用一句话说明你做了什么修复。

注意：
- 只修改必要的代码
- 保持代码风格一致
- 不要添加不必要的依赖
- diff 必须是标准 unified diff 格式（以 --- 和 +++ 开头）`

export class AIFixer {
  private client: OpenAI
  private projectRoot: string

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    })
  }

  async fix(annotation: Annotation): Promise<{ diff: string; summary: string }> {
    const filePath = path.resolve(this.projectRoot, annotation.sourceFile)
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const userPrompt = `批注内容：${annotation.content}
关联文件：${annotation.sourceFile}
关联行号：${annotation.sourceLine}
组件名：${annotation.componentName}

源码：
\`\`\`
${fileContent}
\`\`\`

请修复这个问题。`

    const response = await this.client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    })

    const content = response.choices[0]?.message?.content || ''
    return this.parseResponse(content)
  }

  private parseResponse(content: string): { diff: string; summary: string } {
    const diffMatch = content.match(/```diff\n([\s\S]*?)```/)
    if (!diffMatch) {
      throw new Error('AI response did not contain a diff block')
    }

    const diff = diffMatch[1].trim()
    const summaryMatch = content.replace(/```diff\n[\s\S]*?```/, '').trim()
    const summary = summaryMatch || '代码已修复'

    return { diff, summary }
  }

  async applyDiff(filePath: string, diff: string): Promise<void> {
    const fullPath = path.resolve(this.projectRoot, filePath)
    const originalContent = await fs.readFile(fullPath, 'utf-8')
    const patchedContent = applyUnifiedDiff(originalContent, diff)
    await fs.writeFile(fullPath, patchedContent, 'utf-8')
  }
}

function applyUnifiedDiff(original: string, diff: string): string {
  const originalLines = original.split('\n')
  const diffLines = diff.split('\n')

  const result: string[] = []
  let originalIndex = 0

  for (const line of diffLines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        const start = parseInt(match[1]) - 1
        while (originalIndex < start && originalIndex < originalLines.length) {
          result.push(originalLines[originalIndex])
          originalIndex++
        }
      }
    } else if (line.startsWith('-')) {
      originalIndex++
    } else if (line.startsWith('+')) {
      result.push(line.substring(1))
    } else if (line.startsWith(' ')) {
      result.push(originalLines[originalIndex])
      originalIndex++
    } else if (line === '\\ No newline at end of file') {
      // Ignore
    }
  }

  while (originalIndex < originalLines.length) {
    result.push(originalLines[originalIndex])
    originalIndex++
  }

  return result.join('\n')
}
