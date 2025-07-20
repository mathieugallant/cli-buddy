import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_EVENTS } from '../shared/events.js'

const api = {
  executeCommand: (command) => ipcRenderer.invoke(IPC_EVENTS.COMMAND.EXECUTE, command),
  onCommandOutput: (callback) => ipcRenderer.on(IPC_EVENTS.COMMAND.OUTPUT, callback),
  removeCommandOutputListener: (callback) => ipcRenderer.removeListener(IPC_EVENTS.COMMAND.OUTPUT, callback),
  terminal: {
    create: (options) => ipcRenderer.invoke(IPC_EVENTS.TERMINAL.CREATE, options),
    write: (id, data) => ipcRenderer.invoke(IPC_EVENTS.TERMINAL.WRITE, id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke(IPC_EVENTS.TERMINAL.RESIZE, id, cols, rows),
    destroy: (id) => ipcRenderer.invoke(IPC_EVENTS.TERMINAL.DESTROY, id),
    onData: (callback) => ipcRenderer.on(IPC_EVENTS.TERMINAL.DATA, callback),
    onExit: (callback) => ipcRenderer.on(IPC_EVENTS.TERMINAL.EXIT, callback),
    onRecovery: (callback) => ipcRenderer.on(IPC_EVENTS.TERMINAL.RECOVERY, callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.electronAPI = api
}