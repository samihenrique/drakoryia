export const cliKinds = ['codex', 'claude'] as const

export type CliKind = (typeof cliKinds)[number]

export type TerminalStatus = 'running' | 'closed'

export interface CanvasPosition {
  readonly x: number
  readonly y: number
}

export interface TerminalGeometry {
  readonly position: CanvasPosition
  readonly width: number
  readonly height: number
}

export interface TerminalLaunchOptions {
  readonly model?: string | undefined
  readonly reasoningLevel?: string | undefined
  readonly fast?: boolean | undefined
  readonly bypassApprovals?: boolean | undefined
}

export interface CreateTerminalInput extends TerminalLaunchOptions {
  readonly cli: CliKind
  readonly workspaceId: string
  readonly position: CanvasPosition
}

export interface CliModelOption {
  readonly id: string
  readonly label: string
  readonly description?: string | undefined
  readonly reasoningLevels: readonly string[]
  readonly defaultReasoningLevel?: string | undefined
  readonly fastAvailable: boolean
}

export interface CliOptions {
  readonly cli: CliKind
  readonly available: boolean
  readonly models: readonly CliModelOption[]
  readonly defaultModel?: string | undefined
  readonly defaultReasoningLevel?: string | undefined
  readonly reasoningLevels: readonly string[]
  readonly supportsFast: boolean
  readonly fastDefault?: boolean | undefined
  readonly error?: string | undefined
}

export interface TerminalSnapshot {
  readonly id: string
  readonly workspaceId: string
  readonly cli: CliKind
  readonly cwd: string
  readonly startedAt: string
  readonly status: TerminalStatus
  readonly exitCode?: number | undefined
  readonly signal?: number | undefined
  readonly history: string
  readonly geometry: TerminalGeometry
}

export interface TerminalOutputEvent {
  readonly id: string
  readonly data: string
}

export interface TerminalExitEvent {
  readonly id: string
  readonly exitCode: number
  readonly signal?: number | undefined
}

export interface TerminalLayoutItem {
  readonly id: string
  readonly geometry: TerminalGeometry
}

export const CLI_LABELS: Record<CliKind, string> = {
  codex: 'Codex',
  claude: 'Claude'
}

export const DEFAULT_TERMINAL_WIDTH = 520
export const DEFAULT_TERMINAL_HEIGHT = 360
export const MIN_TERMINAL_WIDTH = 360
export const MIN_TERMINAL_HEIGHT = 230
