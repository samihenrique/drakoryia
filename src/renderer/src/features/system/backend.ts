import { queryOptions } from '@tanstack/react-query'

export const backendHealthQueryOptions = queryOptions({
  queryKey: ['backend', 'health'] as const,
  queryFn: () => window.drakoryia.getHealth(),
  staleTime: 30_000
})
