import { Folder, Settings2 } from 'lucide-react'
import type { Workspace } from '../../../../shared/backend'
import { Button } from '@/components/ui/button'
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format'

interface WorkspaceCardProps {
  readonly workspace: Workspace
  readonly onConfigure: (workspace: Workspace) => void
}

export function WorkspaceCard({ workspace, onConfigure }: WorkspaceCardProps): React.JSX.Element {
  return (
    <article className="group flex flex-col gap-4 rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/40 hover:bg-card">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-primary">
          <Folder className="size-5" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium" title={workspace.name}>
            {workspace.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground" title={workspace.localPath}>
            {workspace.localPath}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => onConfigure(workspace)}
          aria-label={`Configure ${workspace.name}`}
        >
          <Settings2 aria-hidden="true" />
        </Button>
      </div>

      <p className="mt-auto text-xs text-muted-foreground" title={formatAbsoluteTime(workspace.updatedAt)}>
        Updated {formatRelativeTime(workspace.updatedAt)}
      </p>
    </article>
  )
}
