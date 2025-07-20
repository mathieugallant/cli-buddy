import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock electron modules
const mockIpcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

vi.mock("electron", () => ({
  contextBridge: mockContextBridge,
  ipcRenderer: mockIpcRenderer,
}));

vi.mock("@electron-toolkit/preload", () => ({
  electronAPI: {},
}));

describe("Preload Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset process.contextIsolated for each test
    Object.defineProperty(process, "contextIsolated", {
      value: true,
      writable: true,
    });
    // Clear the module cache to ensure fresh imports
    vi.resetModules();
  });

  it("should expose terminal APIs through electronAPI", async () => {
    // Import the preload script to trigger the API exposure
    await import("../index.js");

    // Verify that contextBridge.exposeInMainWorld was called
    expect(mockContextBridge.exposeInMainWorld).toHaveBeenCalled();

    // Get the electronAPI object that was exposed
    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();

    const exposedApi = apiCall[1];
    expect(exposedApi).toHaveProperty("terminal");
    expect(exposedApi.terminal).toHaveProperty("create");
    expect(exposedApi.terminal).toHaveProperty("write");
    expect(exposedApi.terminal).toHaveProperty("resize");
    expect(exposedApi.terminal).toHaveProperty("destroy");
    expect(exposedApi.terminal).toHaveProperty("onData");
    expect(exposedApi.terminal).toHaveProperty("onExit");
  });

  it("should implement terminal.create method that invokes IPC", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const options = { shell: "/bin/bash", cwd: "/home/user" };
    exposedApi.terminal.create(options);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "terminal:create",
      options
    );
  });

  it("should implement terminal.write method that invokes IPC", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const id = "terminal-1";
    const data = "ls -la\n";
    exposedApi.terminal.write(id, data);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "terminal:write",
      id,
      data
    );
  });

  it("should implement terminal.resize method that invokes IPC", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const id = "terminal-1";
    const cols = 80;
    const rows = 24;
    exposedApi.terminal.resize(id, cols, rows);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "terminal:resize",
      id,
      cols,
      rows
    );
  });

  it("should implement terminal.destroy method that invokes IPC", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const id = "terminal-1";
    exposedApi.terminal.destroy(id);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith("terminal:destroy", id);
  });

  it("should implement terminal.onData method that sets up event listener", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const callback = vi.fn();
    exposedApi.terminal.onData(callback);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith("terminal:data", callback);
  });

  it("should implement terminal.onExit method that sets up event listener", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    const callback = vi.fn();
    exposedApi.terminal.onExit(callback);

    expect(mockIpcRenderer.on).toHaveBeenCalledWith("terminal:exit", callback);
  });

  it("should maintain existing executeCommand functionality", async () => {
    await import("../index.js");

    const apiCall = mockContextBridge.exposeInMainWorld.mock.calls.find(
      (call) => call[0] === "electronAPI"
    );
    expect(apiCall).toBeDefined();
    const exposedApi = apiCall[1];

    // Verify existing functionality is preserved
    expect(exposedApi).toHaveProperty("executeCommand");
    expect(exposedApi).toHaveProperty("onCommandOutput");
    expect(exposedApi).toHaveProperty("removeCommandOutputListener");

    const command = "ls -la";
    exposedApi.executeCommand(command);

    expect(mockIpcRenderer.invoke).toHaveBeenCalledWith(
      "execute-command",
      command
    );
  });
});
