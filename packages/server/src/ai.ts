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

    // Backup original file before AI fix
    await fs.writeFile(filePath + '.bak', fileContent, 'utf-8')

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
    console.log('[CodeMark] AI response:\n', content)
    const result = this.parseResponse(content)
    console.log('[CodeMark] Parsed diff:\n', result.diff)
    return result
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

interface Hunk {
  lines: string[]      // raw diff lines (with prefix: ' ', '-', '+')
  removed: string[]    // lines to remove (without '-' prefix)
  added: string[]      // lines to add (without '+' prefix)
  context: string[]    // context lines (without ' ' prefix)
}

function parseHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = []
  let current: Hunk | null = null

  for (const line of diff.split('\n')) {
    // Skip headers
    if (line.startsWith('diff ') || line.startsWith('index ') ||
        line.startsWith('---') || line.startsWith('+++') ||
        line.startsWith('new file') || line.startsWith('deleted file')) {
      continue
    }

    if (line.startsWith('@@')) {
      if (current) hunks.push(current)
      current = { lines: [], removed: [], added: [], context: [] }
      continue
    }

    if (!current) continue

    if (line.startsWith('-')) {
      current.lines.push(line)
      current.removed.push(line.substring(1))
    } else if (line.startsWith('+')) {
      current.lines.push(line)
      current.added.push(line.substring(1))
    } else if (line.startsWith(' ') || line.startsWith('\t')) {
      current.lines.push(line)
      current.context.push(line.startsWith('\t') ? line : line.substring(1))
    } else if (line === '\\ No newline at end of file') {
      // ignore
    }
  }
  if (current) hunks.push(current)
  return hunks
}

function findHunkPosition(hunk: Hunk, originalLines: string[], hintStart: number): number {
  // Try the hint position first (from hunk header)
  if (hintStart >= 0 && hintStart < originalLines.length) {
    if (matchesAt(hunk, originalLines, hintStart)) return hintStart
  }

  // Fuzzy search: find where the hunk's removed + context lines match
  const searchLines = [...hunk.removed, ...hunk.context]
  if (searchLines.length === 0) return Math.max(0, Math.min(hintStart, originalLines.length - 1))

  for (let i = 0; i < originalLines.length; i++) {
    if (matchesAt(hunk, originalLines, i)) return i
  }

  // Last resort: just use the hint
  return Math.max(0, Math.min(hintStart, originalLines.length - 1))
}

function matchesAt(hunk: Hunk, originalLines: string[], startIdx: number): boolean {
  let idx = startIdx
  for (const line of hunk.lines) {
    if (line.startsWith('+')) continue // added lines don't need to match
    if (idx >= originalLines.length) return false
    const origLine = originalLines[idx]
    const expected = line.startsWith('-') || line.startsWith(' ') || line.startsWith('\t')
      ? (line.startsWith('\t') ? line : line.substring(1))
      : line
    if (origLine !== expected) return false
    idx++
  }
  return true
}

function applyUnifiedDiff(original: string, diff: string): string {
  const originalLines = original.split('\n')
  const hunks = parseHunks(diff)

  if (hunks.length === 0) return original

  const result: string[] = []
  let origIdx = 0

  for (const hunk of hunks) {
    // Find the correct position for this hunk using context matching
    const hintMatch = diff.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    const hintStart = hintMatch ? parseInt(hintMatch[1]) - 1 : origIdx
    const hunkStart = findHunkPosition(hunk, originalLines, hintStart)

    // Copy original lines up to hunk start
    while (origIdx < hunkStart && origIdx < originalLines.length) {
      result.push(originalLines[origIdx])
      origIdx++
    }

    // Apply hunk line by line
    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        // Skip removed line from original
        origIdx++
      } else if (line.startsWith('+')) {
        // Add new line
        result.push(line.substring(1))
      } else {
        // Context line — copy from original and advance
        if (origIdx < originalLines.length) {
          result.push(originalLines[origIdx])
          origIdx++
        }
      }
    }
  }

  // Copy remaining original lines after last hunk
  while (origIdx < originalLines.length) {
    result.push(originalLines[origIdx])
    origIdx++
  }

  return result.join('\n')
}
