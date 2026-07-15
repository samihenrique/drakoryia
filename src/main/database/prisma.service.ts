import { Inject, Injectable } from '@nestjs/common'
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../generated/prisma/client'
import { DATABASE_URL } from './tokens'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  constructor(@Inject(DATABASE_URL) databaseUrl: string) {
    super({
      adapter: new PrismaBetterSqlite3({ url: databaseUrl })
    })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect()
  }
}
