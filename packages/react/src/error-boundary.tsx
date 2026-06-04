import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { captureError } from './error-handler.js'
import { DEFAULT_SERVER_PORT } from '@codemark/core/common'

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
    }, this.props.serverPort || DEFAULT_SERVER_PORT)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}
