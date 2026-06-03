import { describe, it, expect } from 'vitest'
import { parseHunks, applyUnifiedDiff } from '../diff-engine.js'

describe('parseHunks', () => {
  it('parses a simple diff into hunks', () => {
    const diff = `@@ -1,3 +1,3 @@
 line1
-old
+new
 line3`
    const hunks = parseHunks(diff)
    expect(hunks).toHaveLength(1)
    expect(hunks[0].removed).toEqual(['old'])
    expect(hunks[0].added).toEqual(['new'])
    expect(hunks[0].context).toEqual(['line1', 'line3'])
  })

  it('handles multiple hunks', () => {
    const diff = `@@ -1,3 +1,3 @@
 a
-b
+c
 d
@@ -10,3 +10,3 @@
 x
-y
+z
 w`
    const hunks = parseHunks(diff)
    expect(hunks).toHaveLength(2)
  })
})

describe('applyUnifiedDiff', () => {
  it('applies a simple replacement', () => {
    const original = 'line1\nold\nline3'
    const diff = `@@ -1,3 +1,3 @@
 line1
-old
+new
 line3`
    const result = applyUnifiedDiff(original, diff)
    expect(result).toBe('line1\nnew\nline3')
  })

  it('applies addition', () => {
    const original = 'line1\nline2'
    const diff = `@@ -1,2 +1,3 @@
 line1
+added
 line2`
    const result = applyUnifiedDiff(original, diff)
    expect(result).toBe('line1\nadded\nline2')
  })

  it('applies deletion', () => {
    const original = 'line1\nremove-me\nline3'
    const diff = `@@ -1,3 +1,2 @@
 line1
-remove-me
 line3`
    const result = applyUnifiedDiff(original, diff)
    expect(result).toBe('line1\nline3')
  })

  it('returns original when diff is empty', () => {
    expect(applyUnifiedDiff('hello', '')).toBe('hello')
  })
})
