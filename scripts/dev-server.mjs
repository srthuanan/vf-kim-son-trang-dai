import { createServer } from 'vite';

const server = await createServer({
  configFile: 'vite.config.ts',
  server: {
    host: '0.0.0.0',
    port: 5174
  }
});

await server.listen();
server.printUrls();

