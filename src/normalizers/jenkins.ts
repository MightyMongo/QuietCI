import { UnifiedEvent } from '../types/events';
import { coerceString, normalizeBranch, toIsoTimestamp } from './helpers';

export function normalizeJenkins(payload: Record<string, any>): UnifiedEvent {
  const build = payload.build ?? {};
  const job = payload.job ?? {};

  return {
    source: 'jenkins',
    repo: coerceString(
      payload.repository?.full_name ?? job.full_name ?? payload.name
    ),
    branch: normalizeBranch(payload.branch_name ?? build.scm?.branch),
    actor: coerceString(payload.triggered_by ?? payload.actor, 'jenkins'),
    event_type: coerceString(build.status ?? payload.event_type ?? 'build'),
    timestamp: toIsoTimestamp(build.timestamp ?? payload.timestamp),
    message: coerceString(
      payload.message ??
        `${coerceString(job.name ?? payload.name, 'job')} ${coerceString(build.status)}`
    ),
    metadata: {
      build_number: build.number,
      url: build.full_url ?? build.url,
      result: build.result ?? build.status
    }
  };
}
