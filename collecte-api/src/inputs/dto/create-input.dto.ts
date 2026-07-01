import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum InputType {
  activity = 'activity',
  indicator = 'indicator',
  milestone = 'milestone',
  comment = 'comment',
  risk = 'risk',
}

export class CreateInputDto {
  @IsString()
  referenceSectionId: string;

  @IsEnum(InputType)
  type: InputType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  title?: string;

  // activite + generic
  @IsString()
  @IsOptional()
  means?: string;

  @IsString()
  @IsOptional()
  output?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  sourceRef?: string;

  // jalon
  @IsString()
  @IsOptional()
  deliverable?: string;

  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @IsString()
  @IsOptional()
  dueMonth?: string;

  @IsString()
  @IsOptional()
  paymentAmountProposed?: string;

  // indicateur
  @IsString()
  @IsOptional()
  targetValue?: string;

  @IsString()
  @IsOptional()
  baseline?: string;

  @IsString()
  @IsOptional()
  dataSource?: string;

  @IsString()
  @IsOptional()
  frequency?: string;

  // risque
  @IsString()
  @IsOptional()
  likelihood?: string;

  @IsString()
  @IsOptional()
  impact?: string;

  @IsString()
  @IsOptional()
  mitigation?: string;

  // commentaire
  @IsString()
  @IsOptional()
  targetRef?: string;
}
