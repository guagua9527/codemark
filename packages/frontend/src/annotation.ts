import { Annotation } from './types.js'

export class AnnotationUI {
  private annotations: Map<string, { element: HTMLDivElement; annotation: Annotation }> = new Map()
  private inputBox: HTMLDivElement | null = null
  private detailBox: HTMLDivElement | null = null
  private onSubmitCallback: ((annotation: Omit<Annotation, 'id' | 'createdAt' | 'status'>) => void) | null = null
  private onFixCallback: ((annotationId: string) => void) | null = null
  private onDeleteCallback: ((annotationId: string) => void) | null = null

  constructor(private overlayContainer: HTMLDivElement) {}

  onSubmit(cb: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'status'>) => void) {
    this.onSubmitCallback = cb
  }

  onFix(cb: (annotationId: string) => void) {
    this.onFixCallback = cb
  }

  onDelete(cb: (annotationId: string) => void) {
    this.onDeleteCallback = cb
  }

  showInput(targetRect: DOMRect, selector: string, meta: { sourceFile: string; sourceLine: number; componentName: string }) {
    this.hideInput()

    const box = document.createElement('div')
    box.className = 'codemark-input-box'

    box.style.top = `${targetRect.bottom + 8}px`
    box.style.left = `${targetRect.left}px`

    box.innerHTML = `
      <div style="font-size:11px;color:#888;margin-bottom:6px;">
        ${meta.componentName}${meta.sourceFile ? ` · ${meta.sourceFile}:${meta.sourceLine}` : ''}
      </div>
      <textarea placeholder="描述这个问题..."></textarea>
      <div style="display:flex;justify-content:flex-end;">
        <button class="cancel-btn" style="background:#ccc;color:#333;margin-right:4px;">取消</button>
        <button class="submit-btn">提交</button>
      </div>
    `

    const textarea = box.querySelector('textarea')!
    const submitBtn = box.querySelector('.submit-btn')!
    const cancelBtn = box.querySelector('.cancel-btn')!

    submitBtn.addEventListener('click', () => {
      const content = textarea.value.trim()
      if (!content) return
      this.onSubmitCallback?.({
        selector,
        content,
        sourceFile: meta.sourceFile,
        sourceLine: meta.sourceLine,
        componentName: meta.componentName,
      })
      this.hideInput()
    })

    cancelBtn.addEventListener('click', () => this.hideInput())

    this.overlayContainer.appendChild(box)
    this.inputBox = box
    textarea.focus()
  }

  hideInput() {
    this.inputBox?.remove()
    this.inputBox = null
  }

  addMarker(annotation: Annotation) {
    const target = document.querySelector(annotation.selector)
    if (!target) return

    const marker = document.createElement('div')
    marker.className = 'codemark-marker'
    marker.textContent = '💬'
    marker.title = annotation.content

    marker.addEventListener('click', (e) => {
      e.stopPropagation()
      this.showDetail(annotation, marker)
    })

    this.overlayContainer.appendChild(marker)
    this.annotations.set(annotation.id, { element: marker, annotation })
    this.updateMarkerPosition(annotation.id)
  }

  removeMarker(annotationId: string) {
    const entry = this.annotations.get(annotationId)
    if (entry) {
      entry.element.remove()
      this.annotations.delete(annotationId)
    }
  }

  updateMarkerPosition(annotationId: string) {
    const entry = this.annotations.get(annotationId)
    if (!entry) return

    const target = document.querySelector(entry.annotation.selector)
    if (!target) {
      entry.element.style.display = 'none'
      return
    }

    const rect = target.getBoundingClientRect()
    entry.element.style.top = `${rect.top}px`
    entry.element.style.left = `${rect.right}px`
    entry.element.style.display = ''
  }

  updateAllPositions() {
    for (const id of this.annotations.keys()) {
      this.updateMarkerPosition(id)
    }
  }

  private showDetail(annotation: Annotation, marker: HTMLDivElement) {
    this.hideDetail()

    const box = document.createElement('div')
    box.className = 'codemark-detail'

    const rect = marker.getBoundingClientRect()
    box.style.top = `${rect.top}px`
    box.style.left = `${rect.right + 8}px`

    box.innerHTML = `
      <div class="content">${annotation.content}</div>
      <div class="meta">${annotation.componentName} · ${annotation.sourceFile}:${annotation.sourceLine}</div>
      <div>
        <button class="fix-btn">AI 修复</button>
        <button class="delete-btn danger">删除</button>
      </div>
    `

    box.querySelector('.fix-btn')!.addEventListener('click', () => {
      this.onFixCallback?.(annotation.id)
      this.hideDetail()
    })

    box.querySelector('.delete-btn')!.addEventListener('click', () => {
      this.onDeleteCallback?.(annotation.id)
      this.removeMarker(annotation.id)
      this.hideDetail()
    })

    this.overlayContainer.appendChild(box)
    this.detailBox = box
  }

  hideDetail() {
    this.detailBox?.remove()
    this.detailBox = null
  }
}
