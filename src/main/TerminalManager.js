import * as pty from "node-pty";
import * as os from "os";
import { randomUUID } from "crypto";
import { IPC_EVENTS } from "../shared/events.js";

export class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.crashHistory = new Map(); // Track crash history for each terminal
    this.maxCrashesBeforeDisable = 5;
    this.crashTimeWindow = 60000; // 1 minute
  }

  /**
   * Detect the appropriate shell for the current operating system
   * @returns {string} Shell executable path
   */
  detectShell() {
    const platform = os.platform();

    switch (platform) {
      case "win32":
        return "powershell.exe";
      case "darwin":
        return "/bin/zsh";
      case "linux":
      default:
        return "/bin/bash";
    }
  }

  /**
   * Get fallback shell options for the current platform
   * @returns {string[]} Array of shell executable paths in order of preference
   */
  getShellFallbacks() {
    const platform = os.platform();

    switch (platform) {
      case "win32":
        return ["powershell.exe", "cmd.exe"];
      case "darwin":
        return ["/bin/zsh", "/bin/bash", "/bin/sh"];
      case "linux":
      default:
        return ["/bin/bash", "/bin/sh", "/bin/dash"];
    }
  }

  /**
   * Create a new terminal session
   * @param {Object} options - Terminal configuration options
   * @param {string} options.shell - Shell executable path
   * @param {string} options.cwd - Working directory
   * @param {number} options.cols - Terminal columns
   * @param {number} options.rows - Terminal rows
   * @param {Object} options.env - Environment variables
   * @returns {string} Terminal ID
   */
  createTerminal(options = {}) {
    const terminalId = randomUUID();

    const config = {
      shell: options.shell || this.detectShell(),
      cwd: options.cwd || os.homedir(),
      cols: options.cols || 80,
      rows: options.rows || 24,
      env: options.env || process.env,
    };

    try {
      const ptyProcess = pty.spawn(config.shell, [], {
        name: "xterm-color",
        cols: config.cols,
        rows: config.rows,
        cwd: config.cwd,
        env: config.env,
      });

      this.terminals.set(terminalId, {
        process: ptyProcess,
        config: config,
        status: "active",
        crashCount: 0,
      });

      return terminalId;
    } catch (error) {
      throw new Error(`Failed to create terminal: ${error.message}`);
    }
  }

  /**
   * Create a terminal with fallback shell options
   * @param {Object} options - Terminal configuration options
   * @returns {string} Terminal ID
   */
  createTerminalWithFallback(options = {}) {
    const terminalId = randomUUID();
    const fallbackShells = this.getShellFallbacks();
    const specifiedShell = options.shell;

    // If a specific shell is requested, try it first
    const shellsToTry = specifiedShell
      ? [
          specifiedShell,
          ...fallbackShells.filter((shell) => shell !== specifiedShell),
        ]
      : fallbackShells;

    const config = {
      cwd: options.cwd || os.homedir(),
      cols: options.cols || 80,
      rows: options.rows || 24,
      env: options.env || process.env,
    };

    let lastError = null;

    for (const shell of shellsToTry) {
      try {
        const ptyProcess = pty.spawn(shell, [], {
          name: "xterm-color",
          cols: config.cols,
          rows: config.rows,
          cwd: config.cwd,
          env: config.env,
        });

        this.terminals.set(terminalId, {
          process: ptyProcess,
          config: { ...config, shell },
          status: "active",
          crashCount: 0,
        });

        // Set up crash recovery
        this.setupCrashRecovery(terminalId);

        return terminalId;
      } catch (error) {
        lastError = error;

        // Handle specific error types
        if (error.code === "EACCES") {
          throw new Error(
            "Terminal creation failed: Permission denied. Please check shell permissions."
          );
        }

        // Continue to next shell for other errors
        continue;
      }
    }

    // If all shells failed, throw the last error
    throw new Error(
      `Failed to create terminal with any available shell: ${
        lastError?.message || "Unknown error"
      }`
    );
  }

  /**
   * Write data to a terminal
   * @param {string} terminalId - Terminal ID
   * @param {string} data - Data to write
   */
  writeToTerminal(terminalId, data) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }

    terminal.process.write(data);
  }

  /**
   * Resize a terminal
   * @param {string} terminalId - Terminal ID
   * @param {number} cols - New column count
   * @param {number} rows - New row count
   */
  resizeTerminal(terminalId, cols, rows) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal not found: ${terminalId}`);
    }

    terminal.process.resize(cols, rows);
  }

  /**
   * Destroy a terminal session
   * @param {string} terminalId - Terminal ID
   */
  destroyTerminal(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      // Gracefully handle non-existent terminals
      return;
    }

    terminal.process.removeAllListeners();
    terminal.process.kill();
    this.terminals.delete(terminalId);
  }

  /**
   * Clean up all terminal sessions
   */
  cleanup() {
    for (const [terminalId] of this.terminals) {
      this.destroyTerminal(terminalId);
    }
  }

  /**
   * Set up crash recovery for a terminal
   * @param {string} terminalId - Terminal ID
   */
  setupCrashRecovery(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    terminal.process.on("exit", (code, signal) => {
      // Only attempt recovery for unexpected exits (crashes)
      if (code !== 0 && code !== null) {
        this.handleProcessCrash(terminalId, code, signal);
      }
    });

    terminal.process.on("error", (error) => {
      console.error(`Terminal ${terminalId} error:`, error);
      this.handleProcessCrash(terminalId, -1, null, error);
    });
  }

  /**
   * Handle process crash and attempt recovery
   * @param {string} terminalId - Terminal ID
   * @param {number} exitCode - Process exit code
   * @param {string} signal - Process signal
   * @param {Error} error - Optional error object
   */
  handleProcessCrash(terminalId, exitCode, signal, error = null) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) return;

    this.recordCrash(terminalId);

    // Check if terminal is in crash loop
    if (this.isInCrashLoop(terminalId)) {
      terminal.status = "disabled";
      console.error(`Terminal ${terminalId} disabled due to crash loop`);
      
      // Notify about disabled status
      if (terminal.eventSender) {
        this.safeSend(terminal.eventSender, IPC_EVENTS.TERMINAL.RECOVERY, { id: terminalId, status: "disabled" });
      }
      return;
    }

    // Attempt recovery
    terminal.status = "recovering";

    setTimeout(() => {
      this.attemptRecovery(terminalId);
    }, 1000); // Wait 1 second before recovery attempt
  }

  /**
   * Record a crash for crash loop detection
   * @param {string} terminalId - Terminal ID
   */
  recordCrash(terminalId) {
    const now = Date.now();

    if (!this.crashHistory.has(terminalId)) {
      this.crashHistory.set(terminalId, []);
    }

    const crashes = this.crashHistory.get(terminalId);
    crashes.push(now);

    // Remove old crashes outside the time window
    const cutoff = now - this.crashTimeWindow;
    this.crashHistory.set(
      terminalId,
      crashes.filter((time) => time > cutoff)
    );
  }

  /**
   * Check if terminal is in a crash loop
   * @param {string} terminalId - Terminal ID
   * @returns {boolean} True if in crash loop
   */
  isInCrashLoop(terminalId) {
    const crashes = this.crashHistory.get(terminalId) || [];
    return crashes.length >= this.maxCrashesBeforeDisable;
  }

  /**
   * Attempt to recover a crashed terminal
   * @param {string} terminalId - Terminal ID
   */
  attemptRecovery(terminalId) {
    const terminal = this.terminals.get(terminalId);
    if (!terminal || terminal.status === "disabled") return;

    // Notify about recovery attempt
    if (terminal.eventSender) {
      this.safeSend(terminal.eventSender, IPC_EVENTS.TERMINAL.RECOVERY, { id: terminalId, status: "recovering" });
    }

    try {
      // Clean up old process
      if (terminal.process) {
        terminal.process.removeAllListeners();
        terminal.process.kill();
      }

      // Create new process with same config
      const ptyProcess = pty.spawn(terminal.config.shell, [], {
        name: "xterm-color",
        cols: terminal.config.cols,
        rows: terminal.config.rows,
        cwd: terminal.config.cwd,
        env: terminal.config.env,
      });

      // Update terminal with new process
      terminal.process = ptyProcess;
      terminal.status = "active";
      terminal.crashCount = (terminal.crashCount || 0) + 1;

      // Set up crash recovery for new process
      this.setupCrashRecovery(terminalId);

      // Notify about successful recovery
      if (terminal.eventSender) {
        this.safeSend(terminal.eventSender, IPC_EVENTS.TERMINAL.RECOVERY, { id: terminalId, status: "recovered" });
      }

      console.log(`Terminal ${terminalId} recovered successfully`);
    } catch (error) {
      console.error(`Failed to recover terminal ${terminalId}:`, error);
      terminal.status = "disabled";
      
      // Notify about disabled status
      if (terminal.eventSender) {
        this.safeSend(terminal.eventSender, IPC_EVENTS.TERMINAL.RECOVERY, { id: terminalId, status: "disabled" });
      }
    }
  }

  /**
   * Get terminal status
   * @param {string} terminalId - Terminal ID
   * @returns {string} Terminal status
   */
  getTerminalStatus(terminalId) {
    const terminal = this.terminals.get(terminalId);
    return terminal ? terminal.status : "not_found";
  }

  /**
   * Validate IPC message structure
   * @param {Object} message - Message to validate
   */
  validateMessage(message) {
    if (!message) {
      throw new Error("Invalid message: message is required");
    }

    if (!message.id && message.id !== "") {
      throw new Error("Invalid message: missing id");
    }
  }

  /**
   * Safely send IPC message, checking if sender is still valid
   * @param {Object} sender - IPC event sender
   * @param {string} event - Event name
   * @param {Object} data - Data to send
   */
  safeSend(sender, event, data) {
    if (sender && !sender.isDestroyed()) {
      sender.send(event, data);
    }
  }

  /**
   * Handle terminal creation via IPC
   * @param {Object} event - IPC event object
   * @param {Object} options - Terminal options
   * @returns {Object} Response object
   */
  async handleCreateTerminal(event, options = {}) {
    try {
      const terminalId = this.createTerminalWithFallback(options);

      // Set up event listeners for terminal data
      const terminal = this.terminals.get(terminalId);
      if (terminal) {
        terminal.process.on("data", (data) => {
          this.safeSend(event.sender, IPC_EVENTS.TERMINAL.DATA, { id: terminalId, data });
        });

        terminal.process.on("exit", (code) => {
          this.safeSend(event.sender, IPC_EVENTS.TERMINAL.EXIT, { id: terminalId, code });
          // Don't automatically destroy on exit - let crash recovery handle it
          if (code === 0) {
            this.destroyTerminal(terminalId);
          }
        });

        // Store event sender for recovery notifications
        terminal.eventSender = event.sender;
      }

      return { success: true, id: terminalId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle terminal input via IPC
   * @param {Object} event - IPC event object
   * @param {Object} data - Input data with terminal ID and data
   * @returns {Object} Response object
   */
  async handleTerminalInput(event, data) {
    try {
      this.validateMessage(data);
      this.writeToTerminal(data.id, data.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle terminal resize via IPC
   * @param {Object} event - IPC event object
   * @param {Object} data - Resize data with terminal ID, cols, and rows
   * @returns {Object} Response object
   */
  async handleTerminalResize(event, data) {
    try {
      this.validateMessage(data);
      this.resizeTerminal(data.id, data.cols, data.rows);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle terminal destruction via IPC
   * @param {Object} event - IPC event object
   * @param {Object} data - Destruction data with terminal ID
   * @returns {Object} Response object
   */
  async handleDestroyTerminal(event, data) {
    try {
      this.validateMessage(data);
      this.destroyTerminal(data.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
