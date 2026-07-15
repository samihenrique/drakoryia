import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { existsSync, statSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import type { Workspace as PrismaWorkspace } from '../../generated/prisma/client'
import type { CreateWorkspaceInput, Workspace } from '../../shared/backend'
import { PrismaService } from '../database/prisma.service'

const MAX_NAME_LENGTH = 80

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Workspace[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        archivedAt: null
      },
      orderBy: [
        {
          updatedAt: 'desc'
        },
        {
          name: 'asc'
        }
      ]
    })

    return workspaces.map((workspace) => this.toWorkspace(workspace))
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const name = this.normalizeName(input.name)
    const localPath = this.validateDirectory(input.localPath)

    try {
      const workspace = await this.prisma.workspace.create({
        data: {
          name,
          localPath
        }
      })

      return this.toWorkspace(workspace)
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('This directory is already registered as a workspace.')
      }

      throw error
    }
  }

  async listArchived(): Promise<Workspace[]> {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        archivedAt: {
          not: null
        }
      },
      orderBy: {
        archivedAt: 'desc'
      }
    })

    return workspaces.map((workspace) => this.toWorkspace(workspace))
  }

  async archive(id: string): Promise<Workspace> {
    const workspace = await this.findById(id)
    const archivedWorkspace = await this.prisma.workspace.update({
      where: {
        id: workspace.id
      },
      data: {
        archivedAt: new Date()
      }
    })

    return this.toWorkspace(archivedWorkspace)
  }

  async unarchive(id: string): Promise<Workspace> {
    const workspace = await this.findById(id)
    const unarchivedWorkspace = await this.prisma.workspace.update({
      where: {
        id: workspace.id
      },
      data: {
        archivedAt: null
      }
    })

    return this.toWorkspace(unarchivedWorkspace)
  }

  async delete(id: string, confirmationName: string): Promise<void> {
    const workspace = await this.findById(id)

    if (confirmationName.trim() !== workspace.name) {
      throw new BadRequestException('Type the workspace name exactly to confirm deletion.')
    }

    await this.prisma.workspace.delete({
      where: {
        id: workspace.id
      }
    })
  }

  private async findById(id: string): Promise<PrismaWorkspace> {
    const workspace = await this.prisma.workspace.findUnique({
      where: {
        id
      }
    })

    if (!workspace) {
      throw new NotFoundException('Workspace not found.')
    }

    return workspace
  }

  private normalizeName(value: string): string {
    const name = value.trim()

    if (!name) {
      throw new BadRequestException('A workspace name is required.')
    }

    if (name.length > MAX_NAME_LENGTH) {
      throw new BadRequestException(`Workspace names can have at most ${MAX_NAME_LENGTH} characters.`)
    }

    return name
  }

  private validateDirectory(value: string): string {
    if (!value || !isAbsolute(value)) {
      throw new BadRequestException('Choose an absolute local directory.')
    }

    const localPath = resolve(value)

    try {
      if (!existsSync(localPath) || !statSync(localPath).isDirectory()) {
        throw new BadRequestException('The selected path is not an accessible directory.')
      }
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error
      }

      throw new BadRequestException('The selected directory could not be inspected.')
    }

    return localPath
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
  }

  private toWorkspace(workspace: PrismaWorkspace): Workspace {
    return {
      id: workspace.id,
      name: workspace.name,
      localPath: workspace.localPath,
      archivedAt: workspace.archivedAt?.toISOString() ?? null,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString()
    }
  }
}
