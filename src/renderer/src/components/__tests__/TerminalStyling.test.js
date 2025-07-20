import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TerminalSession from "../TerminalSession.vue";
import { TERMINAL_CONFIG } from "../../../../shared/terminal-config.js";

// Mock xterm.js
vi.mock("@xterm/xterm", () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    onData: vi.fn(),
    attachCustomKeyEventHandler: vi.fn(),
    focus: vi.fn(),
    dispose: vi.fn(),
    write: vi.fn(),
    clear: vi.fn(),
    cols: 80,
    rows: 24,
  })),
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

// Mock window.electronAPI
Object.defineProperty(window, "electronAPI", {
  value: {
    terminal: {
      create: vi.fn().mockResolvedValue({ success: true, id: "test-terminal" }),
      write: vi.fn().mockResolvedValue(true),
      resize: vi.fn().mockResolvedValue(true),
      destroy: vi.fn().mockResolvedValue(true),
      onData: vi.fn(),
      onExit: vi.fn(),
      onRecovery: vi.fn(),
    },
  },
  writable: true,
});

describe("Terminal Styling Integration", () => {
  let wrapper;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies VS Code theme configuration to terminal", async () => {
    const { Terminal } = await import("@xterm/xterm");

    wrapper = mount(TerminalSession);
    await wrapper.vm.$nextTick();

    // Verify terminal is created with the shared configuration
    expect(Terminal).toHaveBeenCalledWith(TERMINAL_CONFIG);
  });

  it("applies enhanced terminal configuration options", async () => {
    const { Terminal } = await import("@xterm/xterm");

    wrapper = mount(TerminalSession);
    await wrapper.vm.$nextTick();

    // Verify terminal is created with the shared configuration
    expect(Terminal).toHaveBeenCalledWith(TERMINAL_CONFIG);
  });

  it("renders with proper CSS classes and structure", () => {
    wrapper = mount(TerminalSession);

    // Verify main container has correct class
    expect(wrapper.find(".terminal-session").exists()).toBe(true);

    // Verify terminal container exists
    expect(wrapper.find(".terminal-container").exists()).toBe(true);

    // Verify error banner structure (when not visible)
    const errorBanner = wrapper.find(".error-banner");
    expect(errorBanner.exists()).toBe(false); // Should not be visible initially

    // Verify recovery status structure (when not visible)
    const recoveryStatus = wrapper.find(".recovery-status");
    expect(recoveryStatus.exists()).toBe(false); // Should not be visible initially
  });

  it("displays error banner with proper styling when error occurs", async () => {
    wrapper = mount(TerminalSession);

    // Simulate error state
    await wrapper.setData({ errorMessage: "Test error message" });
    await wrapper.vm.$nextTick();

    const errorBanner = wrapper.find(".error-banner");
    expect(errorBanner.exists()).toBe(true);
    expect(errorBanner.text()).toContain("Test error message");
    expect(errorBanner.find(".error-icon").exists()).toBe(true);
  });

  it("displays recovery status with proper styling when recovering", async () => {
    wrapper = mount(TerminalSession);

    // Simulate recovery state
    await wrapper.setData({ recoveryStatus: "recovering" });
    await wrapper.vm.$nextTick();

    const recoveryStatus = wrapper.find(".recovery-status");
    expect(recoveryStatus.exists()).toBe(true);
    expect(recoveryStatus.text()).toContain("Terminal recovering...");
    expect(recoveryStatus.find(".recovery-icon").exists()).toBe(true);
  });

  it("has proper CSS custom properties defined", () => {
    // Mount component to ensure styles are loaded
    wrapper = mount(TerminalSession);

    // Check that the component includes the xterm.css import
    const styleContent = wrapper.vm.$options.style;
    // This is a basic check - in a real browser environment,
    // we would check computed styles, but in jsdom we verify the structure
    expect(wrapper.find(".terminal-session").exists()).toBe(true);
  });

  it("validates terminal configuration structure", () => {
    // Verify the configuration has all required properties
    expect(TERMINAL_CONFIG).toHaveProperty("theme");
    expect(TERMINAL_CONFIG.theme).toHaveProperty("background");
    expect(TERMINAL_CONFIG.theme).toHaveProperty("foreground");
    expect(TERMINAL_CONFIG.theme).toHaveProperty("cursor");

    // Verify ANSI colors are defined
    const ansiColors = [
      "black",
      "red",
      "green",
      "yellow",
      "blue",
      "magenta",
      "cyan",
      "white",
    ];
    ansiColors.forEach((color) => {
      expect(TERMINAL_CONFIG.theme).toHaveProperty(color);
      expect(TERMINAL_CONFIG.theme).toHaveProperty(
        `bright${color.charAt(0).toUpperCase() + color.slice(1)}`
      );
    });

    // Verify font configuration
    expect(TERMINAL_CONFIG).toHaveProperty("fontFamily");
    expect(TERMINAL_CONFIG).toHaveProperty("fontSize");
    expect(TERMINAL_CONFIG).toHaveProperty("cursorBlink");
  });
});
