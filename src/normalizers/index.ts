import { IncomingHttpHeaders } from 'node:http';
import { EventSource, UnifiedEvent } from '../types/events';
import { normalizeAzureDevOps } from './azure';
import { normalizeCircleCI } from './circleci';
import { normalizeGitHubActions } from './github';
import { normalizeGitLab } from './gitlab';
import { normalizeJenkins } from './jenkins';

interface NormalizerInput {
  payload: Record<string, any>;
  headers?: IncomingHttpHeaders;
}

function headerValue(
  headers: IncomingHttpHeaders,
  key: string
): string | undefined {
  const value = headers[key];
  return Array.isArray(value) ? value[0] : value;
}

export function detectSource(
  payload: Record<string, any>,
  headers: IncomingHttpHeaders = {}
): EventSource {
  if (headerValue(headers, 'x-github-event')) {
    return 'github_actions';
  }
  if (headerValue(headers, 'x-gitlab-event')) {
    return 'gitlab_ci';
  }
  if (headerValue(headers, 'x-jenkins')) {
    return 'jenkins';
  }
  if (headerValue(headers, 'circleci-signature')) {
    return 'circleci';
  }
  if (headerValue(headers, 'x-vss-subscription-id')) {
    return 'azure_devops';
  }
  if (payload.workflow_run || payload.workflow_job || payload.check_suite) {
    return 'github_actions';
  }
  if (payload.object_kind || payload.object_attributes) {
    return 'gitlab_ci';
  }
  if (payload.job || payload.build || payload.jenkins) {
    return 'jenkins';
  }
  if (payload.pipeline || payload.project_slug) {
    return 'circleci';
  }
  if (payload.eventType || payload.resource) {
    return 'azure_devops';
  }

  throw new Error('Unable to detect CI source');
}

export function normalizeWebhookEvent({
  payload,
  headers = {}
}: NormalizerInput): UnifiedEvent {
  const source = detectSource(payload, headers);

  switch (source) {
    case 'github_actions':
      return normalizeGitHubActions(payload);
    case 'gitlab_ci':
      return normalizeGitLab(payload);
    case 'jenkins':
      return normalizeJenkins(payload);
    case 'circleci':
      return normalizeCircleCI(payload);
    case 'azure_devops':
      return normalizeAzureDevOps(payload);
  }
}
