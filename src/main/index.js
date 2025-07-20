import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { TerminalManager } from './TerminalManager.js'
import { IPC_EVENTS } from '../shared/events.js'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Clean up terminals when window is closed
  mainWindow.on('closed', () => {
    terminalManager.cleanup()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Initialize terminal manager
const terminalManager = new TerminalManager()

// Set up IPC handlers for terminal operations
ipcMain.handle(IPC_EVENTS.TERMINAL.CREATE, (event, options) => {
  return terminalManager.handleCreateTerminal(event, options)
})

ipcMain.handle(IPC_EVENTS.TERMINAL.WRITE, (event, id, data) => {
  return terminalManager.handleTerminalInput(event, { id, data })
})

ipcMain.handle(IPC_EVENTS.TERMINAL.RESIZE, (event, id, cols, rows) => {
  return terminalManager.handleTerminalResize(event, { id, cols, rows })
})

ipcMain.handle(IPC_EVENTS.TERMINAL.DESTROY, (event, id) => {
  return terminalManager.handleDestroyTerminal(event, { id })
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.cli-buddy')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Clean up terminal processes before quitting
  terminalManager.cleanup()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Clean up terminal processes before quitting
  terminalManager.cleanup()
})