import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(Date.now().toString())
  },
  server: {
    port: 5174
  },
  preview: {
    port: 4174
  }
});
