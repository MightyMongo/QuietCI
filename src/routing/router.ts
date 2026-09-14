import { resolveTargetEnv } from '../config/config';
import { UnifiedEvent } from '../types/events';
import { EmailSender } from './emailSender';
import { SlackSender } from './slackSender';
import { TeamsSender } from './teamsSender';
import { DeliveryRecord, NotificationSender, TargetsFile } from './types';

export class NotificationRouter {
  private readonly senders: Record<string, NotificationSender> = {
    email: new EmailSender(),
    slack: new SlackSender(),
    teams: new TeamsSender()
  };

  constructor(private readonly targetsFile: TargetsFile) {}

  async route(
    event: UnifiedEvent,
    requestedTargets: string[]
  ): Promise<DeliveryRecord[]> {
    const targetNames =
      requestedTargets.length > 0
        ? requestedTargets
        : this.targetsFile.defaultTargets;
    const deliveries: DeliveryRecord[] = [];

    for (const targetName of targetNames) {
      const target = this.targetsFile.targets[targetName];
      if (!target) {
        deliveries.push({
          targetName,
          channel: 'unknown',
          status: 'failed',
          details: `Unknown target ${targetName}`
        });
        continue;
      }

      const resolvedTarget = resolveTargetEnv(target);
      const sender = this.senders[target.channel];
      if (!sender) {
        deliveries.push({
          targetName,
          channel: target.channel,
          status: 'failed',
          details: `Unsupported channel ${target.channel}`
        });
        continue;
      }

      try {
        deliveries.push(await sender.send(targetName, resolvedTarget, event));
      } catch (error) {
        deliveries.push({
          targetName,
          channel: target.channel,
          status: 'failed',
          details:
            error instanceof Error
              ? error.message
              : `Unknown ${target.channel} delivery failure`
        });
      }
    }

    return deliveries;
  }
}
