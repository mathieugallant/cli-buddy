import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TerminalSession from '../TerminalSession.vue'
import { TERMINAL_CONFIG, DEFAULT_TERMINAL_OPTIONS, HISTORY_CONFIG } from '../../../../shared/terminal-config.js'

// Mock xterm.js
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn(() => ({
    open: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
    focus: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    loadAddon: vi.fn(),
    attachCustomKeyEventHandler: vi.fn(),
    cols: 80,
    rows: 24
  }))
}))

// Mock xterm-addon-fit
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn(() => ({
    activate: vi.fn(),
    fit: vi.fn()
  }))
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}))

describe('TerminalSession', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(TerminalSession)
  })

  it('renders terminal session component', () => {
    expect(wrapper.find('.terminal-session').exists()).toBe(true)
    expect(wrapper.find('.terminal-container').exists()).toBe(true)
  })

  it('initializes xterm terminal on mount', async () => {
    const { Terminal } = await import('@xterm/xterm')
    expect(Terminal).toHaveBeenCalled()
    expect(wrapper.vm.terminal).toBeDefined()
  })

  it('calls destroyTerminal on unmount', async () => {
    // Wait for component to be fully mounted and terminal initialized
    await wrapper.vm.$nextTick()
    
    const destroyTerminalSpy = vi.spyOn(wrapper.vm, 'destroyTerminal')
    
    wrapper.unmount()
    
    // Check that destroyTerminal was called
    expect(destroyTerminalSpy).toHaveBeenCalled()
  })

  it('disposes terminal when destroyTerminal is called', async () => {
    // Wait for component to be fully mounted and terminal initialized
    await wrapper.vm.$nextTick()
    
    const disposeSpy = vi.spyOn(wrapper.vm.terminal, 'dispose')
    
    // Manually call destroyTerminal
    await wrapper.vm.destroyTerminal()
    
    expect(disposeSpy).toHaveBeenCalled()
  })

  it('writes welcome message when electronAPI is not available', async () => {
    // Create a new wrapper without electronAPI to test fallback behavior
    const originalElectronAPI = global.window.electronAPI
    delete global.window.electronAPI
    
    const fallbackWrapper = mount(TerminalSession)
    await fallbackWrapper.vm.$nextTick()
    
    expect(fallbackWrapper.vm.terminal.write).toHaveBeenCalledWith('Welcome to CLI Buddy v0.1.0\r\n')
    expect(fallbackWrapper.vm.terminal.write).toHaveBeenCalledWith('Terminal powered by xterm.js\r\n')
    
    // Restore electronAPI
    global.window.electronAPI = originalElectronAPI
    fallbackWrapper.unmount()
  })

  it('loads fit addon and fits terminal', async () => {
    const { FitAddon } = await import('@xterm/addon-fit')
    expect(FitAddon).toHaveBeenCalled()
    expect(wrapper.vm.terminal.loadAddon).toHaveBeenCalled()
    expect(wrapper.vm.fitAddon.fit).toHaveBeenCalled()
  })

  it('opens terminal in container element', () => {
    expect(wrapper.vm.terminal.open).toHaveBeenCalledWith(wrapper.vm.$refs.terminalContainer)
  })

  it('focuses terminal on mount', () => {
    expect(wrapper.vm.terminal.focus).toHaveBeenCalled()
  })

  it('has correct terminal configuration', async () => {
    const { Terminal } = await import('@xterm/xterm')
    expect(Terminal).toHaveBeenCalledWith(TERMINAL_CONFIG)
  })

  it('sets up terminal data handler on mount', () => {
    expect(wrapper.vm.terminal.onData).toHaveBeenCalled()
  })

  it('creates terminal session via IPC on mount', () => {
    // Mock electronAPI
    const mockCreate = vi.fn().mockResolvedValue({ success: true, id: 'test-terminal-id' })
    global.window = { 
      electronAPI: { 
        terminal: { 
          create: mockCreate,
          onData: vi.fn(),
          onExit: vi.fn(),
          destroy: vi.fn()
        } 
      } 
    }
    const wrapper2 = mount(TerminalSession)
    expect(mockCreate).toHaveBeenCalled()
  })

  it('handles terminal data from main process', async () => {
    // Set up terminal ID first
    wrapper.vm.terminalId = 'test-terminal-id'
    
    const testData = { id: 'test-terminal-id', data: 'Hello from terminal' }
    wrapper.vm.handleTerminalData(null, testData)
    expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('Hello from terminal')
  })

  it('sends input data to main process via IPC', async () => {
    const mockWrite = vi.fn()
    global.window = { 
      electronAPI: { 
        terminal: { 
          create: vi.fn().mockResolvedValue({ success: true, id: 'test-terminal-id' }),
          write: mockWrite,
          onData: vi.fn(),
          onExit: vi.fn(),
          destroy: vi.fn()
        } 
      } 
    }
    const wrapper2 = mount(TerminalSession)
    
    // Wait for terminal initialization
    await wrapper2.vm.$nextTick()
    
    const testInput = 'test command'
    wrapper2.vm.handleTerminalInput(testInput)
    expect(mockWrite).toHaveBeenCalledWith('test-terminal-id', testInput)
  })

  it('sets up resize observer on mount', () => {
    expect(wrapper.vm.resizeObserver).toBeDefined()
  })

  it('handles terminal resize', async () => {
    const mockResize = vi.fn()
    global.window = { 
      electronAPI: { 
        terminal: { 
          create: vi.fn().mockResolvedValue({ success: true, id: 'test-terminal-id' }),
          resize: mockResize,
          onData: vi.fn(),
          onExit: vi.fn(),
          destroy: vi.fn()
        } 
      } 
    }
    const wrapper2 = mount(TerminalSession)
    
    // Wait for terminal initialization
    await wrapper2.vm.$nextTick()
    
    // Simulate resize
    wrapper2.vm.handleResize()
    expect(wrapper2.vm.fitAddon.fit).toHaveBeenCalled()
    expect(mockResize).toHaveBeenCalledWith('test-terminal-id', wrapper2.vm.terminal.cols, wrapper2.vm.terminal.rows)
  })

  it('cleans up resize observer on unmount', () => {
    const disconnectSpy = vi.spyOn(wrapper.vm.resizeObserver, 'disconnect')
    wrapper.unmount()
    expect(disconnectSpy).toHaveBeenCalled()
  })

  describe('Terminal History and Shortcuts', () => {
    let wrapper
    let mockWrite

    beforeEach(() => {
      mockWrite = vi.fn()
      global.window = { 
        electronAPI: { 
          terminal: { 
            create: vi.fn().mockResolvedValue({ success: true, id: 'test-terminal-id' }),
            write: mockWrite,
            onData: vi.fn(),
            onExit: vi.fn(),
            resize: vi.fn(),
            destroy: vi.fn()
          } 
        } 
      }
      wrapper = mount(TerminalSession)
    })

    it('initializes command history array', () => {
      expect(wrapper.vm.commandHistory).toEqual([])
      expect(wrapper.vm.historyIndex).toBe(-1)
      expect(wrapper.vm.currentCommand).toBe('')
    })

    it('adds commands to history when Enter is pressed', async () => {
      await wrapper.vm.$nextTick()
      
      // Simulate typing a command
      wrapper.vm.currentCommand = 'ls -la'
      wrapper.vm.handleEnterKey()
      
      expect(wrapper.vm.commandHistory).toContain('ls -la')
      expect(wrapper.vm.historyIndex).toBe(-1)
      expect(wrapper.vm.currentCommand).toBe('')
    })

    it('does not add empty commands to history', async () => {
      await wrapper.vm.$nextTick()
      
      wrapper.vm.currentCommand = ''
      wrapper.vm.handleEnterKey()
      
      expect(wrapper.vm.commandHistory).toEqual([])
    })

    it('does not add duplicate consecutive commands to history', async () => {
      await wrapper.vm.$nextTick()
      
      wrapper.vm.currentCommand = 'ls'
      wrapper.vm.handleEnterKey()
      wrapper.vm.currentCommand = 'ls'
      wrapper.vm.handleEnterKey()
      
      expect(wrapper.vm.commandHistory).toEqual(['ls'])
    })

    it('navigates history with up arrow key', async () => {
      await wrapper.vm.$nextTick()
      
      // Add some commands to history
      wrapper.vm.commandHistory = ['command1', 'command2', 'command3']
      wrapper.vm.currentCommand = 'current'
      
      // Press up arrow
      wrapper.vm.handleUpArrow()
      expect(wrapper.vm.currentCommand).toBe('command3')
      expect(wrapper.vm.historyIndex).toBe(2)
      
      // Press up arrow again
      wrapper.vm.handleUpArrow()
      expect(wrapper.vm.currentCommand).toBe('command2')
      expect(wrapper.vm.historyIndex).toBe(1)
    })

    it('navigates history with down arrow key', async () => {
      await wrapper.vm.$nextTick()
      
      // Add some commands to history and navigate up
      wrapper.vm.commandHistory = ['command1', 'command2', 'command3']
      wrapper.vm.historyIndex = 1
      wrapper.vm.currentCommand = 'command2'
      
      // Press down arrow
      wrapper.vm.handleDownArrow()
      expect(wrapper.vm.currentCommand).toBe('command3')
      expect(wrapper.vm.historyIndex).toBe(2)
      
      // Press down arrow again (should go to empty)
      wrapper.vm.handleDownArrow()
      expect(wrapper.vm.currentCommand).toBe('')
      expect(wrapper.vm.historyIndex).toBe(-1)
    })

    it('handles Ctrl+C to interrupt process', async () => {
      await wrapper.vm.$nextTick()
      
      wrapper.vm.handleCtrlC()
      expect(mockWrite).toHaveBeenCalledWith('test-terminal-id', '\x03')
    })

    it('handles Ctrl+L to clear screen', async () => {
      await wrapper.vm.$nextTick()
      
      wrapper.vm.handleCtrlL()
      expect(wrapper.vm.terminal.clear).toHaveBeenCalled()
    })

    it('processes keyboard shortcuts correctly', async () => {
      await wrapper.vm.$nextTick()
      
      const mockEvent = {
        key: 'c',
        ctrlKey: true,
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleKeyboardShortcut(mockEvent)
      expect(mockEvent.preventDefault).toHaveBeenCalled()
      expect(mockWrite).toHaveBeenCalledWith('test-terminal-id', '\x03')
    })

    it('processes arrow keys correctly', async () => {
      await wrapper.vm.$nextTick()
      
      wrapper.vm.commandHistory = ['test command']
      
      const upArrowEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn()
      }
      
      wrapper.vm.handleKeyboardShortcut(upArrowEvent)
      expect(upArrowEvent.preventDefault).toHaveBeenCalled()
      expect(wrapper.vm.currentCommand).toBe('test command')
    })

    it('limits command history size', async () => {
      await wrapper.vm.$nextTick()
      
      // Add more than max history size
      const testSize = HISTORY_CONFIG.maxHistorySize + 200
      for (let i = 0; i < testSize; i++) {
        wrapper.vm.currentCommand = `command${i}`
        wrapper.vm.handleEnterKey()
      }
      
      expect(wrapper.vm.commandHistory.length).toBe(HISTORY_CONFIG.maxHistorySize)
      expect(wrapper.vm.commandHistory[0]).toBe('command200') // First 200 should be removed
    })
  })

  describe('Error Handling and Recovery', () => {
    let wrapper
    let mockElectronAPI

    beforeEach(() => {
      mockElectronAPI = {
        terminal: {
          create: vi.fn(),
          write: vi.fn(),
          resize: vi.fn(),
          destroy: vi.fn(),
          onData: vi.fn(),
          onExit: vi.fn(),
          onRecovery: vi.fn()
        }
      }
      global.window = { electronAPI: mockElectronAPI }
    })

    it('handles terminal creation failure gracefully', async () => {
      mockElectronAPI.terminal.create.mockRejectedValue(new Error('Failed to create terminal'))
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Should fall back to demo mode
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('Welcome to CLI Buddy v0.1.0\r\n')
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('(Running in demo mode - Failed to create terminal session.)\r\n')
    })

    it('displays error notification when terminal creation fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockElectronAPI.terminal.create.mockRejectedValue(new Error('Permission denied'))
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create terminal session:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('handles terminal process exit gracefully', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ success: true, id: 'test-terminal-id' })
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Simulate terminal exit
      wrapper.vm.handleTerminalExit(null, { id: 'test-terminal-id', code: 0 })
      
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('\r\nProcess exited with code 0\r\n')
    })

    it('handles terminal process crash with error code', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ success: true, id: 'test-terminal-id' })
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Simulate terminal crash
      wrapper.vm.handleTerminalExit(null, { id: 'test-terminal-id', code: 1 })
      
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('\r\nProcess exited with code 1\r\n')
    })

    it('handles recovery notifications from main process', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ success: true, id: 'test-terminal-id' })
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Simulate recovery notification with matching terminal ID
      wrapper.vm.handleRecoveryNotification(null, { id: 'test-terminal-id', status: 'recovering' })
      
      expect(wrapper.vm.recoveryStatus).toBe('recovering')
    })

    it('displays recovery status to user', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue('test-terminal-id')
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Set recovery status
      wrapper.vm.recoveryStatus = 'recovering'
      await wrapper.vm.$nextTick()
      
      expect(wrapper.find('.recovery-status').exists()).toBe(true)
      expect(wrapper.find('.recovery-status').text()).toContain('Terminal recovering...')
    })

    it('handles IPC communication errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockElectronAPI.terminal.create.mockResolvedValue('test-terminal-id')
      mockElectronAPI.terminal.write.mockRejectedValue(new Error('IPC error'))
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Try to send input that will fail
      await wrapper.vm.handleTerminalInput('test')
      
      // Should handle error gracefully without crashing
      expect(wrapper.vm.terminal).toBeDefined()
      consoleSpy.mockRestore()
    })

    it('cleans up properly when terminal destruction fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockElectronAPI.terminal.create.mockResolvedValue({ success: true, id: 'test-terminal-id' })
      mockElectronAPI.terminal.destroy.mockRejectedValue(new Error('Destroy failed'))
      
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()
      
      // Destroy terminal should handle error gracefully
      await wrapper.vm.destroyTerminal()
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to destroy terminal session:', expect.any(Error))
      expect(wrapper.vm.terminal).toBeNull()
      consoleSpy.mockRestore()
    })
  })
})