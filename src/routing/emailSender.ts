import { UnifiedEvent } from '../types/events';
import { DeliveryRecord, NotificationSender, TargetConfig } from './types';

export class EmailSender implements NotificationSender {
  async send(
    targetName: string,
    target: TargetConfig,
    event: UnifiedEvent
  ): Promise<DeliveryRecord> {
    if (!target.resolvedSmtpHost || !target.to?.length || !target.from) {
      return {
        targetName,
        channel: 'email',
        status: 'skipped',
        details: 'SMTP placeholder is not fully configured'
      };
    }

    return {
      targetName,
      channel: 'email',
      status: 'sent',
      details: `SMTP placeholder accepted alert for ${event.repo} -> ${target.to.join(', ')}`
    };
  }
}
