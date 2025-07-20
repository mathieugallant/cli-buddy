<template>
  <div class="terminal-session">
    <div v-if="errorMessage" class="error-banner">
      <span class="error-icon">⚠️</span>
      {{ errorMessage }}
    </div>
    <div v-if="recoveryStatus" class="recovery-status">
      <span class="recovery-icon">🔄</span>
      Terminal recovering...
    </div>
    <div class="terminal-container" ref="terminalContainer"></div>
  </div>
</template>

<script>
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { TERMINAL_CONFIG, DEFAULT_TERMINAL_OPTIONS, HISTORY_CONFIG } from '../../../shared/terminal-config.js'

export default {
  name: 'TerminalSession',
  data() {
    return {
      terminal: null,
      fitAddon: null,
      terminalId: null,
      resizeObserver: null,
      commandHistory: [],
      historyIndex: -1,
      currentCommand: '',
      recoveryStatus: null,
      errorMessage: null,
      isInDemoMode: false
    }
  },
  methods: {
    async initializeTerminal() {
      // Create terminal instance with shared configuration
      this.terminal = new Terminal(TERMINAL_CONFIG)

      // Create fit addon
      this.fitAddon = new FitAddon()
      this.terminal.loadAddon(this.fitAddon)

      // Open terminal in container
      this.terminal.open(this.$refs.terminalContainer)

      // Fit terminal to container
      this.fitAddon.fit()

      // Set up input handling
      this.terminal.onData(this.handleTerminalInput)

      // Set up keyboard event handling for shortcuts and history
      this.terminal.attachCustomKeyEventHandler(this.handleKeyboardShortcut)

      // Create terminal session via IPC
      if (window.electronAPI?.terminal) {
        try {
          const result = await window.electronAPI.terminal.create({
            cols: this.terminal.cols || DEFAULT_TERMINAL_OPTIONS.cols,
            rows: this.terminal.rows || DEFAULT_TERMINAL_OPTIONS.rows
          })
          
          if (result.success) {
            this.terminalId = result.id
          } else {
            throw new Error(result.error || 'Failed to create terminal')
          }

          // Set up data listeners
          window.electronAPI.terminal.onData(this.handleTerminalData)
          window.electronAPI.terminal.onExit(this.handleTerminalExit)

          // Set up recovery listener if available
          if (window.electronAPI.terminal.onRecovery) {
            window.electronAPI.terminal.onRecovery(this.handleRecoveryNotification)
          }
        } catch (error) {
          console.error('Failed to create terminal session:', error)
          this.handleTerminalCreationError(error)
        }
      } else {
        // Fallback for testing or when electronAPI is not available
        this.enterDemoMode('ElectronAPI not available')
      }

      // Set up resize observer
      this.setupResizeObserver()

      // Focus terminal
      this.terminal.focus()
    },

    setupResizeObserver() {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.handleResize()
        })

        if (this.$refs.terminalContainer) {
          this.resizeObserver.observe(this.$refs.terminalContainer)
        }
      }
    },

    async handleResize() {
      if (this.fitAddon && this.terminal) {
        // Fit terminal to container
        this.fitAddon.fit()

        // Notify main process of resize
        if (this.terminalId && window.electronAPI?.terminal && !this.isInDemoMode) {
          try {
            await window.electronAPI.terminal.resize(
              this.terminalId,
              this.terminal.cols,
              this.terminal.rows
            )
          } catch (error) {
            console.error('Failed to resize terminal:', error)
            this.handleIpcError(error)
          }
        }
      }
    },

    async handleTerminalInput(data) {
      // Track current command for history management
      if (data === '\r' || data === '\n') {
        // Enter key pressed - this will be handled by the keyboard handler
        this.handleEnterKey()
      } else if (data === '\x7f' || data === '\b') {
        // Backspace - remove last character from current command
        this.currentCommand = this.currentCommand.slice(0, -1)
      } else if (data.charCodeAt(0) >= 32) {
        // Printable character - add to current command
        this.currentCommand += data
      }

      if (this.terminalId && window.electronAPI?.terminal && !this.isInDemoMode) {
        try {
          await window.electronAPI.terminal.write(this.terminalId, data)
        } catch (error) {
          console.error('Failed to send input to terminal:', error)
          this.handleIpcError(error)
        }
      }
    },

    handleTerminalData(event, data) {
      if (this.terminal && data.id === this.terminalId) {
        this.terminal.write(data.data)
      }
    },

    handleTerminalExit(event, data) {
      if (this.terminal && data.id === this.terminalId) {
        this.terminal.write(`\r\nProcess exited with code ${data.code}\r\n`)
      }
    },

    handleKeyboardShortcut(event) {
      // Handle keyboard shortcuts and history navigation
      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'c':
            event.preventDefault()
            this.handleCtrlC()
            return false
          case 'l':
            event.preventDefault()
            this.handleCtrlL()
            return false
        }
      }

      // Handle arrow keys for history navigation
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.handleUpArrow()
        return false
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.handleDownArrow()
        return false
      } else if (event.key === 'Enter') {
        // Handle Enter key for command history
        this.handleEnterKey()
      }

      // Allow other keys to be processed normally
      return true
    },

    handleCtrlC() {
      // Send interrupt signal (Ctrl+C)
      if (this.terminalId && window.electronAPI?.terminal) {
        window.electronAPI.terminal.write(this.terminalId, '\x03')
      }
    },

    handleCtrlL() {
      // Clear screen
      if (this.terminal) {
        this.terminal.clear()
      }
    },

    handleUpArrow() {
      // Navigate up in command history
      if (this.commandHistory.length === 0) return

      if (this.historyIndex === -1) {
        // First time pressing up, go to last command
        this.historyIndex = this.commandHistory.length - 1
      } else if (this.historyIndex > 0) {
        // Go to previous command
        this.historyIndex--
      }

      if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
        this.currentCommand = this.commandHistory[this.historyIndex]
        this.replaceCurrentLine()
      }
    },

    handleDownArrow() {
      // Navigate down in command history
      if (this.commandHistory.length === 0 || this.historyIndex === -1) return

      if (this.historyIndex < this.commandHistory.length - 1) {
        // Go to next command
        this.historyIndex++
        this.currentCommand = this.commandHistory[this.historyIndex]
        this.replaceCurrentLine()
      } else {
        // Go to empty command (beyond history)
        this.historyIndex = -1
        this.currentCommand = ''
        this.replaceCurrentLine()
      }
    },

    handleEnterKey() {
      // Add command to history when Enter is pressed
      const command = this.currentCommand.trim()

      if (command && (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== command)) {
        // Add to history if it's not empty and not a duplicate of the last command
        this.commandHistory.push(command)

        // Limit history size
        if (this.commandHistory.length > HISTORY_CONFIG.maxHistorySize) {
          this.commandHistory = this.commandHistory.slice(-HISTORY_CONFIG.maxHistorySize)
        }
      }

      // Reset history navigation
      this.historyIndex = -1
      this.currentCommand = ''
    },

    replaceCurrentLine() {
      // Replace the current line with the command from history
      if (this.terminal) {
        // Move cursor to beginning of line and clear it
        this.terminal.write('\r\x1b[K')
        // Write the prompt and command
        this.terminal.write('$ ' + this.currentCommand)
      }
    },

    async destroyTerminal() {
      // Clean up resize observer
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }

      // Clean up terminal session
      if (this.terminalId && window.electronAPI?.terminal && !this.isInDemoMode) {
        try {
          await window.electronAPI.terminal.destroy(this.terminalId)
        } catch (error) {
          console.error('Failed to destroy terminal session:', error)
        }
      }

      // Clean up terminal instance
      if (this.terminal) {
        this.terminal.dispose()
        this.terminal = null
      }

      this.fitAddon = null
      this.terminalId = null
      this.recoveryStatus = null
      this.errorMessage = null
    },

    handleTerminalCreationError(error) {
      console.error('Failed to create terminal session:', error)

      // Determine error type and show appropriate message
      if (error.message.includes('Permission denied')) {
        this.errorMessage = 'Permission denied. Please check terminal permissions.'
      } else if (error.message.includes('Shell not found')) {
        this.errorMessage = 'Default shell not found. Using fallback mode.'
      } else {
        this.errorMessage = 'Failed to create terminal session.'
      }

      this.enterDemoMode(this.errorMessage)
    },

    enterDemoMode(reason) {
      this.isInDemoMode = true
      this.terminal.write('Welcome to CLI Buddy v0.1.0\r\n')
      this.terminal.write('Terminal powered by xterm.js\r\n')
      this.terminal.write(`(Running in demo mode - ${reason})\r\n`)
      this.terminal.write('\r\n')
    },

    handleRecoveryNotification(event, data) {
      if (data.id === this.terminalId) {
        this.recoveryStatus = data.status

        if (data.status === 'recovering') {
          this.terminal.write('\r\n[Terminal recovering...]\r\n')
        } else if (data.status === 'recovered') {
          this.terminal.write('\r\n[Terminal recovered successfully]\r\n')
          this.recoveryStatus = null
        } else if (data.status === 'disabled') {
          this.terminal.write('\r\n[Terminal disabled due to repeated crashes]\r\n')
          this.errorMessage = 'Terminal disabled due to repeated crashes'
        }
      }
    },

    handleIpcError(error) {
      console.error('IPC communication error:', error)

      // If we lose IPC connection, switch to demo mode
      if (error.message.includes('IPC') || error.message.includes('connection')) {
        this.enterDemoMode('Lost connection to main process')
      }
    }
  },

  mounted() {
    this.initializeTerminal()
  },

  beforeUnmount() {
    this.destroyTerminal()
  }
}
</script>

<style scoped>

/* Component-specific variables */
:root {
  --terminal-error-bg: #f14c4c;
  --terminal-warning-bg: #ffcc02;
  --terminal-border: #3e3e42;
}

.terminal-session {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vscode-terminal-background);
  border: 1px solid var(--terminal-border);
  border-radius: 0;
  overflow: hidden;
}

/* Status banners with VS Code styling */
.error-banner {
  background: var(--terminal-error-bg);
  color: #ffffff;
  padding: 8px 16px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.error-icon {
  font-size: 14px;
  opacity: 0.9;
}

.recovery-status {
  background: var(--terminal-warning-bg);
  color: #1e1e1e;
  padding: 6px 16px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  animation: pulse 2s infinite;
}

.recovery-icon {
  font-size: 12px;
  animation: spin 1.5s linear infinite;
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Terminal container with proper VS Code integration */
.terminal-container {
  flex: 1;
  position: relative;
  background: var(--vscode-terminal-background);
  padding: 0;
  overflow: hidden;
}

/* Override xterm.js styles to match VS Code */
.terminal-container :deep(.xterm) {
  padding: 8px 12px;
  font-feature-settings: "liga" 0;
  position: relative;
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
}

.terminal-container :deep(.xterm.focus) {
  outline: none;
}

.terminal-container :deep(.xterm .xterm-viewport) {
  background-color: var(--vscode-terminal-background);
  overflow-y: scroll;
  cursor: default;
  position: absolute;
  right: 0;
  left: 0;
  top: 0;
  bottom: 0;
}

.terminal-container :deep(.xterm .xterm-screen) {
  position: relative;
}

.terminal-container :deep(.xterm .xterm-screen canvas) {
  position: absolute;
  left: 0;
  top: 0;
}

/* Custom scrollbar to match VS Code */
.terminal-container :deep(.xterm .xterm-viewport)::-webkit-scrollbar {
  width: 10px;
  background-color: transparent;
}

.terminal-container :deep(.xterm .xterm-viewport)::-webkit-scrollbar-thumb {
  background-color: #424242;
  border-radius: 5px;
  border: 2px solid var(--vscode-terminal-background);
}

.terminal-container :deep(.xterm .xterm-viewport)::-webkit-scrollbar-thumb:hover {
  background-color: #4a4a4a;
}

.terminal-container :deep(.xterm .xterm-viewport)::-webkit-scrollbar-track {
  background-color: transparent;
}

/* Selection styling to match VS Code */
.terminal-container :deep(.xterm .xterm-selection div) {
  background-color: #264f78;
  position: absolute;
  pointer-events: none;
}

/* Cursor styling */
.terminal-container :deep(.xterm .xterm-cursor-layer) {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.terminal-container :deep(.xterm .xterm-cursor-layer .xterm-cursor) {
  background-color: #ffffff;
  color: var(--vscode-terminal-background);
}

.terminal-container :deep(.xterm .xterm-cursor-layer .xterm-cursor.xterm-cursor-blink) {
  animation: blink 1s linear infinite;
}

.terminal-container :deep(.xterm .xterm-cursor-layer .xterm-cursor.xterm-cursor-blink.xterm-cursor-blink-on) {
  animation: none;
  background-color: #ffffff;
  color: var(--vscode-terminal-background);
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Focus ring for accessibility */
.terminal-container:focus-within {
  outline: 1px solid var(--vscode-info-background);
  outline-offset: -1px;
}

/* Responsive design */
@media (max-width: 768px) {
  .terminal-container :deep(.xterm) {
    padding: 4px 8px;
  }
  
  .error-banner,
  .recovery-status {
    padding-left: 12px;
    padding-right: 12px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .terminal-session {
    border-color: #ffffff;
    border-width: 2px;
  }
  
  .terminal-container :deep(.xterm .xterm-cursor-layer .xterm-cursor) {
    background-color: #ffffff;
    border: 1px solid #000000;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .recovery-status {
    animation: none;
  }
  
  .recovery-icon {
    animation: none;
  }
  
  .terminal-container :deep(.xterm .xterm-cursor-layer .xterm-cursor.xterm-cursor-blink) {
    animation: none;
    opacity: 1;
  }
}
</style>