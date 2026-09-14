import express, { NextFunction, Request, Response } from 'express';
import {
  loadRulesConfig,
  loadRuntimeConfig,
  loadTargetsConfig
} from './config/config';
import { FilterEngine } from './filter/filterEngine';
import { normalizeWebhookEvent } from './normalizers';
import { AuditStore } from './persistence/auditStore';
import { NotificationRouter } from './routing/router';
import { DeliveryRecord } from './routing/types';
import {
  createSummarizerAdapter,
  SummarizerAdapter
} from './summarizer/summarizerAdapter';

interface AppDependencies {
  auditStore: AuditStore;
  filterEngine: FilterEngine;
  router: NotificationRouter;
  summarizer: SummarizerAdapter;
}

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const config =
    overrides.auditStore &&
    overrides.filterEngine &&
    overrides.router &&
    overrides.summarizer
      ? undefined
      : loadRuntimeConfig();

  const auditStore =
    overrides.auditStore ??
    (() => {
      const runtimeConfig = config ?? loadRuntimeConfig();
      AuditStore.initializeDatabase(runtimeConfig.databasePath);
      return new AuditStore(runtimeConfig.databasePath);
    })();
  const filterEngine =
    overrides.filterEngine ??
    new FilterEngine(
      loadRulesConfig((config ?? loadRuntimeConfig()).rulesPath)
    );
  const router =
    overrides.router ??
    new NotificationRouter(
      loadTargetsConfig((config ?? loadRuntimeConfig()).targetsPath)
    );
  const summarizer =
    overrides.summarizer ??
    createSummarizerAdapter((config ?? loadRuntimeConfig()).aiApiKeys);
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.post('/api/events', async (request, response, next) => {
    try {
      const normalizedEvent = normalizeWebhookEvent({
        payload: request.body as Record<string, unknown>,
        headers: request.headers
      });
      const decision = filterEngine.evaluate(normalizedEvent);
      const summary = decision.summaryRequested
        ? await summarizer.summarize(normalizedEvent, decision)
        : undefined;

      const eventId = auditStore.recordEvent(normalizedEvent);
      auditStore.recordDecision(eventId, decision);

      let deliveries: DeliveryRecord[] = [];

      if (decision.action === 'ROUTE' && !decision.rateLimited) {
        try {
          deliveries = await router.route(normalizedEvent, decision.targets);
        } catch (error) {
          deliveries = [
            {
              targetName: 'router',
              channel: 'unknown',
              status: 'failed',
              details:
                error instanceof Error
                  ? error.message
                  : 'Unknown routing failure'
            }
          ];
        }
      }

      if (deliveries.length > 0) {
        auditStore.recordDeliveries(eventId, deliveries);
      }

      response.status(202).json({
        eventId,
        accepted: true,
        source: normalizedEvent.source,
        repo: normalizedEvent.repo,
        event_type: normalizedEvent.event_type,
        timestamp: normalizedEvent.timestamp,
        summaryGenerated: Boolean(summary)
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (
      error: Error,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      const maybeStatus = (error as Error & { status?: unknown }).status;
      const status =
        typeof maybeStatus === 'number'
          ? maybeStatus
          : error.message === 'Unable to detect CI source'
            ? 400
            : 500;

      response.status(status).json({
        error: error.message
      });
    }
  );

  return app;
}
