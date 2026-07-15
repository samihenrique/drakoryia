import type {
  BackendHealth,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  Workspace
} from '../../shared/backend'

declare global {
  interface Window {
    readonly drakoryia: {
      getHealth(): Promise<BackendHealth>
      readonly workspaces: {
        selectDirectory(): Promise<string | null>
        list(): Promise<Workspace[]>
        listArchived(): Promise<Workspace[]>
        create(input: CreateWorkspaceInput): Promise<Workspace>
        archive(id: string): Promise<Workspace>
        unarchive(id: string): Promise<Workspace>
        delete(id: string, input: DeleteWorkspaceInput): Promise<void>
      }
    }
  }
}

export {}
