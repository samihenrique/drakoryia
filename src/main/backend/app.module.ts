import { Module } from '@nestjs/common'
import type { DynamicModule } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

@Module({
  controllers: [HealthController],
  providers: [HealthService]
})
export class AppModule {}

export function createAppModule(databaseUrl: string): DynamicModule {
  return {
    module: AppModule,
    imports: [DatabaseModule.forRoot(databaseUrl)]
  }
}
