import { contextBridge, ipcRenderer } from 'electron'
import type {
  BackendHealth,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  Workspace
} from '../shared/backend'

const drakoryiaApi = Object.freeze({
  getHealth: (): Promise<BackendHealth> => ipcRenderer.invoke('backend:health'),
  workspaces: Object.freeze({
    selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('workspace:select-directory'),
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list'),
    listArchived: (): Promise<Workspace[]> => ipcRenderer.invoke('workspace:list-archived'),
    create: (input: CreateWorkspaceInput): Promise<Workspace> =>
      ipcRenderer.invoke('workspace:create', input),
    archive: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:archive', id),
    unarchive: (id: string): Promise<Workspace> => ipcRenderer.invoke('workspace:unarchive', id),
    delete: (id: string, input: DeleteWorkspaceInput): Promise<void> =>
      ipcRenderer.invoke('workspace:delete', id, input)
  })
})

contextBridge.exposeInMainWorld('drakoryia', drakoryiaApi)
