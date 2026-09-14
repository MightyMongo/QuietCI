import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DeliveryRecord } from '../routing/types';
import { FilterDecision, UnifiedEvent } from '../types/events';

export class AuditStore {
  private readonly database: DatabaseSync;

  constructor(databasePath: string) {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.exec(fs.readFileSync(this.resolveMigrationPath(), 'utf8'));
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  recordEvent(event: UnifiedEvent): number {
    const statement = this.database.prepare(`
      INSERT INTO events (source, repo, branch, actor, event_type, timestamp, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      event.source,
      event.repo,
      event.branch,
      event.actor,
      event.event_type,
      event.timestamp,
      event.message,
      JSON.stringify(event.metadata)
    );

    return Number(result.lastInsertRowid);
  }

  recordDecision(eventId: number, decision: FilterDecision): void {
    const statement = this.database.prepare(`
      INSERT INTO decisions (event_id, rule_name, action, severity, targets, summary_requested, snooze_until, rate_limited)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    statement.run(
      eventId,
      decision.ruleName ?? null,
      decision.action,
      decision.severity,
      JSON.stringify(decision.targets),
      decision.summaryRequested ? 1 : 0,
      decision.snoozeUntil ?? null,
      decision.rateLimited ? 1 : 0
    );
  }

  recordDeliveries(eventId: number, deliveries: DeliveryRecord[]): void {
    const statement = this.database.prepare(`
      INSERT INTO deliveries (event_id, target_name, channel, status, details)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const delivery of deliveries) {
      statement.run(
        eventId,
        delivery.targetName,
        delivery.channel,
        delivery.status,
        delivery.details
      );
    }
  }

  private resolveMigrationPath(): string {
    const candidates = [
      path.resolve(__dirname, '../migrations/001_init.sql'),
      path.resolve(process.cwd(), 'migrations/001_init.sql')
    ];
    const migrationPath = candidates.find((candidate) =>
      fs.existsSync(candidate)
    );

    if (!migrationPath) {
      throw new Error('Unable to locate QuietCI database migration');
    }

    return migrationPath;
  }
}
