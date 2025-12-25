// worker/src/index.ts
import 'dotenv/config';
import { createApp } from './app.js';

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const app = createApp();

let server: any = null;

function start(port: number) {
  server = app.listen(port, () =>
    console.log(`worker listening on http://localhost:${port}`),
  );
  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use; retrying on ${port + 1}...`);
      setTimeout(() => start(port + 1), 500);
    } else {
      console.error(err);
    }
  });
}

function gracefulShutdown() {
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
}

process.once('SIGUSR2', () => {
  gracefulShutdown();
  setTimeout(() => process.kill(process.pid, 'SIGUSR2'), 50);
});
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start(DEFAULT_PORT);
