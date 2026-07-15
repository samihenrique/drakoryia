import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { BackendHealth } from '../../shared/backend'
import { createAppModule } from './app.module'

export interface BackendClient {
  getHealth(): Promise<BackendHealth>
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

  return {
    async getHealth(): Promise<BackendHealth> {
      const response = await fetch(new URL('/health', baseUrl))

      if (!response.ok) {
        throw new Error(`The local backend responded with HTTP ${response.status}.`)
      }

      const payload: unknown = await response.json()

      if (!isBackendHealth(payload)) {
        throw new Error('The local backend returned an invalid health response.')
      }

      return payload
    },
    close(): Promise<void> {
      return application.close()
    }
  }
}
