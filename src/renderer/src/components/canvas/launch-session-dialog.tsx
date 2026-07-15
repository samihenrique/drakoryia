import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { CLI_LABELS } from '../../../../shared/terminals'
import type { CliKind, CliModelOption, CliOptions } from '../../../../shared/terminals'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogDismiss,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cliOptionsQueryOptions } from '@/features/terminals/api'
import { cn } from '@/lib/utils'

const REASONING_LABELS: Record<string, string> = {
  none: 'None',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'Extra high',
  max: 'Max',
  ultra: 'Ultra'
}

export interface LaunchConfig {
  readonly model: string
  readonly reasoningLevel: string
  readonly fast: boolean
  readonly bypassApprovals: boolean
}

interface LaunchSessionDialogProps {
  readonly cli: CliKind | null
  readonly workspaceId: string
  readonly onCancel: () => void
  readonly onLaunch: (config: LaunchConfig) => void
  readonly isLaunching: boolean
  readonly error: Error | null
}

function reasoningLabel(level: string): string {
  return REASONING_LABELS[level] ?? level
}

function defaultsFor(options: CliOptions): LaunchConfig {
  const model = options.defaultModel ?? options.models[0]?.id ?? ''
  const selected = options.models.find((candidate) => candidate.id === model)

  return {
    model,
    reasoningLevel: options.defaultReasoningLevel ?? selected?.defaultReasoningLevel ?? '',
    fast: options.fastDefault === true && (selected ? selected.fastAvailable : options.supportsFast),
    bypassApprovals: true
  }
}

export function LaunchSessionDialog({
  cli,
  workspaceId,
  onCancel,
  onLaunch,
  isLaunching,
  error
}: LaunchSessionDialogProps): React.JSX.Element {
  const [config, setConfig] = useState<LaunchConfig>({
    model: '',
    reasoningLevel: '',
    fast: false,
    bypassApprovals: true
  })

  const optionsQuery = useQuery({
    ...cliOptionsQueryOptions(cli ?? 'claude', workspaceId),
    enabled: cli !== null
  })

  const options = optionsQuery.data

  useEffect(() => {
    if (options) {
      // The query resolves asynchronously and may refresh when the local CLI changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(defaultsFor(options))
    }
  }, [options])

  const selectedModel = options?.models.find((model) => model.id === config.model)
  const reasoningLevels = selectedModel?.reasoningLevels.length
    ? selectedModel.reasoningLevels
    : (options?.reasoningLevels ?? [])
  const fastAvailable =
    cli === 'codex' && (selectedModel ? selectedModel.fastAvailable : options?.supportsFast === true)

  const catalogError = optionsQuery.isError
    ? optionsQuery.error.message
    : options && !options.available
      ? (options.error ?? `The ${cli} CLI is not available on this machine.`)
      : null

  const canLaunch =
    !optionsQuery.isFetching && !catalogError && options?.available === true && Boolean(config.model)

  function selectModel(model: CliModelOption): void {
    setConfig((current) => ({
      ...current,
      model: model.id,
      reasoningLevel:
        model.defaultReasoningLevel ??
        (model.reasoningLevels.includes(current.reasoningLevel) ? current.reasoningLevel : ''),
      fast: current.fast && model.fastAvailable
    }))
  }

  return (
    <Dialog open={cli !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogDismiss />
        <DialogHeader>
          <DialogTitle>Open {cli ? CLI_LABELS[cli] : ''}</DialogTitle>
          <DialogDescription>
            Drakoryia reads the model catalog straight from the CLI installed on this machine.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'size-1.5 rounded-full',
                optionsQuery.isFetching ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
              )}
              aria-hidden="true"
            />
            Local installation catalog
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => void optionsQuery.refetch()}
            disabled={optionsQuery.isFetching}
            aria-label="Refresh CLI options"
          >
            <RefreshCw className={cn('size-3.5', optionsQuery.isFetching && 'animate-spin')} />
          </Button>
        </div>

        {optionsQuery.isPending ? (
          <div className="grid place-items-center gap-2 py-8 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
            Reading available models and capabilities…
          </div>
        ) : null}

        {catalogError ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="leading-6">{catalogError}</p>
          </div>
        ) : null}

        {options?.available && !catalogError ? (
          <div className="grid gap-5">
            <section aria-labelledby="model-picker">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h3 id="model-picker" className="text-sm font-medium">
                  Model
                </h3>
                <p className="text-xs text-muted-foreground">
                  {cli === 'codex' ? 'Available to this account now.' : 'Pick by task difficulty.'}
                </p>
              </div>

              <div
                role="radiogroup"
                aria-labelledby="model-picker"
                className="grid gap-2 sm:grid-cols-2"
              >
                {options.models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    role="radio"
                    aria-checked={config.model === model.id}
                    onClick={() => selectModel(model)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      config.model === model.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/70 hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <p className="text-sm font-medium">{model.label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {model.description ?? model.id}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {reasoningLevels.length > 0 ? (
              <section aria-labelledby="effort-picker">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 id="effort-picker" className="text-sm font-medium">
                    Thinking effort
                  </h3>
                  <p className="text-xs text-muted-foreground">More effort usually takes longer.</p>
                </div>

                <div role="radiogroup" aria-labelledby="effort-picker" className="flex flex-wrap gap-2">
                  {reasoningLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={config.reasoningLevel === level}
                      onClick={() => setConfig((current) => ({ ...current, reasoningLevel: level }))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition-colors',
                        config.reasoningLevel === level
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {reasoningLabel(level)}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {cli === 'codex' ? (
              <button
                type="button"
                role="switch"
                aria-checked={config.fast}
                disabled={!fastAvailable}
                onClick={() => setConfig((current) => ({ ...current, fast: !current.fast }))}
                className={cn(
                  'flex items-center justify-between gap-4 rounded-lg border p-3 text-left transition-colors',
                  config.fast ? 'border-primary bg-primary/10' : 'border-border/70',
                  fastAvailable ? 'hover:border-primary/40' : 'cursor-not-allowed opacity-50'
                )}
              >
                <span>
                  <span className="block text-sm font-medium">Fast mode</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {fastAvailable
                      ? 'Prioritizes speed and burns credits at a higher rate.'
                      : 'This model does not offer Fast for this account.'}
                  </span>
                </span>
                <span
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                    config.fast ? 'bg-primary' : 'bg-muted-foreground/30'
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      'absolute top-0.5 size-4 rounded-full bg-background transition-all',
                      config.fast ? 'left-[1.15rem]' : 'left-0.5'
                    )}
                  />
                </span>
              </button>
            ) : null}

            <button
              type="button"
              role="checkbox"
              aria-checked={config.bypassApprovals}
              onClick={() =>
                setConfig((current) => ({ ...current, bypassApprovals: !current.bypassApprovals }))
              }
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                config.bypassApprovals
                  ? 'border-primary bg-primary/10'
                  : 'border-border/70 hover:border-primary/40'
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors',
                  config.bypassApprovals
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted-foreground/40'
                )}
                aria-hidden="true"
              >
                {config.bypassApprovals ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {cli === 'codex' ? 'YOLO mode' : 'Skip permission prompts'}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {cli === 'codex'
                    ? 'Passes --yolo. The agent runs commands without asking and without a sandbox.'
                    : 'Passes --dangerously-skip-permissions. The agent runs tools without asking.'}
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
            {error.message}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLaunching}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onLaunch(config)} disabled={!canLaunch || isLaunching}>
            {isLaunching ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Open session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
