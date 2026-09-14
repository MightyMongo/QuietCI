import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTargetEnv } from '../src/config/config';
import { NotificationRouter } from '../src/routing/router';
import { SlackSender } from '../src/routing/slackSender';
import { TeamsSender } from '../src/routing/teamsSender';
import { TargetConfig } from '../src/routing/types';
import { UnifiedEvent } from '../src/types/events';

const baseEvent: UnifiedEvent = {
  source: 'github_actions',
  repo: 'MightyMongo/QuietCI',
  branch: 'main',
  actor: 'octocat',
  event_type: 'failure',
  timestamp: '2026-09-14T12:00:00.000Z',
  message: 'Build failed',
  metadata: {}
};

test('router reports unknown targets', async () => {
  const router = new NotificationRouter({
    defaultTargets: [],
    targets: {}
  });

  const deliveries = await router.route(baseEvent, ['missing-target']);

  assert.deepEqual(deliveries, [
    {
      targetName: 'missing-target',
      channel: 'unknown',
      status: 'failed',
      details: 'Unknown target missing-target'
    }
  ]);
});

test('router reports unsupported channels', async () => {
  const router = new NotificationRouter({
    defaultTargets: [],
    targets: {
      custom: {
        channel: 'unknown'
      }
    }
  });

  const deliveries = await router.route(baseEvent, ['custom']);

  assert.deepEqual(deliveries, [
    {
      targetName: 'custom',
      channel: 'unknown',
      status: 'failed',
      details: 'Unsupported channel unknown'
    }
  ]);
});

test('slack sender skips when webhook is not configured', async () => {
  const sender = new SlackSender();

  const delivery = await sender.send(
    'slack-default',
    { channel: 'slack' },
    baseEvent
  );

  assert.deepEqual(delivery, {
    targetName: 'slack-default',
    channel: 'slack',
    status: 'skipped',
    details: 'SLACK_WEBHOOK_URL is not configured'
  });
});

test('slack sender rejects non-https webhooks', async () => {
  const sender = new SlackSender();

  const delivery = await sender.send(
    'slack-default',
    { channel: 'slack', resolvedWebhookUrl: 'http://example.com/webhook' },
    baseEvent
  );

  assert.equal(delivery.status, 'failed');
  assert.equal(delivery.details, 'Slack webhook URL must use HTTPS');
});

test('slack sender reports non-ok webhook responses', async () => {
  const sender = new SlackSender();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response('', {
      status: 500
    })) as typeof fetch;

  try {
    const delivery = await sender.send(
      'slack-default',
      { channel: 'slack', resolvedWebhookUrl: 'https://example.com/webhook' },
      baseEvent
    );

    assert.equal(delivery.status, 'failed');
    assert.equal(delivery.details, 'Slack webhook failed with 500');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('teams sender skips when webhook is not configured', async () => {
  const sender = new TeamsSender();

  const delivery = await sender.send(
    'teams-default',
    { channel: 'teams' },
    baseEvent
  );

  assert.deepEqual(delivery, {
    targetName: 'teams-default',
    channel: 'teams',
    status: 'skipped',
    details: 'TEAMS_WEBHOOK_URL is not configured'
  });
});

test('teams sender rejects non-https webhooks', async () => {
  const sender = new TeamsSender();

  const delivery = await sender.send(
    'teams-default',
    { channel: 'teams', resolvedWebhookUrl: 'http://example.com/webhook' },
    baseEvent
  );

  assert.equal(delivery.status, 'failed');
  assert.equal(delivery.details, 'Teams webhook URL must use HTTPS');
});

test('teams sender reports non-ok webhook responses', async () => {
  const sender = new TeamsSender();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response('', {
      status: 502
    })) as typeof fetch;

  try {
    const delivery = await sender.send(
      'teams-default',
      { channel: 'teams', resolvedWebhookUrl: 'https://example.com/webhook' },
      baseEvent
    );

    assert.equal(delivery.status, 'failed');
    assert.equal(delivery.details, 'Teams webhook failed with 502');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('target env resolution ignores invalid smtp port values', () => {
  const target: TargetConfig = {
    channel: 'email',
    smtpPortEnv: 'SMTP_PORT'
  };

  assert.equal(
    resolveTargetEnv(target, { SMTP_PORT: '70000' }).resolvedSmtpPort,
    undefined
  );
  assert.equal(
    resolveTargetEnv(target, { SMTP_PORT: '0' }).resolvedSmtpPort,
    undefined
  );
  assert.equal(
    resolveTargetEnv(target, { SMTP_PORT: '587' }).resolvedSmtpPort,
    587
  );
});
