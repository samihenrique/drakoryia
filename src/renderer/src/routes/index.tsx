import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { Archive, FolderPlus, Plus, RefreshCw, Search, TriangleAlert } from 'lucide-react'
import { BackendStatus } from '@/components/system/backend-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateWorkspaceDialog } from '@/components/workspaces/create-workspace-dialog'
import { WorkspaceCard } from '@/components/workspaces/workspace-card'
import {
  archivedWorkspaceQueryKey,
  createWorkspace,
  workspaceQueryKey,
  workspaceQueryOptions
} from '@/features/workspaces/api'
import { rootRoute } from './root'

const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] content-start gap-3'

const newWorkspaceShortcut = navigator.userAgent.includes('Mac') ? '⌘N' : 'Ctrl N'

function HomePage(): React.JSX.Element {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const workspacesQuery = useQuery(workspaceQueryOptions)

  async function refreshWorkspaces(): Promise<void> {
    await queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
    await queryClient.invalidateQueries({ queryKey: archivedWorkspaceQueryKey })
  }

  const createMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: async () => {
      await refreshWorkspaces()
    }
  })

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data])
  const workspaceCount = workspaces.length
  const term = search.trim().toLowerCase()

  const visibleWorkspaces = useMemo(() => {
    if (!term) {
      return workspaces
    }

    return workspaces.filter(
      (workspace) =>
        workspace.name.toLowerCase().includes(term) || workspace.localPath.toLowerCase().includes(term)
    )
  }, [workspaces, term])

  const isDialogOpen = createOpen

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isDialogOpen) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setCreateOpen(true)
        return
      }

      const target = event.target
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDialogOpen])

  const showSearch = !workspacesQuery.isPending && !workspacesQuery.isError && workspaceCount > 0

  return (
    <main className="grid h-screen grid-rows-[auto_1fr] overflow-hidden">
      <header className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-3 sm:px-8">
        <div className="flex items-center gap-2.5">
          <img
            src="/drakoryia-mark.png"
            alt=""
            className="size-8 object-contain drop-shadow-[0_0_0.75rem_rgba(34,211,238,0.25)]"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Drakoryia</p>
            <p className="text-[0.7rem] text-muted-foreground">Local command center</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BackendStatus />
          <Button type="button" variant="ghost" onClick={() => void navigate({ to: '/workspaces/archived' })}>
            <Archive aria-hidden="true" />
            Archived
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" />
            Add workspace
            <kbd className="ml-1 hidden rounded border border-primary-foreground/25 bg-primary-foreground/10 px-1 font-sans text-[0.65rem] text-primary-foreground/75 sm:inline">
              {newWorkspaceShortcut}
            </kbd>
          </Button>
        </div>
      </header>

      <section className="grid min-h-0 grid-rows-[auto_1fr]" aria-labelledby="workspace-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6 pb-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <h1 id="workspace-title" className="text-base font-semibold tracking-tight">
              Workspaces
            </h1>
            {workspaceCount > 0 ? (
              <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                {workspaceCount}
              </span>
            ) : null}
          </div>

          {showSearch ? (
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setSearch('')
                  }
                }}
                placeholder="Search workspaces"
                aria-label="Search workspaces"
                className="h-8 pl-8"
              />
            </div>
          ) : null}
        </div>

        <div className="grid min-h-0 overflow-y-auto px-6 pb-6 sm:px-8">
          {workspacesQuery.isPending ? (
            <div className={CARD_GRID} aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <div
                  key={index}
                  className="h-[6.5rem] animate-pulse rounded-xl border border-border/60 bg-card/40"
                />
              ))}
            </div>
          ) : null}

          {workspacesQuery.isError ? (
            <div className="grid place-items-center">
              <div className="max-w-md rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
                <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl border border-destructive/40 text-destructive">
                  <TriangleAlert className="size-5" aria-hidden="true" />
                </div>
                <h2 className="font-semibold">Could not load workspaces</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{workspacesQuery.error.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                  onClick={() => void workspacesQuery.refetch()}
                  disabled={workspacesQuery.isFetching}
                >
                  <RefreshCw
                    className={workspacesQuery.isFetching ? 'animate-spin' : undefined}
                    aria-hidden="true"
                  />
                  Try again
                </Button>
              </div>
            </div>
          ) : null}

          {!workspacesQuery.isPending && !workspacesQuery.isError && workspaceCount === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-border/70 bg-card/25 p-8 text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl border border-border bg-muted text-primary">
                  <FolderPlus className="size-6" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Bring a local project into view</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Point Drakoryia at any directory on this computer. It stays exactly where it is — Drakoryia
                  never takes ownership of the folder.
                </p>
                <Button type="button" className="mt-6" onClick={() => setCreateOpen(true)}>
                  <FolderPlus aria-hidden="true" />
                  Choose a folder
                </Button>
              </div>
            </div>
          ) : null}

          {showSearch && visibleWorkspaces.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-border/70 p-8 text-center">
              <div>
                <p className="text-sm text-muted-foreground">No workspace matches “{search.trim()}”.</p>
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              </div>
            </div>
          ) : null}

          {!workspacesQuery.isPending && !workspacesQuery.isError && visibleWorkspaces.length > 0 ? (
            <div className={CARD_GRID}>
              {visibleWorkspaces.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  onOpen={(selectedWorkspace) => {
                    void navigate({
                      to: '/workspaces/$workspaceId/canvas',
                      params: { workspaceId: selectedWorkspace.id }
                    })
                  }}
                  onConfigure={(selectedWorkspace) => {
                    void navigate({
                      to: '/workspaces/$workspaceId/settings',
                      params: { workspaceId: selectedWorkspace.id }
                    })
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (input) => {
          await createMutation.mutateAsync(input)
        }}
        isCreating={createMutation.isPending}
        error={createMutation.error}
      />

    </main>
  )
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})
