import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { Archive, ArchiveRestore, Folder, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { Workspace } from '../../../shared/backend'
import { BackHeader } from '@/components/layout/back-header'
import { Button } from '@/components/ui/button'
import { WorkspaceActionConfirmation } from '@/components/workspaces/workspace-action-confirmation'
import {
  archivedWorkspaceQueryKey,
  archivedWorkspaceQueryOptions,
  unarchiveWorkspace,
  workspaceQueryKey
} from '@/features/workspaces/api'
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format'
import { rootRoute } from './root'

function ArchivedWorkspaceRow({
  workspace,
  onRequestRestore
}: {
  readonly workspace: Workspace
  readonly onRequestRestore: (workspace: Workspace) => void
}): React.JSX.Element {
  return (
    <li className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
        <Folder className="size-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium" title={workspace.name}>
          {workspace.name}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={workspace.localPath}>
          {workspace.localPath}
        </p>
      </div>

      {workspace.archivedAt ? (
        <p
          className="hidden shrink-0 text-xs text-muted-foreground sm:block"
          title={formatAbsoluteTime(workspace.archivedAt)}
        >
          Archived {formatRelativeTime(workspace.archivedAt)}
        </p>
      ) : null}

      <Button type="button" variant="outline" onClick={() => onRequestRestore(workspace)}>
        <ArchiveRestore aria-hidden="true" />
        Restore
      </Button>
    </li>
  )
}

function ArchivedWorkspacesRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [pendingRestore, setPendingRestore] = useState<Workspace | null>(null)
  const archivedQuery = useQuery(archivedWorkspaceQueryOptions)

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveWorkspace,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
      await queryClient.invalidateQueries({ queryKey: archivedWorkspaceQueryKey })
    }
  })

  function goBack(): void {
    void navigate({ to: '/' })
  }

  const workspaces = archivedQuery.data ?? []

  return (
    <main className="min-h-screen overflow-x-hidden">
      <BackHeader onBack={goBack}>
        <h1 className="truncate text-sm font-medium">Archived workspaces</h1>
        {workspaces.length > 0 ? (
          <p className="truncate text-[0.68rem] text-muted-foreground tabular-nums">
            {workspaces.length} archived
          </p>
        ) : null}
      </BackHeader>

      <div className="w-full px-6 py-8 sm:px-8">
        <section
          className="motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:duration-200"
          aria-label="Archived workspaces"
        >
          {archivedQuery.isPending ? (
            <div className="grid min-h-52 place-items-center text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Loading archived workspaces</span>
            </div>
          ) : null}

          {archivedQuery.isError ? (
            <div className="grid min-h-52 place-items-center">
              <div className="max-w-md text-center">
                <div className="mx-auto grid size-11 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">Could not load archived workspaces</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{archivedQuery.error.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6"
                  onClick={() => void archivedQuery.refetch()}
                  disabled={archivedQuery.isFetching}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {!archivedQuery.isPending && !archivedQuery.isError && workspaces.length === 0 ? (
            <div className="grid min-h-52 place-items-center rounded-md border border-dashed border-border/70 p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl border border-border bg-muted text-muted-foreground">
                  <Archive className="size-6" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Nothing archived</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Workspaces you archive are parked here, ready to come back whenever you need them.
                </p>
                <Button type="button" variant="outline" className="mt-6" onClick={goBack}>
                  Back to workspaces
                </Button>
              </div>
            </div>
          ) : null}

          {!archivedQuery.isPending && !archivedQuery.isError && workspaces.length > 0 ? (
            <ul className="overflow-hidden rounded-md border border-border">
              {workspaces.map((workspace) => (
                <ArchivedWorkspaceRow
                  key={workspace.id}
                  workspace={workspace}
                  onRequestRestore={(selected) => {
                    unarchiveMutation.reset()
                    setPendingRestore(selected)
                  }}
                />
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <WorkspaceActionConfirmation
        key={pendingRestore ? `unarchive-${pendingRestore.id}` : 'workspace-action-closed'}
        action={pendingRestore ? 'unarchive' : null}
        workspace={pendingRestore}
        onCancel={() => {
          unarchiveMutation.reset()
          setPendingRestore(null)
        }}
        onCompleted={() => {
          setPendingRestore(null)
        }}
        onConfirm={async (_action, workspace) => {
          await unarchiveMutation.mutateAsync(workspace.id)
        }}
        isPending={unarchiveMutation.isPending}
        error={unarchiveMutation.error}
      />
    </main>
  )
}

export const archivedWorkspacesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/archived',
  component: ArchivedWorkspacesRoute
})
