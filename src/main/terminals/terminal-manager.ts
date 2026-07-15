import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import * as pty from 'node-pty'
import type { Workspace } from '../../shared/backend'
import {
  DEFAULT_TERMINAL_HEIGHT,
  DEFAULT_TERMINAL_WIDTH,
  MIN_TERMINAL_HEIGHT,
  MIN_TERMINAL_WIDTH
} from '../../shared/terminals'
import type {
  CliKind,
  CliOptions,
  CreateTerminalInput,
  TerminalExitEvent,
  TerminalGeometry,
  TerminalOutputEvent,
  TerminalSnapshot
} from '../../shared/terminals'
import { executableFor, readCliOptions } from './cli-catalog'

const MAX_HISTORY_LENGTH = 250_000
const MAX_INPUT_LENGTH = 100_000
const MAX_WIDTH = 2_500
const MAX_HEIGHT = 2_000
const INITIAL_COLS = 100
const INITIAL_ROWS = 28

interface TerminalSession {
  readonly id: string
  readonly workspaceId: string
  readonly cli: CliKind
  readonly cwd: string
  readonly startedAt: string
  status: 'running' | 'closed'
  process?: pty.IPty | undefined
  history: string
  exitCode?: number | undefined
  signal?: number | undefined
  geometry: TerminalGeometry
}

export type WorkspaceResolver = (id: string) => Promise<Workspace>

export class TerminalManager {
  readonly events = new EventEmitter()

  private readonly sessions = new Map<string, TerminalSession>()

  constructor(private readonly resolveWorkspace: WorkspaceResolver) {}

  async options(cli: CliKind, workspaceId: string): Promise<CliOptions> {
    const workspace = await this.resolveWorkspace(workspaceId)

    return readCliOptions(cli, workspace.localPath)
  }

  async create(input: CreateTerminalInput): Promise<TerminalSnapshot> {
    const workspace = await this.resolveWorkspace(input.workspaceId)
    const cwd = workspace.localPath
    const executable = executableFor(input.cli)
    const args = await this.argumentsFor(input, cwd)
    const id = randomUUID()

    let ptyProcess: pty.IPty

    try {
      ptyProcess = pty.spawn(executable, args, {
        name: 'xterm-256color',
        cols: INITIAL_COLS,
        rows: INITIAL_ROWS,
        cwd,
        env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }
      })
    } catch {
      throw new Error(
        `'${executable}' could not be started. Make sure the ${input.cli} CLI is installed and on your PATH.`
      )
    }

    const session: TerminalSession = {
      id,
      workspaceId: input.workspaceId,
      cli: input.cli,
      cwd,
      startedAt: new Date().toISOString(),
      status: 'running',
      process: ptyProcess,
      history: '',
      geometry: {
        position: input.position,
        width: DEFAULT_TERMINAL_WIDTH,
        height: DEFAULT_TERMINAL_HEIGHT
      }
    }

    this.sessions.set(id, session)

    ptyProcess.onData((data) => {
      session.history = `${session.history}${data}`.slice(-MAX_HISTORY_LENGTH)
      this.events.emit('output', { id, data } satisfies TerminalOutputEvent)
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      session.status = 'closed'
      session.exitCode = exitCode
      session.signal = signal
      session.process = undefined
      this.events.emit('exit', { id, exitCode, signal } satisfies TerminalExitEvent)
    })

    return this.snapshot(session)
  }

  list(workspaceId: string): TerminalSnapshot[] {
    return [...this.sessions.values()]
      .filter((session) => session.workspaceId === workspaceId)
      .map((session) => this.snapshot(session))
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id)

    if (!session || session.status !== 'running' || !session.process) {
      return
    }

    if (typeof data !== 'string' || data.length > MAX_INPUT_LENGTH) {
      return
    }

    session.process.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id)

    if (!session || session.status !== 'running' || !session.process) {
      return
    }

    if (!Number.isInteger(cols) || !Number.isInteger(rows)) {
      return
    }

    if (cols < 2 || rows < 2 || cols > 500 || rows > 300) {
      return
    }

    session.process.resize(cols, rows)
  }

  saveGeometry(id: string, geometry: TerminalGeometry): void {
    const session = this.sessions.get(id)

    if (!session) {
      return
    }

    const { position, width, height } = geometry

    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) {
      return
    }

    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      return
    }

    session.geometry = {
      position: { x: position.x, y: position.y },
      width: clamp(width, MIN_TERMINAL_WIDTH, MAX_WIDTH),
      height: clamp(height, MIN_TERMINAL_HEIGHT, MAX_HEIGHT)
    }
  }

  close(id: string): void {
    const session = this.sessions.get(id)

    if (session?.status === 'running') {
      session.process?.kill('SIGTERM')
    }
  }

  remove(id: string): void {
    this.close(id)
    this.sessions.delete(id)
  }

  disposeAll(): void {
    for (const session of this.sessions.values()) {
      if (session.status === 'running') {
        session.process?.kill('SIGTERM')
      }
    }

    this.sessions.clear()
  }

  private async argumentsFor(input: CreateTerminalInput, cwd: string): Promise<string[]> {
    const catalog = await readCliOptions(input.cli, cwd)

    if (!catalog.available || catalog.models.length === 0) {
      throw new Error(catalog.error ?? `No models are available for the ${input.cli} CLI right now.`)
    }

    const model = cleanOption(input.model)
    const reasoningLevel = cleanOption(input.reasoningLevel)
    const firstModel = catalog.models[0]

    if (!firstModel) {
      throw new Error(`No models are available for the ${input.cli} CLI right now.`)
    }

    const selectedModelId = model ?? catalog.defaultModel ?? firstModel.id
    const selectedModel = catalog.models.find((candidate) => candidate.id === selectedModelId)

    if (!selectedModel) {
      throw new Error(
        'The chosen model is not available in the current CLI installation. Refresh the picker and try again.'
      )
    }

    const allowedReasoningLevels = selectedModel.reasoningLevels.length
      ? selectedModel.reasoningLevels
      : catalog.reasoningLevels

    if (reasoningLevel && !allowedReasoningLevels.includes(reasoningLevel)) {
      throw new Error('The selected thinking effort is not supported by this model.')
    }

    if (input.fast === true && (input.cli !== 'codex' || !selectedModel.fastAvailable)) {
      throw new Error('Fast mode is not available for the selected model.')
    }

    const args: string[] = []

    if (!(input.cli === 'claude' && selectedModelId === 'default')) {
      args.push('--model', selectedModelId)
    }

    if (input.cli === 'claude') {
      if (reasoningLevel) {
        args.push('--effort', reasoningLevel)
      }

      return args
    }

    if (reasoningLevel) {
      args.push('--config', `model_reasoning_effort=${JSON.stringify(reasoningLevel)}`)
    }

    if (input.fast === true) {
      args.push('--config', 'service_tier="fast"', '--config', 'features.fast_mode=true')
    }

    return args
  }

  private snapshot(session: TerminalSession): TerminalSnapshot {
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      cli: session.cli,
      cwd: session.cwd,
      startedAt: session.startedAt,
      status: session.status,
      exitCode: session.exitCode,
      signal: session.signal,
      history: session.history,
      geometry: session.geometry
    }
  }
}

function cleanOption(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  if (!trimmed || trimmed.length > 200 || trimmed.includes('\u0000') || /[\r\n]/.test(trimmed)) {
    return undefined
  }

  return trimmed
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
