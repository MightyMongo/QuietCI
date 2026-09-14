import { UnifiedEvent } from '../types/events';

export type ChannelType = 'slack' | 'teams' | 'email' | 'unknown';
export type DeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface TargetConfig {
  channel: ChannelType;
  webhookUrlEnv?: string;
  smtpHostEnv?: string;
  smtpPortEnv?: string;
  smtpUserEnv?: string;
  smtpPassEnv?: string;
  from?: string;
  to?: string[];
  resolvedWebhookUrl?: string;
  resolvedSmtpHost?: string;
  resolvedSmtpPort?: number;
  resolvedSmtpUser?: string;
  resolvedSmtpPass?: string;
}

export interface TargetsFile {
  defaultTargets: string[];
  targets: Record<string, TargetConfig>;
}

export interface DeliveryRecord {
  targetName: string;
  channel: ChannelType;
  status: DeliveryStatus;
  details: string;
}

export interface NotificationSender {
  send(
    targetName: string,
    target: TargetConfig,
    event: UnifiedEvent
  ): Promise<DeliveryRecord>;
}
