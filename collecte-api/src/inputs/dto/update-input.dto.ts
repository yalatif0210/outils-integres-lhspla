import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InputType } from './create-input.dto';

export enum InputStatus {
  draft = 'draft',
  submitted = 'submitted',
  retained = 'retained',
  rejected = 'rejected',
}

export class UpdateInputDto {
  @IsEnum(InputType)
  @IsOptional()
  type?: InputType;

  @IsString()
  @IsOptional()
  content?: string;

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

export class UpdateStatusDto {
  @IsEnum(InputStatus)
  status: InputStatus;
}
