import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { loadLocalRuntime } from './scripts/local-runtime.mjs';
loadLocalRuntime();
export default defineConfig({
  plugins: [sveltekit()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
});
