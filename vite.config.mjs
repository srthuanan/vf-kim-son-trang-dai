import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const realRoot = fs.existsSync(process.cwd()) ? fs.realpathSync(process.cwd()) : process.cwd();

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true
  },
  server: {
    port: 5174,
    fs: {
      strict: false,
      allow: [process.cwd(), realRoot]
    }
  },
  preview: {
    port: 4174
  }
});
