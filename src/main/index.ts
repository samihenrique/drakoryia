import 'reflect-metadata'
import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { prepareDatabase } from './database/setup'
import { startBackend } from './backend/client'
import type { BackendClient } from './backend/client'
import { TerminalManager } from './terminals/terminal-manager'
import type { CreateWorkspaceInput, DeleteWorkspaceInput } from '../shared/backend'
import type {
  CliKind,
  CreateTerminalInput,
  TerminalExitEvent,
  TerminalGeometry,
  TerminalOutputEvent
} from '../shared/terminals'
import icon from '../../design/app-icon.png?asset'

let mainWindow: BrowserWindow | undefined
let backend: BackendClient | undefined
let terminals: TerminalManager | undefined

function requireTerminals(): TerminalManager {
  if (!terminals) {
    throw new Error('The terminal manager is not running.')
  }

  return terminals
}

// Terminal output keeps streaming after the window is gone, and a destroyed
// window throws on `.webContents` instead of reading as undefined.
function sendToRenderer(channel: string, payload: unknown): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
    return
  }

  mainWindow.webContents.send(channel, payload)
}

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
  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  const rendererOrigin = rendererUrl ? new URL(rendererUrl).origin : null

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

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (rendererOrigin && new URL(navigationUrl).origin === rendererOrigin) {
      return
    }

    event.preventDefault()
  })

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
    return
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

async function bootstrap(): Promise<void> {
  const databaseUrl = await prepareDatabase()
  backend = await startBackend(databaseUrl)
  terminals = new TerminalManager((id) => requireBackend().getWorkspace(id))

  terminals.events.on('output', (event: TerminalOutputEvent) => {
    sendToRenderer('terminal:output', event)
  })

  terminals.events.on('exit', (event: TerminalExitEvent) => {
    sendToRenderer('terminal:exit', event)
  })

  ipcMain.handle('backend:health', () => requireBackend().getHealth())
  ipcMain.handle('workspace:get', (_event, id: string) => requireBackend().getWorkspace(id))
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

  ipcMain.handle('terminal:list', (_event, workspaceId: string) =>
    requireTerminals().list(workspaceId)
  )
  ipcMain.handle('terminal:options', (_event, cli: CliKind, workspaceId: string) =>
    requireTerminals().options(cli, workspaceId)
  )
  ipcMain.handle('terminal:create', (_event, input: CreateTerminalInput) =>
    requireTerminals().create(input)
  )
  ipcMain.handle('terminal:close', (_event, id: string) => {
    requireTerminals().close(id)
  })
  ipcMain.handle('terminal:remove', (_event, id: string) => {
    requireTerminals().remove(id)
  })

  // Keystrokes, resizes and layout saves are high frequency and fire-and-forget,
  // so they skip the invoke round trip.
  ipcMain.on('terminal:input', (_event, id: string, data: string) => {
    terminals?.write(id, data)
  })
  ipcMain.on('terminal:resize', (_event, id: string, cols: number, rows: number) => {
    terminals?.resize(id, cols, rows)
  })
  ipcMain.on('terminal:save-geometry', (_event, id: string, geometry: TerminalGeometry) => {
    terminals?.saveGeometry(id, geometry)
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
  terminals?.disposeAll()

  ipcMain.removeHandler('backend:health')
  ipcMain.removeHandler('workspace:get')
  ipcMain.removeHandler('workspace:list')
  ipcMain.removeHandler('workspace:list-archived')
  ipcMain.removeHandler('workspace:create')
  ipcMain.removeHandler('workspace:archive')
  ipcMain.removeHandler('workspace:unarchive')
  ipcMain.removeHandler('workspace:delete')
  ipcMain.removeHandler('workspace:select-directory')
  ipcMain.removeHandler('terminal:list')
  ipcMain.removeHandler('terminal:options')
  ipcMain.removeHandler('terminal:create')
  ipcMain.removeHandler('terminal:close')
  ipcMain.removeHandler('terminal:remove')
  ipcMain.removeAllListeners('terminal:input')
  ipcMain.removeAllListeners('terminal:resize')
  ipcMain.removeAllListeners('terminal:save-geometry')
  void backend?.close()
})
