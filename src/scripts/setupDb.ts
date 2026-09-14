import {
  loadRulesConfig,
  loadRuntimeConfig,
  loadTargetsConfig
} from '../config/config';
import { AuditStore } from '../persistence/auditStore';

const config = loadRuntimeConfig();
loadRulesConfig(config.rulesPath);
loadTargetsConfig(config.targetsPath);
AuditStore.initializeDatabase(config.databasePath);

console.log(`QuietCI database initialized at ${config.databasePath}`);
