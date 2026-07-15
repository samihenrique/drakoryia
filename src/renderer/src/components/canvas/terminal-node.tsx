import { memo, useEffect, useRef } from 'react'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { NodeResizer } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import { Bot, TerminalSquare, X } from 'lucide-react'
import { CLI_LABELS, MIN_TERMINAL_HEIGHT, MIN_TERMINAL_WIDTH } from '../../../../shared/terminals'
import type { TerminalSnapshot } from '../../../../shared/terminals'
import { cn } from '@/lib/utils'

export type TerminalNodeData = TerminalSnapshot & {
  readonly onRequestClose: (id: string) => void
} & Record<string, unknown>

export type TerminalFlowNode = Node<TerminalNodeData, 'terminal'>

const TERMINAL_THEME = {
  background: '#12121a',
  foreground: '#e7e5e4',
  cursor: '#f4f4f5',
  selectionBackground: '#7c5cfc66',
  black: '#27272a',
  brightBlack: '#71717a',
  red: '#fb7185',
  green: '#86efac',
  yellow: '#fde047',
  blue: '#93c5fd',
  magenta: '#c4b5fd',
  cyan: '#67e8f9',
  white: '#f4f4f5'
}

function TerminalNodeComponent({ data, selected }: NodeProps<TerminalFlowNode>): React.JSX.Element {
  const viewport = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = viewport.current

    if (!element) {
      return
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.22,
      scrollback: 5_000,
      theme: TERMINAL_THEME
    })

    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(element)
    terminal.write(data.history)

    // Plain wheel belongs to the canvas zoom; Shift + wheel scrolls the scrollback.
    terminal.attachCustomWheelEventHandler((event) => event.shiftKey)

    const fitTerminal = (): void => {
      try {
        fit.fit()
        window.drakoryia.terminals.resize(data.id, terminal.cols, terminal.rows)
      } catch {
        // The card can be transiently invisible while the canvas animates.
      }
    }

    const resizeObserver = new ResizeObserver(fitTerminal)
    resizeObserver.observe(element)
    const frame = requestAnimationFrame(fitTerminal)

    const input = terminal.onData((chunk) => {
      window.drakoryia.terminals.write(data.id, chunk)
    })

    const stopOutput = window.drakoryia.terminals.onOutput((event) => {
      if (event.id === data.id) {
        terminal.write(event.data)
      }
    })

    const stopExit = window.drakoryia.terminals.onExit((event) => {
      if (event.id === data.id) {
        terminal.write(`\r\n\u001b[90m[process exited — code ${event.exitCode}]\u001b[0m\r\n`)
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      input.dispose()
      resizeObserver.disconnect()
      stopOutput()
      stopExit()
      terminal.dispose()
    }
    // data.history is the scrollback captured before this node mounted. It is
    // replayed once per session; live output arrives through onOutput, so
    // re-running on every history change would duplicate the buffer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id])

  const label = CLI_LABELS[data.cli]
  const AgentIcon = data.cli === 'codex' ? TerminalSquare : Bot
  const isRunning = data.status === 'running'

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-xl transition-opacity',
        !isRunning && 'opacity-70'
      )}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_TERMINAL_WIDTH}
        minHeight={MIN_TERMINAL_HEIGHT}
        lineClassName="border-primary"
        handleClassName="size-2.5 rounded-sm border border-primary bg-primary"
      />

      <header
        className="window-drag flex cursor-grab items-center gap-2.5 border-b border-border/70 bg-muted/40 px-3 py-2 active:cursor-grabbing"
        title="Shift + scroll to move through the terminal history"
      >
        <div className="grid size-6 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
          <AgentIcon className="size-3.5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-xs font-semibold">{label}</p>
          <p className="truncate font-mono text-[0.65rem] text-muted-foreground" title={data.cwd}>
            {data.cwd}
          </p>
        </div>

        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            isRunning ? 'bg-emerald-400' : 'bg-muted-foreground/50'
          )}
          title={isRunning ? 'Running' : 'Exited'}
          aria-hidden="true"
        />

        <button
          type="button"
          className="nodrag grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
          onClick={() => data.onRequestClose(data.id)}
          aria-label={isRunning ? `End ${label} session` : `Remove ${label} from canvas`}
          title={isRunning ? 'End session' : 'Remove from canvas'}
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </header>

      <div
        className="nodrag min-h-0 flex-1 bg-[#12121a] px-2 py-1.5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* FitAddon derives cols/rows from this element's computed width, which
            under border-box would swallow any padding set here. Keep it bare. */}
        <div ref={viewport} className="size-full" />
      </div>
    </article>
  )
}

export const TerminalNode = memo(TerminalNodeComponent)
