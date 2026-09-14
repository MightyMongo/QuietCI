import { FilterDecision, UnifiedEvent } from '../types/events';

export interface SummarizerAdapter {
  isEnabled(): boolean;
  summarize(event: UnifiedEvent, decision: FilterDecision): Promise<string>;
}

class NoopSummarizerAdapter implements SummarizerAdapter {
  constructor(private readonly enabled: boolean) {}

  isEnabled(): boolean {
    return this.enabled;
  }

  async summarize(
    event: UnifiedEvent,
    decision: FilterDecision
  ): Promise<string> {
    const prefix = this.enabled
      ? 'AI summary placeholder'
      : 'Summary placeholder';
    return `${prefix}: ${event.source} ${event.repo} ${event.branch} => ${decision.action} (${event.message})`;
  }
}

export function createSummarizerAdapter(apiKeys: string[]): SummarizerAdapter {
  return new NoopSummarizerAdapter(apiKeys.length > 0);
}
