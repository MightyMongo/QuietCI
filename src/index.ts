import { createApp } from './app';
import { loadRuntimeConfig } from './config/config';

const config = loadRuntimeConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`QuietCI listening on port ${config.port}`);
});
