/**
 * Type definitions for IPC event constants
 */

export interface TerminalEvents {
  readonly CREATE: 'terminal:create'
  readonly WRITE: 'terminal:write'
  readonly RESIZE: 'terminal:resize'
  readonly DESTROY: 'terminal:destroy'
  readonly DATA: 'terminal:data'
  readonly EXIT: 'terminal:exit'
  readonly RECOVERY: 'terminal:recovery'
}

export interface CommandEvents {
  readonly EXECUTE: 'execute-command'
  readonly OUTPUT: 'command-output'
}

export interface IPCEvents {
  readonly TERMINAL: TerminalEvents
  readonly COMMAND: CommandEvents
}

export declare const TERMINAL_EVENTS: TerminalEvents
export declare const COMMAND_EVENTS: CommandEvents
export declare const IPC_EVENTS: IPCEvents