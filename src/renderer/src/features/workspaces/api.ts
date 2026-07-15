import { queryOptions } from '@tanstack/react-query'
import type { CreateWorkspaceInput, DeleteWorkspaceInput } from '../../../../shared/backend'

export const workspaceQueryKey = ['workspaces'] as const
export const archivedWorkspaceQueryKey = ['workspaces', 'archived'] as const

export const workspaceQueryOptions = queryOptions({
  queryKey: workspaceQueryKey,
  queryFn: () => window.drakoryia.workspaces.list()
})

export const archivedWorkspaceQueryOptions = queryOptions({
  queryKey: archivedWorkspaceQueryKey,
  queryFn: () => window.drakoryia.workspaces.listArchived()
})

export function createWorkspace(input: CreateWorkspaceInput) {
  return window.drakoryia.workspaces.create(input)
}

export function archiveWorkspace(id: string) {
  return window.drakoryia.workspaces.archive(id)
}

export function unarchiveWorkspace(id: string) {
  return window.drakoryia.workspaces.unarchive(id)
}

export function deleteWorkspace(id: string, input: DeleteWorkspaceInput) {
  return window.drakoryia.workspaces.delete(id, input)
}
