import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function buildAdapter(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema') ?? 'public';
  url.searchParams.delete('schema');
  const pool = new Pool({ connectionString: url.toString() });
  return new PrismaPg(pool, { schema });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = buildAdapter(process.env.DATABASE_URL ?? '');
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
