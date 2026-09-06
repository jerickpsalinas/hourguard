import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// The monorepo keeps a single .env at the repo root (see .env.example), so load
// env vars from there. Only MAIN_VITE_-prefixed vars are exposed to the main
// process; RENDERER_VITE_-prefixed ones to the renderer.
const envDir = resolve(__dirname, '../..');

export default defineConfig({
  main: {
    envDir,
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    envDir,
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    envDir,
    plugins: [react()],
  },
});
