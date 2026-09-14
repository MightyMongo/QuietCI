import { UnifiedEvent } from '../types/events';
import { coerceString, normalizeBranch, toIsoTimestamp } from './helpers';

export function normalizeAzureDevOps(
  payload: Record<string, any>
): UnifiedEvent {
  const resource = payload.resource ?? {};

  return {
    source: 'azure_devops',
    repo: coerceString(
      resource.repository?.fullName ??
        resource.repositories?.self?.repository?.fullName ??
        payload.resourceContainers?.project?.baseUrl
    ),
    branch: normalizeBranch(resource.sourceBranch ?? resource.refName),
    actor: coerceString(
      resource.requestedFor?.uniqueName ?? payload.createdBy?.displayName
    ),
    event_type: coerceString(
      payload.eventType ?? resource.result ?? 'pipeline'
    ),
    timestamp: toIsoTimestamp(
      payload.createdDate ?? resource.finishTime ?? resource.queueTime
    ),
    message: coerceString(
      payload.message?.text ?? resource.definition?.name ?? resource.result
    ),
    metadata: {
      id: resource.id,
      result: resource.result,
      url: resource.url
    }
  };
}
