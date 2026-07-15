import { useEffect, useRef } from 'react'
import { Bot, TerminalSquare } from 'lucide-react'
import type { CanvasPosition, CliKind } from '../../../../shared/terminals'

export interface CanvasMenuState {
  /** Wrapper-relative pixels, used to place the menu itself. */
  readonly x: number
  readonly y: number
  /** Canvas coordinates, used to place the node the menu creates. */
  readonly flowPosition: CanvasPosition
}

export const MENU_WIDTH = 210
export const MENU_HEIGHT = 130

interface CanvasContextMenuProps {
  readonly menu: CanvasMenuState
  readonly onSelect: (cli: CliKind, position: CanvasPosition) => void
  readonly onClose: () => void
}

export function CanvasContextMenu({
  menu,
  onSelect,
  onClose
}: CanvasContextMenuProps): React.JSX.Element {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (!container.current?.contains(event.target as globalThis.Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    container.current?.focus()
  }, [])

  const items: Array<{ cli: CliKind; label: string; Icon: typeof Bot }> = [
    { cli: 'codex', label: 'Open Codex', Icon: TerminalSquare },
    { cli: 'claude', label: 'Open Claude', Icon: Bot }
  ]

  return (
    <div
      ref={container}
      role="menu"
      tabIndex={-1}
      aria-label="Canvas actions"
      style={{ left: menu.x, top: menu.y, width: MENU_WIDTH }}
      className="absolute z-20 rounded-xl border border-border/70 bg-card/95 p-1 shadow-2xl outline-none backdrop-blur"
      onContextMenu={(event) => event.preventDefault()}
    >
      <p className="px-2 py-1.5 text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
        New agent here
      </p>

      {items.map(({ cli, label, Icon }) => (
        <button
          key={cli}
          type="button"
          role="menuitem"
          onClick={() => onSelect(cli, menu.flowPosition)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:bg-primary/10 focus-visible:outline-none"
        >
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}
