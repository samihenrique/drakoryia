import { useQuery } from '@tanstack/react-query'
import { createRoute } from '@tanstack/react-router'
import { CircleAlert, CircleCheckBig, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { backendHealthQueryOptions } from '../features/system/backend'
import { rootRoute } from './root'

function HomePage(): React.JSX.Element {
  const { data, error, isFetching, refetch } = useQuery(backendHealthQueryOptions)
  const isOnline = data?.status === 'ok'

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-center gap-8 px-6 py-12 sm:px-10">
      <section className="max-w-2xl" aria-labelledby="app-title">
        <p className="mb-3 text-xs font-bold tracking-[0.18em] text-primary">
          LOCAL COMMAND CENTER
        </p>
        <h1 id="app-title" className="text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
          Drakoryia
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          A local-first desktop foundation for coordinating AI coding agents.
        </p>
      </section>

      <Card className="w-full max-w-xl border-border/80 bg-card/85 shadow-2xl backdrop-blur" aria-live="polite">
        <CardHeader>
          <div className="flex items-center gap-3">
            {isOnline ? (
              <CircleCheckBig className="size-5 text-emerald-400" aria-hidden="true" />
            ) : error ? (
              <CircleAlert className="size-5 text-destructive" aria-hidden="true" />
            ) : (
              <LoaderCircle className="size-5 animate-spin text-amber-300" aria-hidden="true" />
            )}
            <div>
              <CardDescription>Local backend</CardDescription>
              <CardTitle className="mt-1 text-xl">
                {isOnline ? 'Connected' : error ? 'Connection failed' : 'Checking connection'}
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {data ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {data.service} responded at {new Date(data.timestamp).toLocaleTimeString()}.
            </p>
          ) : null}

          {error ? <p className="text-sm leading-6 text-destructive">{error.message}</p> : null}

          {!error && isFetching ? (
            <p className="text-sm leading-6 text-muted-foreground">Connecting securely…</p>
          ) : null}
        </CardContent>

        <CardFooter>
          <Button type="button" variant="outline" onClick={() => void refetch()}>
            <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
            Refresh status
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
})
