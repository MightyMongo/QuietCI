import { UnifiedEvent } from '../types/events';
import { coerceString, normalizeBranch, toIsoTimestamp } from './helpers';

export function normalizeGitLab(payload: Record<string, any>): UnifiedEvent {
  const attributes = payload.object_attributes ?? {};
  const commit = payload.commit ?? {};

  return {
    source: 'gitlab_ci',
    repo: coerceString(
      payload.project?.path_with_namespace ?? payload.project?.name
    ),
    branch: normalizeBranch(payload.ref ?? attributes.ref),
    actor: coerceString(payload.user_username ?? payload.user_name),
    event_type: coerceString(
      payload.object_kind ?? payload.event_name ?? attributes.status
    ),
    timestamp: toIsoTimestamp(
      attributes.finished_at ?? attributes.created_at ?? commit.timestamp
    ),
    message: coerceString(
      attributes.detailed_status ?? attributes.status ?? commit.message
    ),
    metadata: {
      pipeline_id: attributes.id,
      status: attributes.status,
      web_url: attributes.url ?? payload.project?.web_url
    }
  };
}
