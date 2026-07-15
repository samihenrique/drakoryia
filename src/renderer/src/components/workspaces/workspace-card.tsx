import { Folder, Settings2 } from 'lucide-react'
import type { Workspace } from '../../../../shared/backend'
import { Button } from '@/components/ui/button'
import { formatAbsoluteTime, formatRelativeTime, splitPathTail } from '@/lib/format'

interface WorkspaceCardProps {
  readonly workspace: Workspace
  readonly onOpen: (workspace: Workspace) => void
  readonly onConfigure: (workspace: Workspace) => void
}

export function WorkspaceCard({
  workspace,
  onOpen,
  onConfigure
}: WorkspaceCardProps): React.JSX.Element {
  const { head, tail } = splitPathTail(workspace.localPath)

  return (
    <article className="group relative flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4 transition-colors focus-within:border-primary/40 hover:border-primary/40 hover:bg-card">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-primary">
          <Folder className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium">
            {/* The overlay pseudo-element makes the whole card open the canvas without
                nesting the settings button inside another button. */}
            <button
              type="button"
              onClick={() => onOpen(workspace)}
              className="block max-w-full truncate text-left after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none"
              title={workspace.name}
            >
              {workspace.name}
            </button>
          </h3>
          <p className="mt-0.5 flex font-mono text-xs text-muted-foreground" title={workspace.localPath}>
            <span className="truncate">{head}</span>
            <span className="max-w-full shrink-0 truncate">{tail}</span>
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative z-10 -mt-1 -mr-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => onConfigure(workspace)}
          aria-label={`Configure ${workspace.name}`}
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </div>

      <p
        className="mt-auto text-xs text-muted-foreground"
        title={formatAbsoluteTime(workspace.updatedAt)}
      >
        Updated {formatRelativeTime(workspace.updatedAt)}
      </p>
    </article>
  )
}
