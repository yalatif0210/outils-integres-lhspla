import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { tmpdir } from 'os';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import {
  MissionsService,
  CreateMissionDto,
  UpdateMissionDto,
  CopReviewDto,
} from './missions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('missions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionsController {
  constructor(private svc: MissionsService) {}

  @Get()
  findAll(@Request() req: any, @Query('entityCode') entityCode?: string) {
    return this.svc.findAll(req.user.roles, entityCode ?? req.user.entityCode, req.user.id, req.user.isEntityResponsible);
  }

  // Tableau de bord des missions : une ligne par participant par mission
  @Get('dashboard')
  @Roles(Role.super_admin, Role.admin_tpm, Role.chief_of_party, Role.assistant_direction)
  missionDashboard() {
    return this.svc.getDashboard();
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateMissionDto) {
    return this.svc.create(dto, req.user.id, req.user.roles);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // Initiateur uniquement, statut draft
  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.svc.update(id, dto, req.user.id);
  }

  // entity_member + COP peuvent soumettre (la méthode différencie le comportement)
  @Post(':id/submit')
  @Roles(Role.entity_member, Role.chief_of_party, Role.super_admin)
  submit(@Request() req: any, @Param('id') id: string) {
    return this.svc.submit(id, req.user.id, req.user.roles);
  }

  // admin_tpm vise ou renvoie la DM
  @Post(':id/tpm-review')
  @Roles(Role.admin_tpm, Role.super_admin)
  tpmReview(@Request() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.tpmReview(id, dto, req.user.id);
  }

  // COP valide ou rejette
  @Post(':id/cop-review')
  @Roles(Role.chief_of_party, Role.super_admin)
  copReview(@Request() req: any, @Param('id') id: string, @Body() dto: CopReviewDto) {
    return this.svc.copReview(id, dto, req.user.id);
  }

  // assistant_direction génère les docs → pending_dg
  @Post(':id/generate-docs')
  @Roles(Role.assistant_direction, Role.super_admin)
  generateDocs(@Request() req: any, @Param('id') id: string) {
    return this.svc.generateDocs(id, req.user.id);
  }

  // assistant_direction clique "Validé par le DG" → in_progress
  @Post(':id/validate-dg')
  @Roles(Role.assistant_direction, Role.super_admin)
  validateDg(@Request() req: any, @Param('id') id: string) {
    return this.svc.validateDg(id, req.user.id);
  }

  // assistant_direction renseigne N° OM et Observations depuis le tableau de bord
  @Patch(':id/dashboard')
  @Roles(Role.assistant_direction, Role.super_admin)
  updateDashboard(@Param('id') id: string, @Body() dto: any) {
    return this.svc.updateDashboardFields(id, dto);
  }

  // Annulation : initiateur si draft, assistant_direction/COP/admin si autre statut
  @Post(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.svc.cancel(id, req.user.id, req.user.roles);
  }

  // Téléchargement document généré : dm | odm
  @Get(':id/download/:docType')
  download(@Param('id') id: string, @Param('docType') docType: string, @Res() res: Response) {
    const filename = docType === 'odm' ? 'ODM.docx' : 'DM.docx';
    const label    = docType === 'odm' ? 'ODM' : 'DM';
    const filePath = path.join(process.cwd(), 'uploads', 'missions', id, filename);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Document ${label} introuvable — générez d\'abord les documents`);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
  }

  // Import document signé (PDF, JPEG, PNG, JPG) après génération DM/ODM
  @Post(':id/upload-signed-doc')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: tmpdir(),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
        cb(null, `signed_tmp_${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = /\.(pdf|jpeg|jpg|png)$/i;
      if (allowed.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Format non supporté — PDF, JPEG, PNG ou JPG uniquement'), false);
      }
    },
  }))
  uploadSignedDoc(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Fichier manquant');
    return this.svc.uploadSignedDoc(id, file, req.user.id, req.user.roles);
  }

  // Téléchargement du document signé importé
  @Get(':id/download-signed-doc')
  async downloadSignedDoc(@Param('id') id: string, @Res() res: Response) {
    const { filePath, ext } = await this.svc.getSignedDocPath(id);
    if (!fs.existsSync(filePath)) throw new NotFoundException('Fichier introuvable sur le serveur');
    const mimeMap: Record<string, string> = {
      pdf:  'application/pdf',
      jpeg: 'image/jpeg',
      jpg:  'image/jpeg',
      png:  'image/png',
    };
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="signed.${ext}"`);
    res.sendFile(filePath);
  }
}
