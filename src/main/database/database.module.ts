import { Module } from '@nestjs/common'
import type { DynamicModule } from '@nestjs/common'
import { PrismaService } from './prisma.service'
import { DATABASE_URL } from './tokens'

@Module({})
export class DatabaseModule {
  static forRoot(databaseUrl: string): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_URL,
          useValue: databaseUrl
        },
        PrismaService
      ],
      exports: [PrismaService]
    }
  }
}
