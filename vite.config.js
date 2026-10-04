import { defineConfig } from 'vite';

// Electron loads the production UI from file://.../dist/index.html.
// Relative asset URLs are required; absolute /assets paths resolve to C:\assets on Windows.
export default defineConfig({
  base: './'
});
