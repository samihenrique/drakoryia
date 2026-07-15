import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createHashHistory, createRouter } from '@tanstack/react-router'
import { archivedWorkspacesRoute } from './routes/archived-workspaces'
import { indexRoute } from './routes/index'
import { rootRoute } from './routes/root'
import { workspaceCanvasRoute } from './routes/workspace-canvas'
import { workspaceSettingsRoute } from './routes/workspace-settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  archivedWorkspacesRoute,
  workspaceCanvasRoute,
  workspaceSettingsRoute
])

// The packaged app is served from file://, where the pathname is the absolute path
// of index.html and matches no route. The route therefore lives in the hash, which
// is identical under file:// and the dev server.
const history = createHashHistory()

export const router = createRouter({
  routeTree,
  history,
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
