import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeekStatus } from '@prisma/client';
import { IsDateString, IsString } from 'class-validator';

const ENTITY_CODES = ['CAD', 'CAC', 'PMO', 'QAD', 'SE', 'SI', 'FINANCES', 'COM'];

export class CreateWeekDto {
  @IsDateString()
  weekStart: string;

  @IsDateString()
  weekEnd: string;

  @IsString()
  weekReference: string;
}

@Injectable()
export class WeeksService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.week.findMany({
      orderBy: { weekStart: 'desc' },
      include: {
        _count: { select: { submissions: true } },
        submissions: {
          select: { entityCode: true, status: true, lastSavedAt: true, submittedAt: true },
        },
      },
    });
  }

  async findById(id: string) {
    const week = await this.prisma.week.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            activities: { orderBy: { orderIndex: 'asc' } },
            plannedActivities: { orderBy: { orderIndex: 'asc' } },
            riskPoints: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });
    if (!week) throw new NotFoundException('Semaine non trouvée');
    return week;
  }

  async findActive() {
    return this.prisma.week.findMany({
      where: { status: WeekStatus.active },
      orderBy: { weekStart: 'desc' },
      include: {
        submissions: { select: { entityCode: true, status: true } },
      },
    });
  }

  async create(dto: CreateWeekDto, userId: string) {
    const week = await this.prisma.week.create({
      data: {
        weekReference: dto.weekReference,
        weekStart: new Date(dto.weekStart),
        weekEnd: new Date(dto.weekEnd),
        createdBy: userId,
        submissions: {
          create: ENTITY_CODES.map(code => ({ entityCode: code })),
        },
      },
      include: { submissions: true },
    });
    return week;
  }

  async setStatus(id: string, status: WeekStatus) {
    const week = await this.prisma.week.findUnique({ where: { id } });
    if (!week) throw new NotFoundException('Semaine non trouvée');
    return this.prisma.week.update({
      where: { id },
      data: {
        status,
        closedAt: status === WeekStatus.closed ? new Date() : null,
      },
    });
  }

  async getSubmissionMatrix(weekId: string) {
    const week = await this.prisma.week.findUnique({
      where: { id: weekId },
      include: {
        submissions: {
          select: {
            entityCode: true, status: true, responsible: true,
            submittedAt: true, lastSavedAt: true,
            _count: { select: { activities: true, plannedActivities: true, riskPoints: true } },
          },
        },
      },
    });
    if (!week) throw new NotFoundException();
    return week;
  }
}
