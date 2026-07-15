import 'reflect-metadata'
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { prepareDatabase } from './database/setup'
import { startBackend } from './backend/client'
import type { BackendClient } from './backend/client'
import type { CreateWorkspaceInput, DeleteWorkspaceInput } from '../shared/backend'
import icon from '../../design/app-icon.png?asset'

let mainWindow: BrowserWindow | undefined
let backend: BackendClient | undefined

function requireBackend(): BackendClient {
  if (!backend) {
    throw new Error('The local backend is not running.')
  }

  return backend
}

// Chromium's wp_color_manager_v1 client rejects the sRGB image description on
// current Wayland compositors and floods stderr on every surface commit.
if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('disable-features', 'WaylandWpColorManagerV1')
}

Menu.setApplicationMenu(null)

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Drakoryia',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  const rendererUrl = process.env.ELECTRON_RENDERER_URL

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
    return
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

async function bootstrap(): Promise<void> {
  const databaseUrl = await prepareDatabase()
  backend = await startBackend(databaseUrl)

  ipcMain.handle('backend:health', () => requireBackend().getHealth())
  ipcMain.handle('workspace:list', () => requireBackend().listWorkspaces())
  ipcMain.handle('workspace:list-archived', () => requireBackend().listArchivedWorkspaces())
  ipcMain.handle('workspace:create', (_event, input: CreateWorkspaceInput) =>
    requireBackend().createWorkspace(input)
  )
  ipcMain.handle('workspace:archive', (_event, id: string) => requireBackend().archiveWorkspace(id))
  ipcMain.handle('workspace:unarchive', (_event, id: string) => requireBackend().unarchiveWorkspace(id))
  ipcMain.handle('workspace:delete', (_event, id: string, input: DeleteWorkspaceInput) =>
    requireBackend().deleteWorkspace(id, input)
  )
  ipcMain.handle('workspace:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select a workspace folder',
      properties: ['openDirectory']
    })

    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  createWindow()
}

void app
  .whenReady()
  .then(bootstrap)
  .catch((error: unknown) => {
    console.error('Unable to start Drakoryia.', error)
    app.quit()
  })

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  ipcMain.removeHandler('backend:health')
  ipcMain.removeHandler('workspace:list')
  ipcMain.removeHandler('workspace:list-archived')
  ipcMain.removeHandler('workspace:create')
  ipcMain.removeHandler('workspace:archive')
  ipcMain.removeHandler('workspace:unarchive')
  ipcMain.removeHandler('workspace:delete')
  ipcMain.removeHandler('workspace:select-directory')
  void backend?.close()
})
