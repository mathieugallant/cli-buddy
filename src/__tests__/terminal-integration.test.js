import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TerminalSession from '../renderer/src/components/TerminalSession.vue'
import { TerminalManager } from '../main/TerminalManager.js'
import * as pty from 'node-pty'
import * as os from 'os'

// Mock node-pty for controlled testing
vi.mock('node-pty', () => ({
  spawn: vi.fn()
}))

// Mock os module
vi.mock('os', () => ({
  platform: vi.fn(),
  homedir: vi.fn()
}))

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

describe('Terminal Integration Tests', () => {
  let terminalManager
  let mockPtyProcess
  let wrapper
  let mockElectronAPI

  beforeEach(() => {
    // Set up terminal manager
    terminalManager = new TerminalManager()
    
    // Set up mock pty process
    mockPtyProcess = {
      pid: 1234,
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn()
    }
    
    // Set up mock electron API
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
    
    // Set up OS mocks
    os.platform.mockReturnValue('darwin')
    os.homedir.mockReturnValue('/Users/testuser')
    pty.spawn.mockReturnValue(mockPtyProcess)
    
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    terminalManager.cleanup()
  })

  describe('End-to-End Terminal Workflow', () => {
    it('should complete full terminal session lifecycle', async () => {
      // Mock successful terminal creation
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'test-terminal-id' 
      })

      // Mount component
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Verify terminal initialization
      expect(wrapper.vm.terminal).toBeDefined()
      expect(wrapper.vm.fitAddon).toBeDefined()
      expect(mockElectronAPI.terminal.create).toHaveBeenCalledWith({
        cols: 80,
        rows: 24
      })

      // Verify event listeners are set up
      expect(mockElectronAPI.terminal.onData).toHaveBeenCalled()
      expect(mockElectronAPI.terminal.onExit).toHaveBeenCalled()

      // Simulate user input
      const testCommand = 'ls -la\r'
      await wrapper.vm.handleTerminalInput(testCommand)

      // Verify input is sent to main process
      expect(mockElectronAPI.terminal.write).toHaveBeenCalledWith(
        'test-terminal-id',
        testCommand
      )

      // Simulate terminal output from main process
      const testOutput = 'total 8\ndrwxr-xr-x  3 user  staff   96 Jan  1 12:00 .\n'
      wrapper.vm.handleTerminalData(null, {
        id: 'test-terminal-id',
        data: testOutput
      })

      // Verify output is written to terminal
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(testOutput)

      // Simulate terminal resize
      wrapper.vm.terminal.cols = 120
      wrapper.vm.terminal.rows = 40
      await wrapper.vm.handleResize()

      // Verify resize is communicated to main process
      expect(mockElectronAPI.terminal.resize).toHaveBeenCalledWith(
        'test-terminal-id',
        120,
        40
      )

      // Simulate process exit
      wrapper.vm.handleTerminalExit(null, {
        id: 'test-terminal-id',
        code: 0
      })

      // Verify exit message is displayed
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(
        '\r\nProcess exited with code 0\r\n'
      )

      // Clean up
      await wrapper.vm.destroyTerminal()

      // Verify cleanup
      expect(mockElectronAPI.terminal.destroy).toHaveBeenCalledWith('test-terminal-id')
      expect(wrapper.vm.terminal).toBeNull()
    })

    it('should handle command execution with real shell process interaction', async () => {
      // Create a real terminal session through TerminalManager
      const terminalId = terminalManager.createTerminal({
        shell: '/bin/bash',
        cwd: '/tmp'
      })

      expect(terminalId).toBeDefined()
      expect(pty.spawn).toHaveBeenCalledWith('/bin/bash', [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd: '/tmp',
        env: process.env
      })

      // Simulate command execution
      const command = 'echo "Hello World"\n'
      terminalManager.writeToTerminal(terminalId, command)

      expect(mockPtyProcess.write).toHaveBeenCalledWith(command)

      // Simulate process data event
      const dataCall = mockPtyProcess.on.mock.calls.find(
        call => call[0] === 'data'
      )
      
      if (dataCall && dataCall[1]) {
        dataCall[1]('Hello World\r\n')
      }

      // Simulate process exit
      const exitCall = mockPtyProcess.on.mock.calls.find(
        call => call[0] === 'exit'
      )
      
      if (exitCall && exitCall[1]) {
        exitCall[1](0, null)
      }

      // Clean up
      terminalManager.destroyTerminal(terminalId)
      expect(mockPtyProcess.removeAllListeners).toHaveBeenCalled()
      expect(mockPtyProcess.kill).toHaveBeenCalled()
    })

    it('should handle terminal session recovery workflow', async () => {
      // Mock terminal creation with recovery support
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'recovery-test-id' 
      })

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Simulate terminal crash recovery notification
      wrapper.vm.handleRecoveryNotification(null, {
        id: 'recovery-test-id',
        status: 'recovering'
      })

      expect(wrapper.vm.recoveryStatus).toBe('recovering')
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(
        '\r\n[Terminal recovering...]\r\n'
      )

      // Simulate successful recovery
      wrapper.vm.handleRecoveryNotification(null, {
        id: 'recovery-test-id',
        status: 'recovered'
      })

      expect(wrapper.vm.recoveryStatus).toBeNull()
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(
        '\r\n[Terminal recovered successfully]\r\n'
      )

      // Simulate terminal disabled due to crash loop
      wrapper.vm.handleRecoveryNotification(null, {
        id: 'recovery-test-id',
        status: 'disabled'
      })

      expect(wrapper.vm.errorMessage).toBe('Terminal disabled due to repeated crashes')
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(
        '\r\n[Terminal disabled due to repeated crashes]\r\n'
      )
    })

    it('should handle complete command history workflow', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'history-test-id' 
      })

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Execute several commands
      const commands = ['ls', 'pwd', 'echo "test"', 'cat file.txt']
      
      for (const command of commands) {
        wrapper.vm.currentCommand = command
        wrapper.vm.handleEnterKey()
      }

      expect(wrapper.vm.commandHistory).toEqual(commands)

      // Test history navigation
      wrapper.vm.handleUpArrow()
      expect(wrapper.vm.currentCommand).toBe('cat file.txt')
      expect(wrapper.vm.historyIndex).toBe(3)

      wrapper.vm.handleUpArrow()
      expect(wrapper.vm.currentCommand).toBe('echo "test"')
      expect(wrapper.vm.historyIndex).toBe(2)

      wrapper.vm.handleDownArrow()
      expect(wrapper.vm.currentCommand).toBe('cat file.txt')
      expect(wrapper.vm.historyIndex).toBe(3)

      wrapper.vm.handleDownArrow()
      expect(wrapper.vm.currentCommand).toBe('')
      expect(wrapper.vm.historyIndex).toBe(-1)

      // Test keyboard shortcuts
      wrapper.vm.handleCtrlC()
      expect(mockElectronAPI.terminal.write).toHaveBeenCalledWith(
        'history-test-id',
        '\x03'
      )

      wrapper.vm.handleCtrlL()
      expect(wrapper.vm.terminal.clear).toHaveBeenCalled()
    })

    it('should handle terminal creation failure and fallback gracefully', async () => {
      // Mock terminal creation failure
      mockElectronAPI.terminal.create.mockRejectedValue(
        new Error('Permission denied')
      )

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Should enter demo mode
      expect(wrapper.vm.isInDemoMode).toBe(true)
      expect(wrapper.vm.errorMessage).toBe('Permission denied. Please check terminal permissions.')
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith('Welcome to CLI Buddy v0.1.0\r\n')
      expect(wrapper.vm.terminal.write).toHaveBeenCalledWith(
        '(Running in demo mode - Permission denied. Please check terminal permissions.)\r\n'
      )
    })

    it('should handle IPC communication errors during operation', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'ipc-error-test-id' 
      })

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Mock IPC error during write operation
      mockElectronAPI.terminal.write.mockRejectedValue(
        new Error('IPC connection lost')
      )

      // Try to send input
      await wrapper.vm.handleTerminalInput('test command\r')

      // Should handle error gracefully and switch to demo mode
      expect(wrapper.vm.isInDemoMode).toBe(true)
    })

    it('should handle terminal resize during active session', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'resize-test-id' 
      })

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Simulate window resize
      wrapper.vm.terminal.cols = 100
      wrapper.vm.terminal.rows = 30

      await wrapper.vm.handleResize()

      // Verify fit addon is called
      expect(wrapper.vm.fitAddon.fit).toHaveBeenCalled()

      // Verify resize is communicated to main process
      expect(mockElectronAPI.terminal.resize).toHaveBeenCalledWith(
        'resize-test-id',
        100,
        30
      )
    })
  })

  describe('Real Shell Process Integration', () => {
    it('should create and manage real shell processes', () => {
      // Test different platforms
      const platforms = [
        { platform: 'darwin', expectedShell: '/bin/zsh' },
        { platform: 'linux', expectedShell: '/bin/bash' },
        { platform: 'win32', expectedShell: 'powershell.exe' }
      ]

      platforms.forEach(({ platform, expectedShell }) => {
        os.platform.mockReturnValue(platform)
        
        const shell = terminalManager.detectShell()
        expect(shell).toBe(expectedShell)
      })
    })

    it('should handle shell fallback mechanisms', () => {
      // Test shell fallback when primary shell fails
      pty.spawn
        .mockImplementationOnce(() => {
          throw new Error('Shell not found')
        })
        .mockImplementationOnce(() => mockPtyProcess)

      const terminalId = terminalManager.createTerminalWithFallback()
      expect(terminalId).toBeDefined()
      expect(pty.spawn).toHaveBeenCalledTimes(2)
    })

    it('should handle process crash and recovery', async () => {
      const terminalId = terminalManager.createTerminalWithFallback()
      
      // Simulate process crash
      terminalManager.handleProcessCrash(terminalId, 1, null)
      
      expect(terminalManager.getTerminalStatus(terminalId)).toBe('recovering')
      
      // Wait for recovery attempt
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      // Should attempt to create new process
      expect(pty.spawn).toHaveBeenCalledTimes(2)
    })

    it('should detect and handle crash loops', () => {
      const terminalId = terminalManager.createTerminalWithFallback()
      
      // Simulate multiple crashes
      for (let i = 0; i < 5; i++) {
        terminalManager.recordCrash(terminalId)
      }
      
      expect(terminalManager.isInCrashLoop(terminalId)).toBe(true)
      
      // Trigger crash handling
      terminalManager.handleProcessCrash(terminalId, 1, null)
      
      expect(terminalManager.getTerminalStatus(terminalId)).toBe('disabled')
    })
  })

  describe('Terminal Session Lifecycle', () => {
    it('should properly initialize and cleanup terminal sessions', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'lifecycle-test-id' 
      })

      // Initialize
      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Verify initialization
      expect(wrapper.vm.terminal).toBeDefined()
      expect(wrapper.vm.terminalId).toBe('lifecycle-test-id')
      expect(wrapper.vm.resizeObserver).toBeDefined()

      // Cleanup
      await wrapper.vm.destroyTerminal()

      // Verify cleanup
      expect(wrapper.vm.terminal).toBeNull()
      expect(wrapper.vm.terminalId).toBeNull()
      expect(wrapper.vm.resizeObserver).toBeNull()
    })

    it('should handle multiple terminal sessions', () => {
      const terminalIds = []
      
      // Create multiple terminals
      for (let i = 0; i < 3; i++) {
        const id = terminalManager.createTerminal()
        terminalIds.push(id)
      }

      expect(terminalIds).toHaveLength(3)
      expect(terminalManager.terminals.size).toBe(3)

      // Write to each terminal
      terminalIds.forEach((id, index) => {
        terminalManager.writeToTerminal(id, `command ${index}\n`)
        expect(mockPtyProcess.write).toHaveBeenCalledWith(`command ${index}\n`)
      })

      // Cleanup all terminals
      terminalManager.cleanup()
      expect(terminalManager.terminals.size).toBe(0)
    })

    it('should handle terminal destruction during active operations', async () => {
      mockElectronAPI.terminal.create.mockResolvedValue({ 
        success: true, 
        id: 'destruction-test-id' 
      })

      wrapper = mount(TerminalSession)
      await wrapper.vm.$nextTick()

      // Start some operations
      const inputPromise = wrapper.vm.handleTerminalInput('test\r')
      const resizePromise = wrapper.vm.handleResize()

      // Destroy terminal while operations are in progress
      await wrapper.vm.destroyTerminal()

      // Operations should complete without errors
      await Promise.all([inputPromise, resizePromise])

      expect(wrapper.vm.terminal).toBeNull()
    })
  })
})