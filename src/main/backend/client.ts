import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type {
  BackendHealth,
  CreateWorkspaceInput,
  DeleteWorkspaceInput,
  Workspace
} from '../../shared/backend'
import { createAppModule } from './app.module'

export interface BackendClient {
  getHealth(): Promise<BackendHealth>
  listWorkspaces(): Promise<Workspace[]>
  listArchivedWorkspaces(): Promise<Workspace[]>
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>
  archiveWorkspace(id: string): Promise<Workspace>
  unarchiveWorkspace(id: string): Promise<Workspace>
  deleteWorkspace(id: string, input: DeleteWorkspaceInput): Promise<void>
  close(): Promise<void>
}

function isBackendHealth(value: unknown): value is BackendHealth {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    candidate.status === 'ok' &&
    candidate.service === 'drakoryia-api' &&
    typeof candidate.timestamp === 'string'
  )
}

async function closeWithError(
  application: INestApplication,
  message: string
): Promise<never> {
  await application.close()
  throw new Error(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => undefined)

  if (isRecord(payload) && typeof payload.message === 'string') {
    return payload.message
  }

  return `The local backend responded with HTTP ${response.status}.`
}

export async function startBackend(databaseUrl: string): Promise<BackendClient> {
  const application = await NestFactory.create(createAppModule(databaseUrl), {
    logger: ['error', 'warn']
  })

  await application.listen(0, '127.0.0.1')

  const address = application.getHttpServer().address()

  if (address === null || typeof address === 'string') {
    return closeWithError(application, 'The local backend did not expose a TCP address.')
  }

  const baseUrl = new URL(`http://127.0.0.1:${address.port}`)

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(new URL(path, baseUrl), init)

    if (!response.ok) {
      throw new Error(await getErrorMessage(response))
    }

    if (response.status === 204) {
      return undefined as T
    }

    const text = await response.text()
    return text ? (JSON.parse(text) as T) : (undefined as T)
  }

  return {
    async getHealth(): Promise<BackendHealth> {
      const payload: unknown = await request<unknown>('/health')

      if (!isBackendHealth(payload)) {
        throw new Error('The local backend returned an invalid health response.')
      }

      return payload
    },
    listWorkspaces(): Promise<Workspace[]> {
      return request<Workspace[]>('/workspaces')
    },
    listArchivedWorkspaces(): Promise<Workspace[]> {
      return request<Workspace[]>('/workspaces/archived')
    },
    createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
      return request<Workspace>('/workspaces', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(input)
      })
    },
    archiveWorkspace(id: string): Promise<Workspace> {
      return request<Workspace>(`/workspaces/${id}/archive`, {
        method: 'POST'
      })
    },
    unarchiveWorkspace(id: string): Promise<Workspace> {
      return request<Workspace>(`/workspaces/${id}/unarchive`, {
        method: 'POST'
      })
    },
    deleteWorkspace(id: string, input: DeleteWorkspaceInput): Promise<void> {
      return request<void>(`/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(input)
      })
    },
    close(): Promise<void> {
      return application.close()
    }
  }
}
