import { contextBridge, ipcRenderer } from 'electron'
import type { BackendHealth } from '../shared/backend'

const drakoryiaApi = Object.freeze({
  getHealth: (): Promise<BackendHealth> => ipcRenderer.invoke('backend:health')
})

contextBridge.exposeInMainWorld('drakoryia', drakoryiaApi)
