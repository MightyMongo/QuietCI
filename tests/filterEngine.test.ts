import assert from 'node:assert/strict';
import test from 'node:test';
import { FilterEngine } from '../src/filter/filterEngine';
import { RuleConfig, UnifiedEvent } from '../src/types/events';

const baseEvent: UnifiedEvent = {
  source: 'github_actions',
  repo: 'MightyMongo/QuietCI',
  branch: 'main',
  actor: 'octocat',
  event_type: 'completed',
  timestamp: '2026-09-14T12:00:00.000Z',
  message: 'Build failed',
  metadata: {}
};

test('routes matching failure events to configured targets', () => {
  const rules: RuleConfig[] = [
    {
      name: 'route-failures',
      conditions: { message_regex: 'fail' },
      action: {
        type: 'ROUTE',
        severity: 'critical',
        targets: ['slack-default']
      }
    }
  ];

  const decision = new FilterEngine(rules).evaluate(baseEvent);

  assert.equal(decision.action, 'ROUTE');
  assert.deepEqual(decision.targets, ['slack-default']);
  assert.equal(decision.severity, 'critical');
});

test('supports snoozing matched bot traffic', () => {
  const rules: RuleConfig[] = [
    {
      name: 'snooze-bot',
      conditions: { actor: 'dependabot[bot]' },
      action: { type: 'SNOOZE', severity: 'low', snooze_minutes: 15 }
    }
  ];

  const decision = new FilterEngine(rules).evaluate({
    ...baseEvent,
    actor: 'dependabot[bot]'
  });

  assert.equal(decision.action, 'SNOOZE');
  assert.equal(decision.severity, 'low');
  assert.ok(decision.snoozeUntil);
});

test('marks repeated routed events as rate limited without changing the action', () => {
  const rules: RuleConfig[] = [
    {
      name: 'summary-limit',
      conditions: { repo: 'MightyMongo/QuietCI' },
      action: {
        type: 'ROUTE',
        severity: 'high',
        targets: ['slack-default'],
        rate_limit: { count: 1, window_seconds: 60 }
      }
    }
  ];

  const engine = new FilterEngine(rules);
  const first = engine.evaluate(baseEvent);
  const second = engine.evaluate(baseEvent);

  assert.equal(first.rateLimited, false);
  assert.equal(second.action, 'ROUTE');
  assert.equal(second.rateLimited, true);
  assert.equal(second.summaryRequested, true);
});

test('ignores malformed regex rules instead of throwing', () => {
  const rules: RuleConfig[] = [
    {
      name: 'bad-regex',
      conditions: { message_regex: '[' },
      action: { type: 'IGNORE', severity: 'low' }
    },
    {
      name: 'fallback-route',
      conditions: {},
      action: { type: 'ROUTE', severity: 'medium', targets: ['slack-default'] }
    }
  ];

  const decision = new FilterEngine(rules).evaluate(baseEvent);

  assert.equal(decision.ruleName, 'fallback-route');
  assert.equal(decision.action, 'ROUTE');
});
