import { useState } from 'react'
import { Archive, ArchiveRestore, Folder, LoaderCircle, Trash2, type LucideIcon } from 'lucide-react'
import type { Workspace } from '../../../../shared/backend'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type WorkspaceAction = 'archive' | 'unarchive' | 'delete'

interface ActionCopy {
  readonly icon: LucideIcon
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly isDestructive: boolean
}

const ACTION_COPY: Record<WorkspaceAction, ActionCopy> = {
  archive: {
    icon: Archive,
    title: 'Archive this workspace?',
    description:
      'It leaves the active list and waits under Archived. The folder on your computer and its saved Drakoryia data stay untouched.',
    confirmLabel: 'Archive workspace',
    isDestructive: false
  },
  unarchive: {
    icon: ArchiveRestore,
    title: 'Restore this workspace?',
    description: 'It returns to the active workspace list, exactly as it was.',
    confirmLabel: 'Restore workspace',
    isDestructive: false
  },
  delete: {
    icon: Trash2,
    title: 'Delete this workspace?',
    description:
      'This permanently removes its Drakoryia record and cannot be undone. The directory on your computer will not be deleted.',
    confirmLabel: 'Delete permanently',
    isDestructive: true
  }
}

interface WorkspaceActionConfirmationProps {
  readonly action: WorkspaceAction | null
  readonly workspace: Workspace | null
  readonly onCancel: () => void
  readonly onCompleted: () => void
  readonly onConfirm: (
    action: WorkspaceAction,
    workspace: Workspace,
    confirmationName: string
  ) => Promise<void>
  readonly isPending: boolean
  readonly error: Error | null
}

export function WorkspaceActionConfirmation({
  action,
  workspace,
  onCancel,
  onCompleted,
  onConfirm,
  isPending,
  error
}: WorkspaceActionConfirmationProps): React.JSX.Element | null {
  const [confirmationName, setConfirmationName] = useState('')

  if (!workspace || !action) {
    return null
  }

  const copy = ACTION_COPY[action]
  const ActionIcon = copy.icon
  const requiresTypedName = action === 'delete'
  const isConfirmed = !requiresTypedName || confirmationName === workspace.name

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!workspace || !action || isPending || !isConfirmed) {
      return
    }

    try {
      await onConfirm(action, workspace, confirmationName)
    } catch {
      // The failure is surfaced through the `error` prop; keep the dialog open.
      return
    }

    onCompleted()
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel()
        }
      }}
    >
      <AlertDialogContent>
        <form onSubmit={(event) => void submit(event)}>
          <AlertDialogHeader>
            <span
              className={cn(
                'mb-1 grid size-11 place-items-center rounded-full',
                copy.isDestructive
                  ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/25'
                  : 'bg-primary/10 text-primary ring-1 ring-primary/25'
              )}
            >
              <ActionIcon className="size-5" aria-hidden="true" />
            </span>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-5 px-6">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-muted-foreground">
                <Folder className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={workspace.name}>
                  {workspace.name}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground" title={workspace.localPath}>
                  {workspace.localPath}
                </p>
              </div>
            </div>
          </div>

          {requiresTypedName ? (
            <div className="mt-4 px-6">
              <label htmlFor="delete-workspace-name" className="text-sm font-medium">
                Type <span className="font-mono">{workspace.name}</span> to confirm
              </label>
              <Input
                id="delete-workspace-name"
                className="mt-2"
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                placeholder={workspace.name}
                autoComplete="off"
                autoFocus
                spellCheck={false}
              />
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 px-6 text-sm text-destructive" role="alert">
              {error.message}
            </p>
          ) : null}

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={copy.isDestructive ? 'destructive' : 'default'}
              disabled={isPending || !isConfirmed}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <ActionIcon aria-hidden="true" />
              )}
              {copy.confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
