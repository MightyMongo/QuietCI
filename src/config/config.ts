import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { TargetConfig, TargetsFile } from '../routing/types';
import { RuleConfig, RulesFile } from '../types/events';

export interface RuntimeConfig {
  port: number;
  databasePath: string;
  rulesPath: string;
  targetsPath: string;
  aiApiKeys: string[];
}

function readStructuredFile<T>(filePath: string): T {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.json')) {
    return JSON.parse(fileContents) as T;
  }

  return YAML.parse(fileContents) as T;
}

export function loadRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env
): RuntimeConfig {
  const cwd = process.cwd();

  return {
    port: Number(env.PORT ?? 8080),
    databasePath: path.resolve(
      cwd,
      env.QUIETCI_DATABASE_PATH ?? '.data/quietci.sqlite'
    ),
    rulesPath: path.resolve(cwd, env.QUIETCI_RULES_PATH ?? 'config/rules.yaml'),
    targetsPath: path.resolve(
      cwd,
      env.QUIETCI_TARGETS_PATH ?? 'config/targets.yaml'
    ),
    aiApiKeys: [env.OPENAI_API_KEY, env.ANTHROPIC_API_KEY].filter(
      (value): value is string => Boolean(value)
    )
  };
}

export function loadRulesConfig(filePath: string): RuleConfig[] {
  const data = readStructuredFile<RulesFile>(filePath);
  return data.rules ?? [];
}

export function loadTargetsConfig(filePath: string): TargetsFile {
  const data = readStructuredFile<Partial<TargetsFile>>(filePath);
  return {
    defaultTargets: data.defaultTargets ?? [],
    targets: data.targets ?? {}
  };
}

export function resolveTargetEnv(
  target: TargetConfig,
  env: NodeJS.ProcessEnv = process.env
): TargetConfig {
  const smtpPortValue = target.smtpPortEnv
    ? env[target.smtpPortEnv]
    : undefined;
  const parsedSmtpPort =
    smtpPortValue && /^\d+$/.test(smtpPortValue)
      ? Number(smtpPortValue)
      : undefined;

  return {
    ...target,
    resolvedWebhookUrl: target.webhookUrlEnv
      ? env[target.webhookUrlEnv]
      : undefined,
    resolvedSmtpHost: target.smtpHostEnv ? env[target.smtpHostEnv] : undefined,
    resolvedSmtpPort: parsedSmtpPort,
    resolvedSmtpUser: target.smtpUserEnv ? env[target.smtpUserEnv] : undefined,
    resolvedSmtpPass: target.smtpPassEnv ? env[target.smtpPassEnv] : undefined
  };
}
