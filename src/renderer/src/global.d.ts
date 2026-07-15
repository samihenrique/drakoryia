import type { BackendHealth } from '../../shared/backend'

declare global {
  interface Window {
    readonly drakoryia: {
      getHealth(): Promise<BackendHealth>
    }
  }
}

export {}
