import {
  loadRulesConfig,
  loadRuntimeConfig,
  loadTargetsConfig
} from '../config/config';
import { AuditStore } from '../persistence/auditStore';

const config = loadRuntimeConfig();
loadRulesConfig(config.rulesPath);
loadTargetsConfig(config.targetsPath);
new AuditStore(config.databasePath);

console.log(`QuietCI database initialized at ${config.databasePath}`);
