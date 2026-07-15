import { execFile as execFileCallback } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { CliKind, CliModelOption, CliOptions } from '../../shared/terminals'

const execFile = promisify(execFileCallback)

const DEFAULT_CLAUDE_REASONING_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
const CLAUDE_OPTIONS_CACHE_MS = 15_000

interface CachedOptions {
  readonly expiresAt: number
  readonly options: CliOptions
}

const claudeOptionsCache = new Map<string, CachedOptions>()

export function executableFor(cli: CliKind): string {
  if (cli === 'codex') {
    return process.env.CODEX_COMMAND || 'codex'
  }

  return process.env.CLAUDE_COMMAND || 'claude'
}

export async function readCliOptions(cli: CliKind, cwd: string): Promise<CliOptions> {
  const executable = executableFor(cli)

  try {
    if (cli === 'codex') {
      return await codexOptions(executable)
    }

    const cached = claudeOptionsCache.get(cwd)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.options
    }

    const options = claudeOptions(await cliHelp(executable))
    claudeOptionsCache.set(cwd, { options, expiresAt: Date.now() + CLAUDE_OPTIONS_CACHE_MS })

    return options
  } catch (error: unknown) {
    return {
      cli,
      available: false,
      models: [],
      reasoningLevels: cli === 'claude' ? DEFAULT_CLAUDE_REASONING_LEVELS : [],
      supportsFast: false,
      error:
        error instanceof Error
          ? error.message
          : `The ${cli} CLI could not be inspected on this machine.`
    }
  }
}

async function cliHelp(executable: string): Promise<string> {
  try {
    const result = await execFile(executable, ['--help'], {
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 5_000,
      maxBuffer: 500_000
    })

    return stripAnsi(`${result.stdout}\n${result.stderr}`)
  } catch (error: unknown) {
    const failure = error as { stdout?: string; stderr?: string; message?: string }

    if (failure.stdout || failure.stderr) {
      return stripAnsi(`${failure.stdout ?? ''}\n${failure.stderr ?? ''}`)
    }

    throw new Error(failure.message ?? `'${executable}' is not available on this PATH.`, { cause: error })
  }
}

async function codexOptions(executable: string): Promise<CliOptions> {
  const models = await readCodexModels(executable)

  if (models.length === 0) {
    throw new Error('Codex returned no available models for this account.')
  }

  const config = readCodexConfig()
  const reasoningLevels = [...new Set(models.flatMap((model) => model.reasoningLevels))]
  const defaultModel = models.some((model) => model.id === config.model) ? config.model : models[0]?.id
  const selectedModel = models.find((model) => model.id === defaultModel)
  const defaultReasoningLevel =
    config.reasoningLevel && selectedModel?.reasoningLevels.includes(config.reasoningLevel)
      ? config.reasoningLevel
      : selectedModel?.defaultReasoningLevel

  return {
    cli: 'codex',
    available: true,
    models,
    defaultModel,
    defaultReasoningLevel,
    reasoningLevels,
    supportsFast: models.some((model) => model.fastAvailable),
    fastDefault: config.fast
  }
}

async function readCodexModels(executable: string): Promise<CliModelOption[]> {
  try {
    const result = await execFile(executable, ['debug', 'models'], {
      env: { ...process.env, NO_COLOR: '1' },
      timeout: 12_000,
      maxBuffer: 2_000_000
    })

    const parsed = JSON.parse(String(result.stdout)) as { models?: Array<Record<string, unknown>> }

    if (!Array.isArray(parsed.models)) {
      return []
    }

    return parsed.models
      .filter((model) => typeof model.slug === 'string' && model.visibility === 'list')
      .map((model) => {
        const speedTiers = Array.isArray(model.additional_speed_tiers) ? model.additional_speed_tiers : []

        return {
          id: model.slug as string,
          label: typeof model.display_name === 'string' ? model.display_name : (model.slug as string),
          description: typeof model.description === 'string' ? model.description : undefined,
          reasoningLevels: readCodexReasoningLevels(model.supported_reasoning_levels),
          defaultReasoningLevel:
            typeof model.default_reasoning_level === 'string' ? model.default_reasoning_level : undefined,
          fastAvailable: speedTiers.includes('fast')
        } satisfies CliModelOption
      })
  } catch (error: unknown) {
    const failure = error as { stderr?: string; message?: string }

    throw new Error(failure.stderr?.trim() || failure.message || 'The current Codex model catalog could not be read.', {
      cause: error
    })
  }
}

function readCodexReasoningLevels(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((level) => (level && typeof level === 'object' && 'effort' in level ? level.effort : undefined))
    .filter((level): level is string => typeof level === 'string')
}

function claudeOptions(help: string): CliOptions {
  const reasoningLevels = parseChoices(help, '--effort') ?? []
  const configuredModel = readClaudeSetting('model')
  const configuredEffort = readClaudeSetting('effortLevel')
  const defaultReasoningLevel =
    configuredEffort && reasoningLevels.includes(configuredEffort) ? configuredEffort : undefined

  const models: CliModelOption[] = claudeModelChoices(help).map((model) => ({
    ...model,
    reasoningLevels,
    defaultReasoningLevel,
    fastAvailable: false
  }))

  const resolvedModel = resolveClaudeModel(configuredModel, models)

  if (configuredModel && !resolvedModel) {
    models.unshift({
      id: configuredModel,
      label: configuredModel,
      description: 'Configured locally on this machine.',
      reasoningLevels,
      defaultReasoningLevel,
      fastAvailable: false
    })
  }

  return {
    cli: 'claude',
    available: models.length > 0,
    models,
    defaultModel: resolvedModel ?? configuredModel ?? models[0]?.id,
    defaultReasoningLevel,
    reasoningLevels,
    supportsFast: false
  }
}

function claudeModelChoices(help: string): Array<Pick<CliModelOption, 'id' | 'label' | 'description'>> {
  const helpAliases = new Set(parseClaudeModels(help))

  const choices = [
    { id: 'default', label: 'Default', description: 'The current recommendation for your account.' },
    { id: 'opus', label: 'Opus', description: 'Peak capability for hard problems.' },
    { id: 'fable', label: 'Fable', description: 'More headroom for long-running work.' },
    { id: 'sonnet', label: 'Sonnet', description: 'Balanced for everyday work.' },
    { id: 'haiku', label: 'Haiku', description: 'Fast answers for simpler tasks.' }
  ]

  return choices.filter(
    (choice) => choice.id === 'default' || choice.id === 'haiku' || helpAliases.has(choice.id)
  )
}

function resolveClaudeModel(
  configuredModel: string | undefined,
  models: readonly CliModelOption[]
): string | undefined {
  if (!configuredModel) {
    return undefined
  }

  if (models.some((model) => model.id === configuredModel)) {
    return configuredModel
  }

  const normalized = configuredModel.toLowerCase()

  return models.find((model) => model.id !== 'default' && normalized.startsWith(`claude-${model.id}-`))?.id
}

function readClaudeSetting(key: string): string | undefined {
  const paths = [
    join(homedir(), '.claude', 'settings.local.json'),
    join(homedir(), '.claude', 'settings.json')
  ]

  for (const path of paths) {
    try {
      const settings = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
      const value = settings[key]

      if (typeof value === 'string' && value) {
        const normalized = stripAnsi(value).trim()

        if (normalized) {
          return normalized
        }
      }
    } catch {
      // A missing or malformed optional settings file must not block the picker.
    }
  }

  return undefined
}

function readCodexConfig(): {
  model?: string | undefined
  reasoningLevel?: string | undefined
  fast?: boolean | undefined
} {
  const path = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'config.toml')

  try {
    const config = readFileSync(path, 'utf8')

    return {
      model: config.match(/^model\s*=\s*["']([^"']+)["']/m)?.[1],
      reasoningLevel: config.match(/^model_reasoning_effort\s*=\s*["']([^"']+)["']/m)?.[1],
      fast: /^(?:service_tier\s*=\s*["']fast["']|\[features\][\s\S]*?^fast_mode\s*=\s*true)/m.test(config)
    }
  } catch {
    return {}
  }
}

function parseChoices(help: string, flag: string): string[] | undefined {
  const flagPosition = help.indexOf(flag)

  if (flagPosition < 0) {
    return undefined
  }

  const section = help.slice(flagPosition, flagPosition + 700)
  const choices = section
    .match(/\(([^)]+)\)/)?.[1]
    ?.split(',')
    .map((choice) => choice.trim())
    .filter((choice) => /^[a-z0-9_-]+$/i.test(choice))

  return choices?.length ? choices : undefined
}

function parseClaudeModels(help: string): string[] {
  const flagPosition = help.indexOf('--model <model>')

  if (flagPosition < 0) {
    return []
  }

  const section = help.slice(flagPosition, flagPosition + 900)

  return [
    ...new Set(
      [...section.matchAll(/'([^']+)'/g)]
        .map((match) => match[1])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => /^[a-z0-9._-]+$/i.test(value))
    )
  ]
}

function stripAnsi(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b[@-_]/g, '')
    .replace(/\[(?:\d{1,3};?)+m\]?/g, '')
}
