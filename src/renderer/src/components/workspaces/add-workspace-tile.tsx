import { Plus } from 'lucide-react'

interface AddWorkspaceTileProps {
  readonly onClick: () => void
}

export function AddWorkspaceTile({ onClick }: AddWorkspaceTileProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-[6.5rem] place-items-center rounded-xl border border-dashed border-border/70 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card/40 hover:text-foreground focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
    >
      <span className="flex flex-col items-center gap-1.5">
        <Plus className="size-5" aria-hidden="true" />
        <span className="text-sm font-medium">Add workspace</span>
      </span>
    </button>
  )
}
