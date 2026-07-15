import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRoute, useNavigate, useParams } from '@tanstack/react-router'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useReactFlow
} from '@xyflow/react'
import { Layers3, LoaderCircle, MousePointer2, Sparkles, TriangleAlert } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import '@xterm/xterm/css/xterm.css'
import {
  CLI_LABELS,
  DEFAULT_TERMINAL_HEIGHT,
  DEFAULT_TERMINAL_WIDTH
} from '../../../shared/terminals'
import type { CanvasPosition, CliKind, TerminalSnapshot } from '../../../shared/terminals'
import { BackHeader } from '@/components/layout/back-header'
import {
  CanvasContextMenu,
  MENU_HEIGHT,
  MENU_WIDTH,
  type CanvasMenuState
} from '@/components/canvas/canvas-context-menu'
import { LaunchSessionDialog, type LaunchConfig } from '@/components/canvas/launch-session-dialog'
import { terminalNodeTypes } from '@/components/canvas/node-types'
import type { TerminalFlowNode } from '@/components/canvas/terminal-node'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  closeTerminal,
  createTerminal,
  removeTerminal,
  terminalQueryOptions
} from '@/features/terminals/api'
import { workspaceQueryOptions } from '@/features/workspaces/api'
import { cn } from '@/lib/utils'
import { rootRoute } from './root'

const GEOMETRY_SAVE_DELAY_MS = 500

type InteractionMode = 'cursor' | 'selection'

function nodeSize(node: TerminalFlowNode): { width: number; height: number } {
  const style = node.style as { width?: number | string; height?: number | string } | undefined

  return {
    width: node.measured?.width ?? (style?.width === undefined ? DEFAULT_TERMINAL_WIDTH : Number(style.width)),
    height:
      node.measured?.height ??
      (style?.height === undefined ? DEFAULT_TERMINAL_HEIGHT : Number(style.height))
  }
}

function WorkspaceCanvas({ workspaceId }: { readonly workspaceId: string }): React.JSX.Element {
  const queryClient = useQueryClient()
  const { screenToFlowPosition } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState<TerminalFlowNode>([])
  const [menu, setMenu] = useState<CanvasMenuState | null>(null)
  const [launchCli, setLaunchCli] = useState<CliKind | null>(null)
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('cursor')
  const [selectedCount, setSelectedCount] = useState(0)
  const [closeCandidate, setCloseCandidate] = useState<string | null>(null)
  const wrapper = useRef<HTMLDivElement>(null)
  const launchPosition = useRef<CanvasPosition>({ x: 0, y: 0 })
  const nodesRef = useRef<TerminalFlowNode[]>([])
  const hydrated = useRef(false)

  const terminalsQuery = useQuery(terminalQueryOptions(workspaceId))

  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  const removeNode = useCallback(
    (id: string) => {
      setNodes((current) => current.filter((node) => node.id !== id))
      void removeTerminal(id)
    },
    [setNodes]
  )

  const requestClose = useCallback(
    (id: string) => {
      const node = nodesRef.current.find((candidate) => candidate.id === id)

      if (node?.data.status === 'running') {
        setCloseCandidate(id)
        return
      }

      removeNode(id)
    },
    [removeNode]
  )

  const toNode = useCallback(
    (terminal: TerminalSnapshot): TerminalFlowNode => ({
      id: terminal.id,
      type: 'terminal',
      position: terminal.geometry.position,
      style: { width: terminal.geometry.width, height: terminal.geometry.height },
      dragHandle: '.window-drag',
      data: { ...terminal, onRequestClose: requestClose } as TerminalFlowNode['data']
    }),
    [requestClose]
  )

  // Sessions outlive the route, so re-entering the canvas rebuilds the nodes from
  // whatever the main process still has running.
  useEffect(() => {
    if (!terminalsQuery.data || hydrated.current) {
      return
    }

    hydrated.current = true
    setNodes(terminalsQuery.data.map((terminal) => toNode(terminal)))
  }, [terminalsQuery.data, toNode, setNodes])

  useEffect(() => {
    return window.drakoryia.terminals.onExit((event) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === event.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'closed',
                  exitCode: event.exitCode,
                  signal: event.signal
                }
              }
            : node
        )
      )
    })
  }, [setNodes])

  // Geometry lives in the main process next to the session, so positions survive
  // leaving and re-entering the canvas.
  useEffect(() => {
    if (!hydrated.current) {
      return
    }

    const timer = window.setTimeout(() => {
      for (const node of nodesRef.current) {
        const { width, height } = nodeSize(node)
        window.drakoryia.terminals.saveGeometry(node.id, { position: node.position, width, height })
      }
    }, GEOMETRY_SAVE_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [nodes])

  const launchMutation = useMutation({
    mutationFn: (config: LaunchConfig) =>
      createTerminal({
        cli: launchCli as CliKind,
        workspaceId,
        position: launchPosition.current,
        model: config.model || undefined,
        reasoningLevel: config.reasoningLevel || undefined,
        fast: config.fast,
        bypassApprovals: config.bypassApprovals
      }),
    onSuccess: (terminal) => {
      setNodes((current) => [...current, toNode(terminal)])
      setLaunchCli(null)
      void queryClient.invalidateQueries({ queryKey: terminalQueryOptions(workspaceId).queryKey })
    }
  })

  function isCanvasSurface(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) {
      return false
    }

    return !target.closest('.react-flow__node, .react-flow__controls, .canvas-toolbar, .canvas-context-menu')
  }

  function showMenu(clientX: number, clientY: number): void {
    const bounds = wrapper.current?.getBoundingClientRect()
    const relativeX = clientX - (bounds?.left ?? 0)
    const relativeY = clientY - (bounds?.top ?? 0)

    setMenu({
      x: Math.max(10, Math.min(relativeX, (bounds?.width ?? relativeX) - MENU_WIDTH)),
      y: Math.max(10, Math.min(relativeY, (bounds?.height ?? relativeY) - MENU_HEIGHT)),
      flowPosition: screenToFlowPosition({ x: clientX, y: clientY })
    })
  }

  function openMenu(event: ReactMouseEvent<Element> | MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()

    showMenu(event.clientX, event.clientY)
  }

  function openMenuOnPointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (event.button !== 2 || !isCanvasSurface(event.target)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    showMenu(event.clientX, event.clientY)
  }

  const nodeTypes = useMemo(() => terminalNodeTypes, [])
  const closingNode = closeCandidate
    ? nodes.find((node) => node.id === closeCandidate)
    : undefined

  return (
    <>
      <div
        ref={wrapper}
        className="relative min-h-0 overflow-hidden"
        onPointerDownCapture={openMenuOnPointerDown}
      >
        <ReactFlow
          nodes={nodes}
          edges={[]}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.25}
          maxZoom={1.5}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          selectionOnDrag={interactionMode === 'selection'}
          selectionMode={SelectionMode.Partial}
          panOnDrag={interactionMode === 'selection' ? false : [1]}
          onSelectionChange={({ nodes: selected }) => setSelectedCount(selected.length)}
          onPaneClick={(event) => {
            if (event.button === 0) {
              setMenu(null)
            }
          }}
          onPaneContextMenu={openMenu}
          onNodeContextMenu={(event) => {
            event.preventDefault()
            setMenu(null)
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} className="opacity-60" />
          <Controls showInteractive={false} />
        </ReactFlow>

        {terminalsQuery.isPending ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}

        {!terminalsQuery.isPending && nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl border border-border bg-muted text-primary">
                <Sparkles className="size-6" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight">This canvas is ready.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Right-click anywhere to open Codex or Claude in this workspace.
              </p>
            </div>
          </div>
        ) : null}

        {menu ? (
          <CanvasContextMenu
            menu={menu}
            onClose={() => setMenu(null)}
            onSelect={(cli, position) => {
              launchPosition.current = position
              setMenu(null)
              launchMutation.reset()
              setLaunchCli(cli)
            }}
          />
        ) : null}

        <div
          className="canvas-toolbar absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-card/90 p-1 shadow-xl backdrop-blur"
          role="toolbar"
          aria-label="Canvas tools"
        >
          {(
            [
              { mode: 'cursor', label: 'Cursor', Icon: MousePointer2, hint: 'Pan and move sessions' },
              {
                mode: 'selection',
                label: 'Select',
                Icon: Layers3,
                hint: 'Drag on empty space to select'
              }
            ] as const
          ).map(({ mode, label, Icon, hint }) => (
            <button
              key={mode}
              type="button"
              title={hint}
              aria-pressed={interactionMode === mode}
              onClick={() => setInteractionMode(mode)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                interactionMode === mode
                  ? 'bg-primary/15 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}

          <span className="px-2 text-[0.68rem] text-muted-foreground">
            {interactionMode === 'selection'
              ? selectedCount
                ? `${selectedCount} selected`
                : 'Drag to select'
              : `${nodes.length} ${nodes.length === 1 ? 'session' : 'sessions'}`}
          </span>
        </div>
      </div>

      <LaunchSessionDialog
        cli={launchCli}
        workspaceId={workspaceId}
        onCancel={() => setLaunchCli(null)}
        onLaunch={(config) => launchMutation.mutate(config)}
        isLaunching={launchMutation.isPending}
        error={launchMutation.error}
      />

      <AlertDialog
        open={closeCandidate !== null}
        onOpenChange={(open) => !open && setCloseCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Close {closingNode ? CLI_LABELS[closingNode.data.cli] : 'session'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The process is terminated and removed from the canvas. Work already written to the
              directory is untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloseCandidate(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (closeCandidate) {
                  void closeTerminal(closeCandidate)
                  removeNode(closeCandidate)
                }

                setCloseCandidate(null)
              }}
            >
              End CLI
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function WorkspaceCanvasRoute(): React.JSX.Element {
  const navigate = useNavigate()
  const { workspaceId } = useParams({ from: workspaceCanvasRoute.id })
  const workspacesQuery = useQuery(workspaceQueryOptions)
  const workspace = workspacesQuery.data?.find((candidate) => candidate.id === workspaceId)

  function goBack(): void {
    void navigate({ to: '/' })
  }

  if (workspacesQuery.isPending) {
    return (
      <main className="grid h-screen place-items-center">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Opening workspace</span>
      </main>
    )
  }

  if (workspacesQuery.isError || !workspace) {
    return (
      <main className="min-h-screen">
        <BackHeader onBack={goBack} />
        <div className="grid min-h-[calc(100vh-4.25rem)] place-items-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto grid size-11 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </div>
            <h1 className="mt-5 text-xl font-semibold">Workspace unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {workspacesQuery.isError
                ? workspacesQuery.error.message
                : 'This workspace may have been archived or deleted.'}
            </p>
            <Button type="button" variant="outline" className="mt-6" onClick={goBack}>
              Return to workspaces
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="canvas-open grid h-screen grid-rows-[auto_1fr] overflow-hidden">
      <BackHeader onBack={goBack}>
        <p className="truncate text-sm font-medium" title={workspace.name}>
          {workspace.name}
        </p>
        <p
          className="truncate font-mono text-[0.68rem] text-muted-foreground"
          title={workspace.localPath}
        >
          {workspace.localPath}
        </p>
      </BackHeader>

      <ReactFlowProvider>
        <WorkspaceCanvas workspaceId={workspace.id} />
      </ReactFlowProvider>
    </main>
  )
}

export const workspaceCanvasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId/canvas',
  component: WorkspaceCanvasRoute
})
