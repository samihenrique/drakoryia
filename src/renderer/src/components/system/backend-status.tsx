import { useQuery } from '@tanstack/react-query'
import { backendHealthQueryOptions } from '@/features/system/backend'
import { cn } from '@/lib/utils'

export function BackendStatus(): React.JSX.Element {
  const healthQuery = useQuery(backendHealthQueryOptions)
  const isOnline = healthQuery.data?.status === 'ok'

  const label = healthQuery.isPending ? 'Connecting' : isOnline ? 'Backend online' : 'Backend offline'

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-xs text-muted-foreground sm:flex"
      role="status"
      title={healthQuery.error?.message ?? label}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          isOnline ? 'bg-emerald-400' : healthQuery.isPending ? 'animate-pulse bg-amber-400' : 'bg-destructive'
        )}
        aria-hidden="true"
      />
      {label}
    </div>
  )
}
