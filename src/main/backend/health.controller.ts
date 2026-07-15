import { Controller, Get } from '@nestjs/common'
import type { BackendHealth } from '../../shared/backend'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(): Promise<BackendHealth> {
    return this.healthService.getHealth()
  }
}
