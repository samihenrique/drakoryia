export interface BackendHealth {
  readonly status: 'ok'
  readonly service: 'drakoryia-api'
  readonly timestamp: string
}

export interface Workspace {
  readonly id: string
  readonly name: string
  readonly localPath: string
  readonly archivedAt: string | null
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateWorkspaceInput {
  readonly name: string
  readonly localPath: string
}

export interface DeleteWorkspaceInput {
  readonly confirmationName: string
}
