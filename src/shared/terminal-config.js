/**
 * Terminal Configuration
 * 
 * Centralized configuration for xterm.js terminal instances.
 * This configuration is shared between the TerminalSession component
 * and its tests to ensure consistency.
 */

export const TERMINAL_CONFIG = {
  cursorBlink: true,
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", Monaco, monospace',
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  lineHeight: 1.0,
  letterSpacing: 0,
  scrollback: 1000,
  tabStopWidth: 4,
  theme: {
    // VS Code Dark theme colors
    background: '#1e1e1e',
    foreground: '#cccccc',
    cursor: '#ffffff',
    cursorAccent: '#1e1e1e',
    selection: '#264f78',
    selectionForeground: '#ffffff',
    
    // ANSI colors
    black: '#000000',
    red: '#f14c4c',
    green: '#23d18b',
    yellow: '#f5f543',
    blue: '#3b8eea',
    magenta: '#d670d6',
    cyan: '#29b8db',
    white: '#e5e5e5',
    
    // Bright ANSI colors
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#ffffff'
  }
}

/**
 * Default terminal creation options for IPC communication
 */
export const DEFAULT_TERMINAL_OPTIONS = {
  cols: 80,
  rows: 24
}

/**
 * Terminal history configuration
 */
export const HISTORY_CONFIG = {
  maxHistorySize: 1000
}