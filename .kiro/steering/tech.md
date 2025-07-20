# Technology Stack

## Core Technologies

- **Electron**: Desktop application framework (v37.2.3)
- **Vue.js**: Frontend framework (v3.5.17) with Composition API support
- **Vite**: Build tool and development server via electron-vite
- **Node.js**: Runtime environment for main process

## Key Dependencies

- **@xterm/xterm**: Terminal emulator library (v5.5.0)
- **@xterm/addon-fit**: Terminal fitting addon (v0.10.0)

## Development Tools

- **Vitest**: Testing framework with jsdom environment
- **Vue Test Utils**: Vue component testing utilities
- **electron-vite**: Electron-specific Vite configuration

## Build System

Uses electron-vite for unified build process across main, preload, and renderer processes.

## Common Commands

```bash
# Development
npm run dev          # Start development server with hot reload

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

## Architecture Notes

- Three-process architecture: main (Node.js), preload (bridge), renderer (Vue.js)
- Context isolation enabled for security
- No remote module or node integration in renderer
- CLI-centric design: integrates with external AI agent CLI tools
- Agent-agnostic: supports multiple AI CLI providers (Gemini CLI, Claude Code, etc.)
- File-system focused: primarily manages .md files and project documentation
- Git integration: version control for tracking project artifacts
