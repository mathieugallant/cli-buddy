# Project Structure

## Root Level

- `package.json` - Project dependencies and scripts
- `electron.vite.config.js` - Electron-specific Vite configuration
- `vitest.config.js` - Test configuration
- `.gitignore` - Git ignore patterns
- `.vscode/` - VS Code workspace settings
- `out/` - Build output directory (main, preload, renderer)
- `coverage/` - Test coverage reports

## Source Organization (`src/`)

### Shared Code (`src/shared/`)

- `events.js` - Shared event definitions and constants
- `events.d.ts` - TypeScript definitions for events
- `terminal-config.js` - Terminal configuration utilities
- `__tests__/` - Shared code unit tests
- `README.md` - Documentation for shared utilities

### Main Process (`src/main/`)

- `index.js` - Electron main process entry point
- `TerminalManager.js` - Terminal session management and process handling
- `__tests__/` - Main process unit tests
- Handles window creation, app lifecycle, and system integration

### Preload Scripts (`src/preload/`)

- `index.js` - Bridge between main and renderer processes
- `__tests__/` - Preload script unit tests
- Exposes secure APIs to renderer

### Renderer Process (`src/renderer/`)

- `index.html` - Main HTML entry point
- `src/` - Vue.js application source

#### Renderer Source (`src/renderer/src/`)

- `main.js` - Vue app initialization
- `App.vue` - Root Vue component
- `assets/` - Static assets (CSS, images)
  - `main.css` - Main stylesheet
- `components/` - Vue components
  - `TerminalSession.vue` - Main terminal interface component
  - `__tests__/` - Component unit tests
- `__tests__/` - App-level unit tests

## Testing Structure

- Tests are co-located with source files in `__tests__/` directories
- Main process tests: `src/main/__tests__/`
- Preload tests: `src/preload/__tests__/`
- Shared code tests: `src/shared/__tests__/`
- Component tests: `src/renderer/src/components/__tests__/`
- App-level tests: `src/renderer/src/__tests__/`
- Integration tests: `src/__tests__/`
- Test setup: `src/test-setup.js`

## Naming Conventions

- Vue components: PascalCase (e.g., `TerminalSession.vue`)
- Test files: `ComponentName.test.js`
- CSS classes: kebab-case
- JavaScript files: camelCase

## Code Organization Principles

- Single File Components (SFC) for Vue components
- Scoped styles to prevent CSS conflicts
- Component-based architecture with clear separation of concerns
- Tests co-located with components for maintainability

## Project Management Focus Areas

The application manages three core aspects of AI-assisted projects:

1. **Agent Configuration** (`/agent-config/`)

   - Steering documentation for AI agents
   - Spec files for feature development
   - MCP server integration configurations
   - Hook definitions for automated workflows

2. **Project Artifacts** (`/artifacts/`)

   - Documentation files (.md primary format)
   - Research materials and knowledge base content
   - Context files for AI agent consumption
   - Non-code deliverables and materials

3. **Version Control** (Git integration)
   - Change tracking for documentation and artifacts
   - Branch management for different project phases
   - Collaboration support for team-based projects
