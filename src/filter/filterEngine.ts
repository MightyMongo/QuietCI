import {
  FilterDecision,
  RateLimitConfig,
  RuleConfig,
  RuleConditions,
  UnifiedEvent
} from '../types/events';

export class FilterEngine {
  private readonly rateLimits = new Map<string, number[]>();

  constructor(private readonly rules: RuleConfig[]) {}

  evaluate(event: UnifiedEvent): FilterDecision {
    for (const rule of this.rules) {
      if (!this.matches(rule.conditions ?? {}, event)) {
        continue;
      }

      const rateLimited = this.isRateLimited(
        rule.name,
        event,
        rule.action.rate_limit
      );
      const action = rule.action.type;
      const snoozeUntil =
        action === 'SNOOZE' && rule.action.snooze_minutes
          ? new Date(
              Date.now() + rule.action.snooze_minutes * 60_000
            ).toISOString()
          : undefined;

      return {
        ruleName: rule.name,
        action,
        severity: rule.action.severity ?? 'medium',
        targets: rule.action.targets ?? [],
        summaryRequested:
          Boolean(rule.action.summary) ||
          action === 'SUMMARY_ONLY' ||
          rateLimited,
        snoozeUntil,
        rateLimited
      };
    }

    return {
      action: 'ROUTE',
      severity: 'medium',
      targets: [],
      summaryRequested: false,
      rateLimited: false
    };
  }

  private matches(conditions: RuleConditions, event: UnifiedEvent): boolean {
    return (
      this.matchesValue(conditions.source, event.source) &&
      this.matchesValue(conditions.repo, event.repo) &&
      this.matchesValue(conditions.branch, event.branch) &&
      this.matchesValue(conditions.actor, event.actor) &&
      this.matchesValue(conditions.event_type, event.event_type) &&
      this.matchesRegex(conditions.message_regex, event.message)
    );
  }

  private matchesValue(
    condition: string | string[] | undefined,
    actual: string
  ): boolean {
    if (!condition) {
      return true;
    }

    const allowed = Array.isArray(condition) ? condition : [condition];
    return allowed.includes(actual);
  }

  private matchesRegex(pattern: string | undefined, value: string): boolean {
    if (!pattern) {
      return true;
    }

    try {
      return new RegExp(pattern, 'i').test(value);
    } catch {
      return false;
    }
  }

  private isRateLimited(
    ruleName: string,
    event: UnifiedEvent,
    rateLimit?: RateLimitConfig
  ): boolean {
    if (!rateLimit) {
      return false;
    }

    const key = JSON.stringify([
      ruleName,
      event.repo,
      event.branch,
      event.actor,
      event.event_type
    ]);
    const now = Date.now();
    const windowStart = now - rateLimit.window_seconds * 1000;
    const timestamps = (this.rateLimits.get(key) ?? []).filter(
      (timestamp) => timestamp >= windowStart
    );

    timestamps.push(now);
    this.rateLimits.set(key, timestamps);

    return timestamps.length > rateLimit.count;
  }
}
