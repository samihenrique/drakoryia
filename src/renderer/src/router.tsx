import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { archivedWorkspacesRoute } from './routes/archived-workspaces'
import { indexRoute } from './routes/index'
import { rootRoute } from './routes/root'
import { workspaceSettingsRoute } from './routes/workspace-settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

const routeTree = rootRoute.addChildren([indexRoute, archivedWorkspacesRoute, workspaceSettingsRoute])

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreloadStaleTime: 0,
  Wrap: ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRouter(): React.JSX.Element {
  return <RouterProvider router={router} />
}
