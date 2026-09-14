import { UnifiedEvent } from '../types/events';
import { DeliveryRecord, NotificationSender, TargetConfig } from './types';

function sanitizeTeamsText(value: string): string {
  return value.replace(/[<>&]/g, (char) => {
    if (char === '<') return '&lt;';
    if (char === '>') return '&gt;';
    return '&amp;';
  });
}

export class TeamsSender implements NotificationSender {
  async send(
    targetName: string,
    target: TargetConfig,
    event: UnifiedEvent
  ): Promise<DeliveryRecord> {
    if (!target.resolvedWebhookUrl) {
      return {
        targetName,
        channel: 'teams',
        status: 'skipped',
        details: 'TEAMS_WEBHOOK_URL is not configured'
      };
    }

    try {
      const response = await fetch(target.resolvedWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: sanitizeTeamsText(
            `[${event.source}] ${event.repo} ${event.branch}: ${event.message}`
          )
        })
      });

      return {
        targetName,
        channel: 'teams',
        status: response.ok ? 'sent' : 'failed',
        details: response.ok
          ? 'Delivered to Teams webhook'
          : `Teams webhook failed with ${response.status}`
      };
    } catch (error) {
      return {
        targetName,
        channel: 'teams',
        status: 'failed',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown Teams delivery error'
      };
    }
  }
}
