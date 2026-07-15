import type { Workspace } from '../../../../shared/backend'
import { Archive, Trash2 } from 'lucide-react'

interface WorkspaceSettingsPageProps {
  readonly workspace: Workspace
  readonly onRequestArchive: () => void
  readonly onRequestDelete: () => void
}

export function WorkspaceSettingsPage({
  workspace,
  onRequestArchive,
  onRequestDelete
}: WorkspaceSettingsPageProps): React.JSX.Element {
  return (
    <section className="grid gap-8 motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200 md:grid-cols-[11rem_minmax(0,1fr)]">
      <nav className="h-fit border-b border-border pb-4 md:border-r md:border-b-0 md:pr-5 md:pb-0" aria-label="Settings navigation">
        <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">SETTINGS</p>
        <span className="block rounded-md bg-muted px-3 py-2 text-sm font-medium">General</span>
      </nav>

      <div className="min-w-0">
        <header className="border-b border-border pb-5">
          <h1 className="text-xl font-semibold">General</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage this workspace’s local Drakoryia record.</p>
        </header>

        <section className="py-6" aria-labelledby="workspace-details-title">
          <h2 id="workspace-details-title" className="text-sm font-semibold">
            Workspace details
          </h2>
          <dl className="mt-3 overflow-hidden rounded-md border border-border text-sm">
            <div className="grid gap-1 border-b border-border px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="min-w-0 truncate font-medium" title={workspace.name}>
                {workspace.name}
              </dd>
            </div>
            <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-muted-foreground">Local directory</dt>
              <dd className="min-w-0 break-all font-mono text-xs leading-5 text-muted-foreground">
                {workspace.localPath}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-t border-border py-6" aria-labelledby="archive-workspace-title">
          <h2 id="archive-workspace-title" className="text-sm font-semibold">
            Archive workspace
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Hide this workspace from the active list. You can restore it later, and its local folder will not change.
          </p>
          <button
            type="button"
            className="mt-4 inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            onClick={onRequestArchive}
          >
            <Archive className="size-4" aria-hidden="true" />
            Archive workspace
          </button>
        </section>

        <section className="rounded-md border border-destructive/55" aria-labelledby="danger-zone-title">
          <div className="border-b border-destructive/40 bg-destructive/5 px-4 py-3">
            <h2 id="danger-zone-title" className="text-sm font-semibold text-destructive">
              Danger Zone
            </h2>
          </div>
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium">Delete this workspace</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Permanently remove its Drakoryia record. The directory on your computer will not be deleted.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
              onClick={onRequestDelete}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Delete workspace
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}
