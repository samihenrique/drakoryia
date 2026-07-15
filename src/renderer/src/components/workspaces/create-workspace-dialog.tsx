import { useState } from 'react'
import { FolderOpen, LoaderCircle } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  MAX_WORKSPACE_NAME_LENGTH,
  MAX_WORKSPACE_PATH_LENGTH
} from '../../../../shared/workspace-limits'

interface CreateWorkspaceDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreate: (input: { name: string; localPath: string }) => Promise<void>
  readonly isCreating: boolean
  readonly error: Error | null
}

function suggestedName(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean)
  return segments.at(-1) ?? ''
}

function counterTone(value: number, limit: number): string {
  const ratio = value / limit

  if (ratio >= 0.9) {
    return 'text-red-400'
  }

  if (ratio >= 0.7) {
    return 'text-amber-300'
  }

  return 'text-emerald-400'
}

function CharacterCounter({ value, limit }: { readonly value: string; readonly limit: number }): React.JSX.Element {
  const atLimit = value.length >= limit

  return (
    <span className={`text-xs tabular-nums ${counterTone(value.length, limit)}`} aria-live="polite">
      {value.length.toLocaleString()} / {limit.toLocaleString()}
      {atLimit ? ' — limit reached' : null}
    </span>
  )
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  error
}: CreateWorkspaceDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [localPath, setLocalPath] = useState('')

  function resetForm(): void {
    setName('')
    setLocalPath('')
  }

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  async function selectDirectory(): Promise<void> {
    const path = await window.drakoryia.workspaces.selectDirectory()

    if (!path) {
      return
    }

    setLocalPath(path)
    setName((currentName) => currentName || suggestedName(path))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    await onCreate({ name, localPath })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogDismiss />
        <DialogHeader>
          <DialogTitle>Add a workspace</DialogTitle>
          <DialogDescription>
            Choose a local directory and the name Drakoryia will use to identify it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)}>
          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-medium" htmlFor="workspace-name">
              <span className="flex items-center justify-between gap-3">
                <span>Workspace name</span>
                <CharacterCounter value={name} limit={MAX_WORKSPACE_NAME_LENGTH} />
              </span>
              <Input
                id="workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My project"
                autoFocus
                maxLength={MAX_WORKSPACE_NAME_LENGTH}
                required
              />
            </label>

            <div className="grid gap-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>Local directory</span>
                <CharacterCounter value={localPath} limit={MAX_WORKSPACE_PATH_LENGTH} />
              </span>
              <div className="flex gap-2">
                <Input
                  id="workspace-path"
                  value={localPath}
                  placeholder="Choose a folder"
                  readOnly
                  maxLength={MAX_WORKSPACE_PATH_LENGTH}
                  required
                />
                <Button type="button" variant="outline" onClick={() => void selectDirectory()}>
                  <FolderOpen aria-hidden="true" />
                  Choose
                </Button>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isCreating ||
                !name.trim() ||
                !localPath ||
                name.length > MAX_WORKSPACE_NAME_LENGTH ||
                localPath.length > MAX_WORKSPACE_PATH_LENGTH
              }
            >
              {isCreating ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              Add workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
