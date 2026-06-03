import fs from 'fs/promises'
import path from 'path'

export interface Hunk {
  lines: string[]
  removed: string[]
  added: string[]
  context: string[]
}

export function parseHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = []
  let current: Hunk | null = null

  for (const line of diff.split('\n')) {
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

export function findHunkPosition(hunk: Hunk, originalLines: string[], hintStart: number): number {
  if (hintStart >= 0 && hintStart < originalLines.length) {
    if (matchesAt(hunk, originalLines, hintStart)) return hintStart
  }

  const searchLines = [...hunk.removed, ...hunk.context]
  if (searchLines.length === 0) return Math.max(0, Math.min(hintStart, originalLines.length - 1))

  for (let i = 0; i < originalLines.length; i++) {
    if (matchesAt(hunk, originalLines, i)) return i
  }

  return Math.max(0, Math.min(hintStart, originalLines.length - 1))
}

export function matchesAt(hunk: Hunk, originalLines: string[], startIdx: number): boolean {
  let idx = startIdx
  for (const line of hunk.lines) {
    if (line.startsWith('+')) continue
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

export function applyUnifiedDiff(original: string, diff: string): string {
  const originalLines = original.split('\n')
  const hunks = parseHunks(diff)

  if (hunks.length === 0) return original

  const result: string[] = []
  let origIdx = 0

  for (const hunk of hunks) {
    const hintMatch = diff.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    const hintStart = hintMatch ? parseInt(hintMatch[1]) - 1 : origIdx
    const hunkStart = findHunkPosition(hunk, originalLines, hintStart)

    while (origIdx < hunkStart && origIdx < originalLines.length) {
      result.push(originalLines[origIdx])
      origIdx++
    }

    for (const line of hunk.lines) {
      if (line.startsWith('-')) {
        origIdx++
      } else if (line.startsWith('+')) {
        result.push(line.substring(1))
      } else {
        if (origIdx < originalLines.length) {
          result.push(originalLines[origIdx])
          origIdx++
        }
      }
    }
  }

  while (origIdx < originalLines.length) {
    result.push(originalLines[origIdx])
    origIdx++
  }

  return result.join('\n')
}

export async function backupAndApply(projectRoot: string, filePath: string, diff: string): Promise<void> {
  const fullPath = path.resolve(projectRoot, filePath)
  const original = await fs.readFile(fullPath, 'utf-8')
  await fs.writeFile(fullPath + '.bak', original, 'utf-8')
  const patched = applyUnifiedDiff(original, diff)
  await fs.writeFile(fullPath, patched, 'utf-8')
}
