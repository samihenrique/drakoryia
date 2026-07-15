import { Injectable } from '@nestjs/common'
import type { BackendHealth } from '../../shared/backend'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<BackendHealth> {
    await this.prisma.applicationSetting.count()

    return {
      status: 'ok',
      service: 'drakoryia-api',
      timestamp: new Date().toISOString()
    }
  }
}
