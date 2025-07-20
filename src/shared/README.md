# Shared Event Constants

This directory contains centralized event constants used for IPC communication between the main, preload, and renderer processes.

## Usage

```javascript
import { IPC_EVENTS } from '../shared/events.js'

// In main process
ipcMain.handle(IPC_EVENTS.TERMINAL.CREATE, (event, options) => {
  // Handle terminal creation
})

// In preload script
ipcRenderer.invoke(IPC_EVENTS.TERMINAL.CREATE, options)

// In renderer process (via electronAPI)
window.electronAPI.terminal.create(options)
```

## Event Categories

### Terminal Events
- `CREATE`: Create a new terminal session
- `WRITE`: Write data to terminal
- `RESIZE`: Resize terminal dimensions
- `DESTROY`: Destroy terminal session
- `DATA`: Terminal output data (one-way notification)
- `EXIT`: Terminal process exit (one-way notification)
- `RECOVERY`: Terminal recovery status (one-way notification)

### Command Events
- `EXECUTE`: Execute a command
- `OUTPUT`: Command output (one-way notification)

## Benefits

1. **Consistency**: Ensures all processes use the same event names
2. **Maintainability**: Single source of truth for event names
3. **Type Safety**: TypeScript definitions provide IDE support
4. **Refactoring**: Easy to rename events across the entire codebase
5. **Testing**: Centralized constants make testing easier

## Adding New Events

1. Add the event constant to the appropriate category in `events.js`
2. Update the TypeScript definitions in `events.d.ts`
3. Add tests in `__tests__/events.test.js`
4. Update this documentation