// Test setup file for browser API mocks
import { vi } from 'vitest'

// Mock HTMLCanvasElement.getContext for xterm.js
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Array(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
}))

// Mock window.matchMedia for xterm.js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn(cb => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn(id => clearTimeout(id))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.getComputedStyle
window.getComputedStyle = vi.fn(() => ({
  getPropertyValue: vi.fn(() => ''),
  fontSize: '14px',
  fontFamily: 'monospace',
  lineHeight: '1.2',
}))

// Mock Element.getBoundingClientRect
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
}))

// Mock Element.scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  value: 1,
})

// Mock electron APIs for renderer tests
global.window = global.window || {}
global.window.electronAPI = {
  terminal: {
    create: vi.fn().mockResolvedValue('mock-terminal-id'),
    write: vi.fn().mockResolvedValue({ success: true }),
    resize: vi.fn().mockResolvedValue({ success: true }),
    destroy: vi.fn().mockResolvedValue({ success: true }),
    onData: vi.fn(),
    onExit: vi.fn(),
  },
  executeCommand: vi.fn().mockResolvedValue({ success: true, output: 'mock output' }),
  onCommandOutput: vi.fn(),
  removeCommandOutputListener: vi.fn(),
}

// Suppress console warnings for missing implementations
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  const message = args[0]
  if (
    typeof message === 'string' && 
    (message.includes('Not implemented') || 
     message.includes('HTMLCanvasElement') ||
     message.includes('matchMedia'))
  ) {
    return // Suppress these specific warnings
  }
  originalConsoleWarn.apply(console, args)
}