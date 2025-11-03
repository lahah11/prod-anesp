const http = require('http');
const { createApp, initialize } = require('./app');
const env = require('./config/env');

async function start() {
  await initialize();
  const app = createApp();
  const server = http.createServer(app);
  server.listen(env.PORT, () => {
    console.log(`ANESP backend listening on port ${env.PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
