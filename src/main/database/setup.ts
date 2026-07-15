import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app } from 'electron'

function getApplicationRoot(): string {
  if (app.isPackaged) {
    return app.getAppPath()
  }

  return join(__dirname, '../..')
}

function getDatabaseDirectory(): string {
  if (app.isPackaged) {
    return join(app.getPath('userData'), 'data')
  }

  return join(getApplicationRoot(), 'data')
}

function getPrismaRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'app.asar.unpacked')
  }

  return getApplicationRoot()
}

function getPrismaNodePath(): string | undefined {
  if (!app.isPackaged) {
    return process.env.NODE_PATH
  }

  return [process.env.NODE_PATH, join(process.resourcesPath, 'app.asar', 'node_modules')]
    .filter((path): path is string => Boolean(path))
    .join(delimiter)
}

async function runPrismaMigrations(databaseUrl: string): Promise<void> {
  const prismaRoot = getPrismaRoot()
  const prismaCli = join(prismaRoot, 'node_modules', 'prisma', 'build', 'index.js')
  const prismaConfig = join(prismaRoot, 'prisma.config.ts')

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCli, 'migrate', 'deploy', '--config', prismaConfig],
      {
        cwd: prismaRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          ELECTRON_RUN_AS_NODE: '1',
          NODE_PATH: getPrismaNodePath()
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    )

    let output = ''
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Prisma migration failed with exit code ${code}.\n${output}`))
    })
  })
}

export async function prepareDatabase(): Promise<string> {
  const directory = getDatabaseDirectory()
  await mkdir(directory, { recursive: true })

  const databaseUrl = pathToFileURL(join(directory, 'drakoryia.db')).href
  await runPrismaMigrations(databaseUrl)

  return databaseUrl
}
