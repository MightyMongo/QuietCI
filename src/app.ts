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
import { createSummarizerAdapter } from './summarizer/summarizerAdapter';
export function createApp() {
  const config = loadRuntimeConfig();
  const auditStore = new AuditStore(config.databasePath);
  const filterEngine = new FilterEngine(loadRulesConfig(config.rulesPath));
  const targets = loadTargetsConfig(config.targetsPath);
  const router = new NotificationRouter(targets);
  const summarizer = createSummarizerAdapter(config.aiApiKeys);
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

      const deliveries =
        decision.action === 'ROUTE' && !decision.rateLimited
          ? await router.route(normalizedEvent, decision.targets)
          : [];

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
      response.status(400).json({
        error: error.message
      });
    }
  );

  return app;
}
