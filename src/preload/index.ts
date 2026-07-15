import { contextBridge, ipcRenderer } from 'electron'
import type {
  BackendHealth,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  Workspace
} from '../shared/backend'
import type {
  CliKind,
  CliOptions,
  CreateTerminalInput,
  TerminalExitEvent,
  TerminalGeometry,
  TerminalOutputEvent,
  TerminalSnapshot
} from '../shared/terminals'

function subscribe<T>(channel: string, listener: (event: T) => void): () => void {
  // The IpcRendererEvent is dropped so the renderer never gets a handle on the sender.
  const handler = (_event: unknown, payload: T): void => listener(payload)

  ipcRenderer.on(channel, handler)

  return () => {
    ipcRenderer.off(channel, handler)
  }
}

const drakoryiaApi = Object.freeze({
  getHealth: (): Promise<BackendHealth> => ipcRenderer.invoke('backend:health'),
  workspaces: Object.freeze({
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('workspace:select-directory'),
    get: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:get', id),
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list'),
    listArchived: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list-archived'),
    create: (input: CreateWorkspaceInput): Promise<Workspace> =>
      ipcRenderer.invoke('workspace:create', input),
    archive: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:archive', id),
    unarchive: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:unarchive', id),
    delete: (id: string, input: DeleteWorkspaceInput): Promise<void> =>
      ipcRenderer.invoke('workspace:delete', id, input)
  }),
  terminals: Object.freeze({
    list: (workspaceId: string): Promise<TerminalSnapshot[]> =>
      ipcRenderer.invoke('terminal:list', workspaceId),
    options: (cli: CliKind, workspaceId: string): Promise<CliOptions> =>
      ipcRenderer.invoke('terminal:options', cli, workspaceId),
    create: (input: CreateTerminalInput): Promise<TerminalSnapshot> =>
      ipcRenderer.invoke('terminal:create', input),
    close: (id: string): Promise<void> => ipcRenderer.invoke('terminal:close', id),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('terminal:remove', id),
    write: (id: string, data: string): void => {
      ipcRenderer.send('terminal:input', id, data)
    },
    resize: (id: string, cols: number, rows: number): void => {
      ipcRenderer.send('terminal:resize', id, cols, rows)
    },
    saveGeometry: (id: string, geometry: TerminalGeometry): void => {
      ipcRenderer.send('terminal:save-geometry', id, geometry)
    },
    onOutput: (listener: (event: TerminalOutputEvent) => void): (() => void) =>
      subscribe('terminal:output', listener),
    onExit: (listener: (event: TerminalExitEvent) => void): (() => void) =>
      subscribe('terminal:exit', listener)
  })
})

contextBridge.exposeInMainWorld('drakoryia', drakoryiaApi)
