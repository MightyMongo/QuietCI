import { UnifiedEvent } from '../types/events';
import { coerceString, normalizeBranch, toIsoTimestamp } from './helpers';

export function normalizeGitHubActions(
  payload: Record<string, any>
): UnifiedEvent {
  const workflowRun = payload.workflow_run ?? {};
  const workflowJob = payload.workflow_job ?? {};
  const repo = payload.repository?.full_name ?? payload.repository?.name;
  const branch = workflowRun.head_branch ?? normalizeBranch(payload.ref);
  const actor =
    payload.sender?.login ??
    workflowRun.actor?.login ??
    workflowJob.runner_name;
  const eventType =
    workflowRun.conclusion ??
    workflowJob.conclusion ??
    payload.action ??
    workflowRun.status ??
    workflowJob.status ??
    'workflow_event';
  const message =
    workflowRun.display_title ??
    workflowJob.name ??
    workflowRun.name ??
    `${coerceString(eventType)} for ${coerceString(repo, 'repository')}`;

  return {
    source: 'github_actions',
    repo: coerceString(repo),
    branch: normalizeBranch(branch),
    actor: coerceString(actor),
    event_type: coerceString(eventType),
    timestamp: toIsoTimestamp(
      workflowRun.updated_at ??
        workflowRun.created_at ??
        workflowJob.started_at ??
        payload.repository?.updated_at
    ),
    message,
    metadata: {
      action: payload.action,
      conclusion: workflowRun.conclusion ?? workflowJob.conclusion,
      html_url: workflowRun.html_url ?? workflowJob.html_url
    }
  };
}
