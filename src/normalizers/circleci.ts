import { UnifiedEvent } from '../types/events';
import { coerceString, normalizeBranch, toIsoTimestamp } from './helpers';

export function normalizeCircleCI(payload: Record<string, any>): UnifiedEvent {
  const pipeline = payload.pipeline ?? {};
  const vcs = pipeline.vcs ?? {};

  return {
    source: 'circleci',
    repo: coerceString(
      payload.project?.slug ?? vcs.repository_url ?? payload.project_slug
    ),
    branch: normalizeBranch(vcs.branch ?? payload.branch),
    actor: coerceString(
      payload.actor?.login ?? payload.user?.login ?? payload.trigger?.actor
    ),
    event_type: coerceString(
      payload.type ?? payload.status ?? payload.event_type ?? 'pipeline'
    ),
    timestamp: toIsoTimestamp(payload.created_at ?? pipeline.created_at),
    message: coerceString(
      payload.message ?? payload.workflow?.name ?? payload.status
    ),
    metadata: {
      id: payload.id,
      state: payload.state ?? payload.status,
      web_url: payload.web_url
    }
  };
}
