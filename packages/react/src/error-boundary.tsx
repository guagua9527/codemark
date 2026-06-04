import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { captureError } from './error-handler.js'

export interface CodeMarkErrorBoundaryProps {
  children: ReactNode
  serverPort?: number
  fallback?: ReactNode
}

export interface CodeMarkErrorBoundaryState {
  hasError: boolean
}

export class CodeMarkErrorBoundary extends Component<CodeMarkErrorBoundaryProps, CodeMarkErrorBoundaryState> {
  state: CodeMarkErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): CodeMarkErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureError(error, {
      componentStack: errorInfo.componentStack ?? '',
      digest: errorInfo.digest ?? undefined,
    }, this.props.serverPort || 3001)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}
