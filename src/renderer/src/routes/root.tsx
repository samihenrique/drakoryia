import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import type { RouterContext } from '../router-context'

function RootLayout(): React.JSX.Element {
  return <Outlet />
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout
})
