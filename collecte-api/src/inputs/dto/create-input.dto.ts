import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum InputType {
  activity = 'activity',
  indicator = 'indicator',
  milestone = 'milestone',
  comment = 'comment',
  risk = 'risk',
}

export class CreateInputDto {
  @IsString()
  @IsNotEmpty()
  referenceSectionId: string;

  @IsEnum(InputType)
  type: InputType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  means?: string;

  @IsString()
  @IsOptional()
  output?: string;

  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @IsString()
  @IsOptional()
  targetValue?: string;

  @IsString()
  @IsOptional()
  dueMonth?: string;
}
