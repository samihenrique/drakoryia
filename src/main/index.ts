import 'reflect-metadata'
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { prepareDatabase } from './database/setup'
import { startBackend } from './backend/client'
import type { BackendClient } from './backend/client'
import icon from '../../design/app-icon.png?asset'

let mainWindow: BrowserWindow | undefined
let backend: BackendClient | undefined

// Chromium's wp_color_manager_v1 client rejects the sRGB image description on
// current Wayland compositors and floods stderr on every surface commit.
if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
  app.commandLine.appendSwitch('disable-features', 'WaylandWpColorManagerV1')
}

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

  ipcMain.handle('backend:health', () => {
    if (!backend) {
      throw new Error('The local backend is not running.')
    }

    return backend.getHealth()
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
  void backend?.close()
})
