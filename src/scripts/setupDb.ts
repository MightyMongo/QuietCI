import { loadRuntimeConfig } from '../config/config';
import { AuditStore } from '../persistence/auditStore';

const config = loadRuntimeConfig();
new AuditStore(config.databasePath);

console.log(`QuietCI database initialized at ${config.databasePath}`);
