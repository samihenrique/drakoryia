import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import { ChevronLeft, LoaderCircle, TriangleAlert } from 'lucide-react'
import type { Workspace } from '../../../shared/backend'
import { WorkspaceActionConfirmation, type WorkspaceAction } from '@/components/workspaces/workspace-action-confirmation'
import { WorkspaceSettingsPage } from '@/components/workspaces/workspace-settings-page'
import { Button } from '@/components/ui/button'
import {
  archivedWorkspaceQueryKey,
  archiveWorkspace,
  deleteWorkspace,
  workspaceQueryKey,
  workspaceQueryOptions
} from '@/features/workspaces/api'
import { rootRoute } from './root'

type SettingsAction = Extract<WorkspaceAction, 'archive' | 'delete'>

function SettingsHeader({
  workspace,
  onBack
}: {
  readonly workspace?: Workspace
  readonly onBack: () => void
}): React.JSX.Element {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border/70 bg-background/85 px-5 backdrop-blur sm:px-8">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3 h-10 rounded-full px-3 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={onBack}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        Workspaces
      </Button>

      {workspace ? (
        <div className="pointer-events-none absolute inset-x-20 min-w-0 text-center sm:inset-x-52">
          <p className="truncate text-sm font-medium" title={workspace.name}>
            {workspace.name}
          </p>
          <p className="truncate font-mono text-[0.68rem] text-muted-foreground" title={workspace.localPath}>
            {workspace.localPath}
          </p>
        </div>
      ) : null}
    </header>
  )
}

function WorkspaceSettingsRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { workspaceId } = useParams({ from: workspaceSettingsRoute.id })
  const [action, setAction] = useState<SettingsAction | null>(null)
  const workspacesQuery = useQuery(workspaceQueryOptions)
  const workspace = workspacesQuery.data?.find((candidate) => candidate.id === workspaceId)

  async function refreshWorkspaces(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
    await queryClient.invalidateQueries({ queryKey: archivedWorkspaceQueryKey })
  }

  const archiveMutation = useMutation({
    mutationFn: archiveWorkspace,
    onSuccess: refreshWorkspaces
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, confirmationName }: { id: string; confirmationName: string }) =>
      deleteWorkspace(id, { confirmationName }),
    onSuccess: refreshWorkspaces
  })

  function goBack(): void {
    void navigate({ to: '/' })
  }

  const error = action === 'archive' ? archiveMutation.error : deleteMutation.error
  const isPending = action === 'archive' ? archiveMutation.isPending : deleteMutation.isPending

  if (workspacesQuery.isPending) {
    return (
      <main className="min-h-screen">
        <SettingsHeader onBack={goBack} />
        <div className="grid min-h-[calc(100vh-4.25rem)] place-items-center text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading workspace settings</span>
        </div>
      </main>
    )
  }

  if (workspacesQuery.isError || !workspace) {
    return (
      <main className="min-h-screen">
        <SettingsHeader onBack={goBack} />
        <div className="grid min-h-[calc(100vh-4.25rem)] place-items-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-semibold">Workspace unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {workspacesQuery.isError
                ? workspacesQuery.error.message
                : 'This workspace may have been archived or deleted.'}
            </p>
            <Button type="button" variant="outline" className="mt-6" onClick={goBack}>
              Return to workspaces
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden">
      <SettingsHeader workspace={workspace} onBack={goBack} />
      <div className="w-full px-6 py-8 sm:px-8">
        <h1 className="mb-7 text-2xl font-semibold tracking-tight">Settings</h1>

        <WorkspaceSettingsPage
          workspace={workspace}
          onRequestArchive={() => {
            archiveMutation.reset()
            deleteMutation.reset()
            setAction('archive')
          }}
          onRequestDelete={() => {
            archiveMutation.reset()
            deleteMutation.reset()
            setAction('delete')
          }}
        />
      </div>

      <WorkspaceActionConfirmation
        key={action ? `${action}-${workspace.id}` : 'workspace-action-closed'}
        action={action}
        workspace={workspace}
        onCancel={() => {
          archiveMutation.reset()
          deleteMutation.reset()
          setAction(null)
        }}
        onCompleted={() => {
          setAction(null)
          void navigate({ to: '/' })
        }}
        onConfirm={async (requestedAction, selectedWorkspace, confirmationName) => {
          if (requestedAction === 'archive') {
            await archiveMutation.mutateAsync(selectedWorkspace.id)
            return
          }

          if (requestedAction === 'delete') {
            await deleteMutation.mutateAsync({ id: selectedWorkspace.id, confirmationName })
            return
          }

          throw new Error('Unsupported workspace action.')
        }}
        isPending={isPending}
        error={error}
      />
    </main>
  )
}

export const workspaceSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/settings',
  component: WorkspaceSettingsRoute
})
