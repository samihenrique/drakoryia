import { queryOptions } from '@tanstack/react-query'
import type { CliKind, CreateTerminalInput } from '../../../../shared/terminals'

export const terminalQueryKey = (workspaceId: string) => ['terminals', workspaceId] as const

export const cliOptionsQueryKey = (cli: CliKind, workspaceId: string) =>
  ['cli-options', cli, workspaceId] as const

export const terminalQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: terminalQueryKey(workspaceId),
    queryFn: () => window.drakoryia.terminals.list(workspaceId),
    // Each snapshot carries the scrollback captured at fetch time, which goes stale
    // the moment the pty writes again. Caching it would replay a session's opening
    // bytes — or nothing at all — when the canvas is re-entered, so always refetch.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always'
  })

export const cliOptionsQueryOptions = (cli: CliKind, workspaceId: string) =>
  queryOptions({
    queryKey: cliOptionsQueryKey(cli, workspaceId),
    queryFn: () => window.drakoryia.terminals.options(cli, workspaceId),
    // The catalog reflects the local CLI install, which can change under us.
    staleTime: 0,
    gcTime: 0
  })

export function createTerminal(input: CreateTerminalInput) {
  return window.drakoryia.terminals.create(input)
}

export function closeTerminal(id: string) {
  return window.drakoryia.terminals.close(id)
}

export function removeTerminal(id: string) {
  return window.drakoryia.terminals.remove(id)
}
