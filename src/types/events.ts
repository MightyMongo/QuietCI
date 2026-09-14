export type EventSource =
  | 'github_actions'
  | 'gitlab_ci'
  | 'jenkins'
  | 'circleci'
  | 'azure_devops';

export interface UnifiedEvent {
  source: EventSource;
  repo: string;
  branch: string;
  actor: string;
  event_type: string;
  timestamp: string;
  message: string;
  metadata: Record<string, unknown>;
}

export type RuleActionType = 'IGNORE' | 'ROUTE' | 'SUMMARY_ONLY' | 'SNOOZE';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface RuleConditions {
  source?: EventSource | EventSource[];
  repo?: string | string[];
  branch?: string | string[];
  actor?: string | string[];
  event_type?: string | string[];
  message_regex?: string;
}

export interface RateLimitConfig {
  count: number;
  window_seconds: number;
}

export interface RuleActionConfig {
  type: RuleActionType;
  targets?: string[];
  severity?: Severity;
  summary?: boolean;
  snooze_minutes?: number;
  rate_limit?: RateLimitConfig;
}

export interface RuleConfig {
  name: string;
  conditions?: RuleConditions;
  action: RuleActionConfig;
}

export interface RulesFile {
  rules: RuleConfig[];
}

export interface FilterDecision {
  ruleName?: string;
  action: RuleActionType;
  severity: Severity;
  targets: string[];
  summaryRequested: boolean;
  snoozeUntil?: string;
  rateLimited: boolean;
}
