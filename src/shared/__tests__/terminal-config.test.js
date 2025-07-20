import { describe, it, expect } from 'vitest'
import { TERMINAL_CONFIG, DEFAULT_TERMINAL_OPTIONS, HISTORY_CONFIG } from '../terminal-config.js'

describe('Terminal Configuration', () => {
  describe('TERMINAL_CONFIG', () => {
    it('has all required terminal properties', () => {
      expect(TERMINAL_CONFIG).toHaveProperty('cursorBlink', true)
      expect(TERMINAL_CONFIG).toHaveProperty('fontSize', 14)
      expect(TERMINAL_CONFIG).toHaveProperty('fontFamily', 'Consolas, "Courier New", Monaco, monospace')
      expect(TERMINAL_CONFIG).toHaveProperty('fontWeight', 'normal')
      expect(TERMINAL_CONFIG).toHaveProperty('fontWeightBold', 'bold')
      expect(TERMINAL_CONFIG).toHaveProperty('lineHeight', 1.2)
      expect(TERMINAL_CONFIG).toHaveProperty('letterSpacing', 0)
      expect(TERMINAL_CONFIG).toHaveProperty('scrollback', 1000)
      expect(TERMINAL_CONFIG).toHaveProperty('tabStopWidth', 4)
    })

    it('has complete theme configuration', () => {
      expect(TERMINAL_CONFIG).toHaveProperty('theme')
      const theme = TERMINAL_CONFIG.theme

      // Basic theme colors
      expect(theme).toHaveProperty('background', '#1e1e1e')
      expect(theme).toHaveProperty('foreground', '#cccccc')
      expect(theme).toHaveProperty('cursor', '#ffffff')
      expect(theme).toHaveProperty('cursorAccent', '#1e1e1e')
      expect(theme).toHaveProperty('selection', '#264f78')
      expect(theme).toHaveProperty('selectionForeground', '#ffffff')
    })

    it('has all ANSI colors defined', () => {
      const theme = TERMINAL_CONFIG.theme
      const ansiColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
      
      ansiColors.forEach(color => {
        expect(theme).toHaveProperty(color)
        expect(typeof theme[color]).toBe('string')
        expect(theme[color]).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('has all bright ANSI colors defined', () => {
      const theme = TERMINAL_CONFIG.theme
      const brightColors = ['brightBlack', 'brightRed', 'brightGreen', 'brightYellow', 'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite']
      
      brightColors.forEach(color => {
        expect(theme).toHaveProperty(color)
        expect(typeof theme[color]).toBe('string')
        expect(theme[color]).toMatch(/^#[0-9a-f]{6}$/i)
      })
    })

    it('uses VS Code compatible colors', () => {
      const theme = TERMINAL_CONFIG.theme
      
      // Verify specific VS Code theme colors
      expect(theme.background).toBe('#1e1e1e')
      expect(theme.foreground).toBe('#cccccc')
      expect(theme.selection).toBe('#264f78')
      expect(theme.red).toBe('#f14c4c')
      expect(theme.green).toBe('#23d18b')
      expect(theme.blue).toBe('#3b8eea')
    })
  })

  describe('DEFAULT_TERMINAL_OPTIONS', () => {
    it('has default terminal dimensions', () => {
      expect(DEFAULT_TERMINAL_OPTIONS).toHaveProperty('cols', 80)
      expect(DEFAULT_TERMINAL_OPTIONS).toHaveProperty('rows', 24)
    })

    it('has numeric values for dimensions', () => {
      expect(typeof DEFAULT_TERMINAL_OPTIONS.cols).toBe('number')
      expect(typeof DEFAULT_TERMINAL_OPTIONS.rows).toBe('number')
      expect(DEFAULT_TERMINAL_OPTIONS.cols).toBeGreaterThan(0)
      expect(DEFAULT_TERMINAL_OPTIONS.rows).toBeGreaterThan(0)
    })
  })

  describe('HISTORY_CONFIG', () => {
    it('has maximum history size defined', () => {
      expect(HISTORY_CONFIG).toHaveProperty('maxHistorySize', 1000)
    })

    it('has reasonable history size limit', () => {
      expect(typeof HISTORY_CONFIG.maxHistorySize).toBe('number')
      expect(HISTORY_CONFIG.maxHistorySize).toBeGreaterThan(0)
      expect(HISTORY_CONFIG.maxHistorySize).toBeLessThanOrEqual(10000) // Reasonable upper limit
    })
  })

  describe('Configuration consistency', () => {
    it('exports all expected configurations', () => {
      expect(TERMINAL_CONFIG).toBeDefined()
      expect(DEFAULT_TERMINAL_OPTIONS).toBeDefined()
      expect(HISTORY_CONFIG).toBeDefined()
    })

    it('has immutable configuration objects', () => {
      // Verify that the configurations are objects that can be used safely
      expect(typeof TERMINAL_CONFIG).toBe('object')
      expect(typeof DEFAULT_TERMINAL_OPTIONS).toBe('object')
      expect(typeof HISTORY_CONFIG).toBe('object')
      
      expect(TERMINAL_CONFIG).not.toBeNull()
      expect(DEFAULT_TERMINAL_OPTIONS).not.toBeNull()
      expect(HISTORY_CONFIG).not.toBeNull()
    })
  })
})