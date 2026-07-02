import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SectionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.referenceSection.findMany({
      orderBy: { ordre: 'asc' },
      include: {
        _count: { select: { inputs: { where: { deletedAt: null } as any } } },
      },
    });
  }

  async findOne(id: string) {
    const section = await this.prisma.referenceSection.findUnique({
      where: { id },
      include: {
        inputs: {
          where: { deletedAt: null } as any,
          include: {
            author: true,
            entity: true,
            revisions: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!section) throw new NotFoundException(`Section ${id} introuvable`);
    return section;
  }
}
