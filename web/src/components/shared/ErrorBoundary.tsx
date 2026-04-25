import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Page crashed', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-[color:var(--surface-danger)] p-4 text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Ошибка загрузки страницы</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Что-то пошло не так. Перезагрузите страницу и попробуйте снова.</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" />
          Перезагрузить
        </Button>
      </div>
    )
  }
}
