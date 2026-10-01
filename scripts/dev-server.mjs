import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const realRoot = fs.existsSync(process.cwd()) ? fs.realpathSync(process.cwd()) : process.cwd();

const server = await createServer({
  configFile: false,
  plugins: [react()],
  resolve: {
    preserveSymlinks: true
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    fs: {
      strict: false,
      allow: [process.cwd(), realRoot]
    }
  }
});

await server.listen();
server.printUrls();
