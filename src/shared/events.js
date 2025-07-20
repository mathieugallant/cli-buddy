/**
 * Centralized event constants for IPC communication
 * This ensures consistency between main, preload, and renderer processes
 */

export const TERMINAL_EVENTS = {
  // IPC invoke events (request/response)
  CREATE: 'terminal:create',
  WRITE: 'terminal:write',
  RESIZE: 'terminal:resize',
  DESTROY: 'terminal:destroy',
  
  // IPC send events (one-way notifications)
  DATA: 'terminal:data',
  EXIT: 'terminal:exit',
  RECOVERY: 'terminal:recovery'
}

export const COMMAND_EVENTS = {
  EXECUTE: 'execute-command',
  OUTPUT: 'command-output'
}

// Export all events as a single object for convenience
export const IPC_EVENTS = {
  TERMINAL: TERMINAL_EVENTS,
  COMMAND: COMMAND_EVENTS
}