import { UnifiedEvent } from '../types/events';
import { DeliveryRecord, NotificationSender, TargetConfig } from './types';

export class SlackSender implements NotificationSender {
  async send(
    targetName: string,
    target: TargetConfig,
    event: UnifiedEvent
  ): Promise<DeliveryRecord> {
    if (!target.resolvedWebhookUrl) {
      return {
        targetName,
        channel: 'slack',
        status: 'skipped',
        details: 'SLACK_WEBHOOK_URL is not configured'
      };
    }

    try {
      const response = await fetch(target.resolvedWebhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: `[${event.source}] ${event.repo} ${event.branch}: ${event.message}`
        })
      });

      return {
        targetName,
        channel: 'slack',
        status: response.ok ? 'sent' : 'failed',
        details: response.ok
          ? 'Delivered to Slack webhook'
          : `Slack webhook failed with ${response.status}`
      };
    } catch (error) {
      return {
        targetName,
        channel: 'slack',
        status: 'failed',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown Slack delivery error'
      };
    }
  }
}
