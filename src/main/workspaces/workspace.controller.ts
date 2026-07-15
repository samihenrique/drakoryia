import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import type { CreateWorkspaceInput, DeleteWorkspaceInput, Workspace } from '../../shared/backend'
import { WorkspaceService } from './workspace.service'

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  list(): Promise<Workspace[]> {
    return this.workspaceService.list()
  }

  @Get('archived')
  listArchived(): Promise<Workspace[]> {
    return this.workspaceService.listArchived()
  }

  @Post()
  create(@Body() input: CreateWorkspaceInput): Promise<Workspace> {
    return this.workspaceService.create(input)
  }

  @Post(':id/archive')
  archive(@Param('id') id: string): Promise<Workspace> {
    return this.workspaceService.archive(id)
  }

  @Post(':id/unarchive')
  unarchive(@Param('id') id: string): Promise<Workspace> {
    return this.workspaceService.unarchive(id)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Body() input: DeleteWorkspaceInput
  ): Promise<void> {
    await this.workspaceService.delete(id, input.confirmationName)
  }
}
