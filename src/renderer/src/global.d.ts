import type {
  BackendHealth,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  Workspace
} from '../../shared/backend'
import type {
  CliKind,
  CliOptions,
  CreateTerminalInput,
  TerminalExitEvent,
  TerminalGeometry,
  TerminalOutputEvent,
  TerminalSnapshot
} from '../../shared/terminals'

declare global {
  interface Window {
    readonly drakoryia: {
      getHealth(): Promise<BackendHealth>
      readonly workspaces: {
        selectDirectory(): Promise<string | null>
        get(id: string): Promise<Workspace>
        list(): Promise<Workspace[]>
        listArchived(): Promise<Workspace[]>
        create(input: CreateWorkspaceInput): Promise<Workspace>
        archive(id: string): Promise<Workspace>
        unarchive(id: string): Promise<Workspace>
        delete(id: string, input: DeleteWorkspaceInput): Promise<void>
      }
      readonly terminals: {
        list(workspaceId: string): Promise<TerminalSnapshot[]>
        options(cli: CliKind, workspaceId: string): Promise<CliOptions>
        create(input: CreateTerminalInput): Promise<TerminalSnapshot>
        close(id: string): Promise<void>
        remove(id: string): Promise<void>
        write(id: string, data: string): void
        resize(id: string, cols: number, rows: number): void
        saveGeometry(id: string, geometry: TerminalGeometry): void
        onOutput(listener: (event: TerminalOutputEvent) => void): () => void
        onExit(listener: (event: TerminalExitEvent) => void): () => void
      }
    }
  }
}

export {}
