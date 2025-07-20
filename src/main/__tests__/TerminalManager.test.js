import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TerminalManager } from "../TerminalManager.js";
import * as pty from "node-pty";
import * as os from "os";

// Mock node-pty
vi.mock("node-pty", () => ({
  spawn: vi.fn(),
}));

// Mock os module
vi.mock("os", () => ({
  platform: vi.fn(),
  homedir: vi.fn(),
}));

describe("TerminalManager", () => {
  let terminalManager;
  let mockPtyProcess;

  beforeEach(() => {
    terminalManager = new TerminalManager();
    mockPtyProcess = {
      pid: 1234,
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    terminalManager.cleanup();
  });

  describe("shell detection", () => {
    it("should detect zsh shell on macOS", () => {
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");

      const shell = terminalManager.detectShell();

      expect(shell).toBe("/bin/zsh");
    });

    it("should detect PowerShell on Windows", () => {
      os.platform.mockReturnValue("win32");

      const shell = terminalManager.detectShell();

      expect(shell).toBe("powershell.exe");
    });

    it("should detect bash shell on Linux", () => {
      os.platform.mockReturnValue("linux");

      const shell = terminalManager.detectShell();

      expect(shell).toBe("/bin/bash");
    });
  });

  describe("terminal creation", () => {
    it("should create a new terminal with default options", () => {
      pty.spawn.mockReturnValue(mockPtyProcess);
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");

      const terminalId = terminalManager.createTerminal();

      expect(pty.spawn).toHaveBeenCalledWith("/bin/zsh", [], {
        name: "xterm-color",
        cols: 80,
        rows: 24,
        cwd: "/Users/testuser",
        env: process.env,
      });
      expect(terminalId).toBeDefined();
      expect(typeof terminalId).toBe("string");
    });

    it("should create a terminal with custom options", () => {
      pty.spawn.mockReturnValue(mockPtyProcess);

      const options = {
        shell: "/bin/bash",
        cwd: "/custom/path",
        cols: 100,
        rows: 30,
      };

      const terminalId = terminalManager.createTerminal(options);

      expect(pty.spawn).toHaveBeenCalledWith("/bin/bash", [], {
        name: "xterm-color",
        cols: 100,
        rows: 30,
        cwd: "/custom/path",
        env: process.env,
      });
      expect(terminalId).toBeDefined();
    });

    it("should handle terminal creation failure", () => {
      pty.spawn.mockImplementation(() => {
        throw new Error("Failed to spawn process");
      });

      expect(() => {
        terminalManager.createTerminal();
      }).toThrow("Failed to create terminal: Failed to spawn process");
    });
  });

  describe("terminal management", () => {
    let terminalId;

    beforeEach(() => {
      pty.spawn.mockReturnValue(mockPtyProcess);
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");
      terminalId = terminalManager.createTerminal();
    });

    it("should write data to terminal", () => {
      terminalManager.writeToTerminal(terminalId, "test command\r");

      expect(mockPtyProcess.write).toHaveBeenCalledWith("test command\r");
    });

    it("should throw error when writing to non-existent terminal", () => {
      expect(() => {
        terminalManager.writeToTerminal("invalid-id", "test");
      }).toThrow("Terminal not found: invalid-id");
    });

    it("should resize terminal", () => {
      terminalManager.resizeTerminal(terminalId, 120, 40);

      expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 40);
    });

    it("should throw error when resizing non-existent terminal", () => {
      expect(() => {
        terminalManager.resizeTerminal("invalid-id", 120, 40);
      }).toThrow("Terminal not found: invalid-id");
    });

    it("should destroy terminal", () => {
      terminalManager.destroyTerminal(terminalId);

      expect(mockPtyProcess.removeAllListeners).toHaveBeenCalled();
      expect(mockPtyProcess.kill).toHaveBeenCalled();
    });

    it("should handle destroying non-existent terminal gracefully", () => {
      expect(() => {
        terminalManager.destroyTerminal("invalid-id");
      }).not.toThrow();
    });
  });

  describe("cleanup", () => {
    it("should cleanup all terminals", () => {
      pty.spawn.mockReturnValue(mockPtyProcess);
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");

      terminalManager.createTerminal();
      terminalManager.createTerminal();

      terminalManager.cleanup();

      expect(mockPtyProcess.removeAllListeners).toHaveBeenCalledTimes(2);
      expect(mockPtyProcess.kill).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling and recovery", () => {
    beforeEach(() => {
      pty.spawn.mockReturnValue(mockPtyProcess);
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");
    });

    it("should fallback to alternative shells when primary shell fails", () => {
      // First call fails, second succeeds
      pty.spawn
        .mockImplementationOnce(() => {
          throw new Error("Shell not found");
        })
        .mockImplementationOnce(() => mockPtyProcess);

      const terminalId = terminalManager.createTerminalWithFallback();

      expect(pty.spawn).toHaveBeenCalledTimes(2);
      expect(terminalId).toBeDefined();
    });

    it("should handle process crash and attempt recovery", async () => {
      const terminalId = terminalManager.createTerminalWithFallback();
      const terminal = terminalManager.terminals.get(terminalId);
      
      // Simulate process crash by calling handleProcessCrash directly
      terminalManager.handleProcessCrash(terminalId, 1, null);
      
      // Should be in recovering state
      expect(terminalManager.getTerminalStatus(terminalId)).toBe('recovering');
      
      // Should have recorded the crash
      expect(terminalManager.isInCrashLoop(terminalId)).toBe(false);
    });

    it("should detect crash loops and disable terminal", async () => {
      const terminalId = terminalManager.createTerminalWithFallback();
      
      // Simulate multiple rapid crashes
      for (let i = 0; i < 5; i++) {
        terminalManager.recordCrash(terminalId);
      }
      
      expect(terminalManager.isInCrashLoop(terminalId)).toBe(true);
      
      // Trigger crash handling which should disable the terminal
      terminalManager.handleProcessCrash(terminalId, 1, null);
      
      expect(terminalManager.getTerminalStatus(terminalId)).toBe('disabled');
    });

    it("should provide fallback shell options for different platforms", () => {
      // Test Windows fallbacks
      os.platform.mockReturnValue("win32");
      const windowsFallbacks = terminalManager.getShellFallbacks();
      expect(windowsFallbacks).toEqual(['powershell.exe', 'cmd.exe']);
      
      // Test macOS fallbacks
      os.platform.mockReturnValue("darwin");
      const macOSFallbacks = terminalManager.getShellFallbacks();
      expect(macOSFallbacks).toEqual(['/bin/zsh', '/bin/bash', '/bin/sh']);
      
      // Test Linux fallbacks
      os.platform.mockReturnValue("linux");
      const linuxFallbacks = terminalManager.getShellFallbacks();
      expect(linuxFallbacks).toEqual(['/bin/bash', '/bin/sh', '/bin/dash']);
    });

    it("should handle permission denied errors gracefully", () => {
      pty.spawn.mockImplementation(() => {
        const error = new Error("Permission denied");
        error.code = 'EACCES';
        throw error;
      });

      expect(() => {
        terminalManager.createTerminalWithFallback();
      }).toThrow("Terminal creation failed: Permission denied. Please check shell permissions.");
    });

    it("should handle shell not found errors with fallback", () => {
      pty.spawn
        .mockImplementationOnce(() => {
          const error = new Error("Shell not found");
          error.code = 'ENOENT';
          throw error;
        })
        .mockImplementationOnce(() => mockPtyProcess);

      const terminalId = terminalManager.createTerminalWithFallback();
      expect(terminalId).toBeDefined();
    });
  });

  describe("IPC handlers", () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        reply: vi.fn(),
        sender: {
          send: vi.fn(),
          isDestroyed: vi.fn().mockReturnValue(false)
        }
      };
      pty.spawn.mockReturnValue(mockPtyProcess);
      os.platform.mockReturnValue("darwin");
      os.homedir.mockReturnValue("/Users/testuser");
    });

    it("should handle terminal creation via IPC", async () => {
      const options = { cols: 100, rows: 30 };

      const result = await terminalManager.handleCreateTerminal(
        mockEvent,
        options
      );

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("success", true);
      expect(pty.spawn).toHaveBeenCalled();
    });

    it("should handle terminal creation failure via IPC", async () => {
      pty.spawn.mockImplementation(() => {
        throw new Error("Spawn failed");
      });

      const result = await terminalManager.handleCreateTerminal(mockEvent, {});

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("should handle terminal input via IPC", async () => {
      const terminalId = terminalManager.createTerminal();

      const result = await terminalManager.handleTerminalInput(mockEvent, {
        id: terminalId,
        data: "test\r",
      });

      expect(result).toHaveProperty("success", true);
      expect(mockPtyProcess.write).toHaveBeenCalledWith("test\r");
    });

    it("should handle terminal input error via IPC", async () => {
      const result = await terminalManager.handleTerminalInput(mockEvent, {
        id: "invalid",
        data: "test",
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("should handle terminal resize via IPC", async () => {
      const terminalId = terminalManager.createTerminal();

      const result = await terminalManager.handleTerminalResize(mockEvent, {
        id: terminalId,
        cols: 120,
        rows: 40,
      });

      expect(result).toHaveProperty("success", true);
      expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 40);
    });

    it("should handle terminal resize error via IPC", async () => {
      const result = await terminalManager.handleTerminalResize(mockEvent, {
        id: "invalid",
        cols: 120,
        rows: 40,
      });

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });

    it("should handle terminal destruction via IPC", async () => {
      const terminalId = terminalManager.createTerminal();

      const result = await terminalManager.handleDestroyTerminal(mockEvent, {
        id: terminalId,
      });

      expect(result).toHaveProperty("success", true);
      expect(mockPtyProcess.removeAllListeners).toHaveBeenCalled();
      expect(mockPtyProcess.kill).toHaveBeenCalled();
    });

    it("should validate IPC message structure", () => {
      expect(() => {
        terminalManager.validateMessage({ id: "test", data: "valid" });
      }).not.toThrow();

      expect(() => {
        terminalManager.validateMessage({ data: "missing id" });
      }).toThrow("Invalid message: missing id");

      expect(() => {
        terminalManager.validateMessage(null);
      }).toThrow("Invalid message: message is required");
    });

    it("should handle destroyed event sender gracefully", async () => {
      // Create a terminal with a valid event sender
      const result = await terminalManager.handleCreateTerminal(mockEvent, {});
      expect(result.success).toBe(true);
      
      const terminalId = result.id;
      const terminal = terminalManager.terminals.get(terminalId);
      
      // Simulate the window being closed (event sender destroyed)
      mockEvent.sender.isDestroyed.mockReturnValue(true);
      
      // Simulate terminal data event - should not throw error
      expect(() => {
        terminal.process.on.mock.calls.find(call => call[0] === 'data')[1]('test data');
      }).not.toThrow();
      
      // Verify send was not called on destroyed sender
      expect(mockEvent.sender.send).not.toHaveBeenCalled();
    });
  });
});
