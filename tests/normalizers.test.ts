import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { normalizeWebhookEvent } from '../src/normalizers';
import { toIsoTimestamp } from '../src/normalizers/helpers';
import { EventSource } from '../src/types/events';

function readPayload(name: string) {
  return JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), 'tests/payloads', `${name}.json`),
      'utf8'
    )
  ) as Record<string, unknown>;
}

const cases: Array<{
  name: string;
  source: EventSource;
  header: string;
  headerValue: string;
}> = [
  {
    name: 'github-actions',
    source: 'github_actions',
    header: 'x-github-event',
    headerValue: 'workflow_run'
  },
  {
    name: 'gitlab',
    source: 'gitlab_ci',
    header: 'x-gitlab-event',
    headerValue: 'Pipeline Hook'
  },
  {
    name: 'jenkins',
    source: 'jenkins',
    header: 'x-jenkins',
    headerValue: '2.0'
  },
  {
    name: 'circleci',
    source: 'circleci',
    header: 'circleci-signature',
    headerValue: 'signature'
  },
  {
    name: 'azure-devops',
    source: 'azure_devops',
    header: 'x-vss-subscription-id',
    headerValue: 'subscription'
  }
];

for (const entry of cases) {
  test(`normalizes ${entry.source} payloads`, () => {
    const event = normalizeWebhookEvent({
      payload: readPayload(entry.name),
      headers: { [entry.header]: entry.headerValue }
    });

    assert.equal(event.source, entry.source);
    assert.notEqual(event.repo, 'unknown');
    assert.notEqual(event.branch, 'unknown');
    assert.notEqual(event.actor, 'unknown');
    assert.ok(event.message.length > 0);
    assert.match(event.timestamp, /^\d{4}-\d{2}-\d{2}T/);
  });
}

test('normalizes GitHub Actions fields using workflow conclusions', () => {
  const event = normalizeWebhookEvent({
    payload: readPayload('github-actions'),
    headers: { 'x-github-event': 'workflow_run' }
  });

  assert.deepEqual(
    {
      source: event.source,
      repo: event.repo,
      branch: event.branch,
      actor: event.actor,
      eventType: event.event_type,
      message: event.message
    },
    {
      source: 'github_actions',
      repo: 'MightyMongo/QuietCI',
      branch: 'main',
      actor: 'octocat',
      eventType: 'failure',
      message: 'CI pipeline failed'
    }
  );
});

test('normalizes GitLab fields into the unified schema', () => {
  const event = normalizeWebhookEvent({
    payload: readPayload('gitlab'),
    headers: { 'x-gitlab-event': 'Pipeline Hook' }
  });

  assert.deepEqual(
    {
      source: event.source,
      repo: event.repo,
      branch: event.branch,
      actor: event.actor,
      eventType: event.event_type,
      message: event.message
    },
    {
      source: 'gitlab_ci',
      repo: 'mighty/quietci',
      branch: 'main',
      actor: 'gitlab-user',
      eventType: 'pipeline',
      message: 'GitLab pipeline failed'
    }
  );
});

test('normalizes Jenkins fields into the unified schema', () => {
  const event = normalizeWebhookEvent({
    payload: readPayload('jenkins'),
    headers: { 'x-jenkins': '2.0' }
  });

  assert.deepEqual(
    {
      source: event.source,
      repo: event.repo,
      branch: event.branch,
      actor: event.actor,
      eventType: event.event_type,
      message: event.message
    },
    {
      source: 'jenkins',
      repo: 'quietci/main',
      branch: 'main',
      actor: 'jenkins-user',
      eventType: 'FAILED',
      message: 'Jenkins build failed'
    }
  );
});

test('normalizes CircleCI fields into the unified schema', () => {
  const event = normalizeWebhookEvent({
    payload: readPayload('circleci'),
    headers: { 'circleci-signature': 'signature' }
  });

  assert.deepEqual(
    {
      source: event.source,
      repo: event.repo,
      branch: event.branch,
      actor: event.actor,
      eventType: event.event_type,
      message: event.message
    },
    {
      source: 'circleci',
      repo: 'gh/MightyMongo/QuietCI',
      branch: 'main',
      actor: 'circle-user',
      eventType: 'job-completed',
      message: 'CircleCI workflow failed'
    }
  );
});

test('normalizes Azure DevOps fields into the unified schema', () => {
  const event = normalizeWebhookEvent({
    payload: readPayload('azure-devops'),
    headers: { 'x-vss-subscription-id': 'subscription' }
  });

  assert.deepEqual(
    {
      source: event.source,
      repo: event.repo,
      branch: event.branch,
      actor: event.actor,
      eventType: event.event_type,
      message: event.message
    },
    {
      source: 'azure_devops',
      repo: 'MightyMongo/QuietCI',
      branch: 'main',
      actor: 'azure-user@example.com',
      eventType: 'build.complete',
      message: 'Azure pipeline failed'
    }
  );
});

test('treats numeric unix timestamps as seconds when needed', () => {
  assert.equal(toIsoTimestamp(1726314000), '2024-09-14T11:40:00.000Z');
});

test('preserves numeric millisecond timestamps', () => {
  assert.equal(toIsoTimestamp(1726314000000), '2024-09-14T11:40:00.000Z');
});

test('treats values below the seconds cutoff as unix seconds', () => {
  assert.equal(toIsoTimestamp(9999999999), '2286-11-20T17:46:39.000Z');
});

test('treats values at the milliseconds cutoff as milliseconds', () => {
  assert.equal(toIsoTimestamp(10000000000), '1970-04-26T17:46:40.000Z');
});

test('preserves epoch zero timestamps', () => {
  assert.equal(toIsoTimestamp(0), '1970-01-01T00:00:00.000Z');
});

test('falls back to the current time for invalid timestamps', () => {
  const before = Date.now();
  const timestamp = toIsoTimestamp('not-a-date');
  const after = Date.now();
  const parsed = Date.parse(timestamp);

  assert.ok(!Number.isNaN(parsed));
  assert.ok(parsed >= before);
  assert.ok(parsed <= after);
});

test('falls back to the current time for empty timestamps', () => {
  const before = Date.now();
  const timestamp = toIsoTimestamp('');
  const after = Date.now();
  const parsed = Date.parse(timestamp);

  assert.ok(!Number.isNaN(parsed));
  assert.ok(parsed >= before);
  assert.ok(parsed <= after);
});

test('falls back to the current time for undefined timestamps', () => {
  const before = Date.now();
  const timestamp = toIsoTimestamp(undefined);
  const after = Date.now();
  const parsed = Date.parse(timestamp);

  assert.ok(!Number.isNaN(parsed));
  assert.ok(parsed >= before);
  assert.ok(parsed <= after);
});

test('falls back to the current time for null timestamps', () => {
  const before = Date.now();
  const timestamp = toIsoTimestamp(null);
  const after = Date.now();
  const parsed = Date.parse(timestamp);

  assert.ok(!Number.isNaN(parsed));
  assert.ok(parsed >= before);
  assert.ok(parsed <= after);
});

test('falls back to the current time when normalizing malformed timestamps', () => {
  const payload = readPayload('github-actions');
  payload.workflow_run = {
    ...(payload.workflow_run as Record<string, unknown>),
    updated_at: 'not-a-date'
  };

  const before = Date.now();
  const event = normalizeWebhookEvent({
    payload,
    headers: { 'x-github-event': 'workflow_run' }
  });
  const after = Date.now();
  const parsed = Date.parse(event.timestamp);

  assert.ok(!Number.isNaN(parsed));
  assert.ok(parsed >= before);
  assert.ok(parsed <= after);
});
