<template>
  <div id="app">
    <header class="app-header">
      <h1>CLI Buddy</h1>
      <div class="status">Ready</div>
    </header>
    <main class="terminal-container">
      <TerminalSession />
    </main>
  </div>
</template>

<script>
import TerminalSession from './components/TerminalSession.vue'

export default {
  name: 'App',
  components: {
    TerminalSession
  }
}
</script>

<style>
#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vscode-titlebar-background);
  border-bottom: 1px solid var(--vscode-titlebar-border);
  min-height: 35px;
  user-select: none;
  -webkit-app-region: drag;
}

.app-header h1 {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--vscode-editor-foreground);
  opacity: 0.9;
  -webkit-app-region: no-drag;
}

.status {
  font-size: 11px;
  color: var(--vscode-accent-color);
  background: rgba(0, 122, 204, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  -webkit-app-region: no-drag;
}

.terminal-container {
  flex: 1;
  overflow: hidden;
  background: var(--vscode-terminal-background);
  position: relative;
}

/* Ensure proper focus management */
.terminal-container:focus-within .app-header {
  border-bottom-color: var(--vscode-accent-color);
}

/* Responsive design for smaller screens */
@media (max-width: 768px) {
  .app-header {
    padding: 6px 12px;
    min-height: 32px;
  }
  
  .app-header h1 {
    font-size: 12px;
  }
  
  .status {
    font-size: 10px;
    padding: 1px 4px;
  }
}

/* High contrast mode adjustments */
@media (prefers-contrast: high) {
  .app-header {
    border-bottom-width: 2px;
  }
  
  .status {
    border: 1px solid var(--vscode-accent-color);
  }
}
</style>