import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackHeaderProps {
  readonly onBack: () => void
  readonly label?: string
}

export function BackHeader({ onBack, label = 'Workspaces' }: BackHeaderProps): React.JSX.Element {
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
        {label}
      </Button>
    </header>
  )
}
