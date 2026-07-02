import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
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
  objective?: string;

  @IsString()
  @IsOptional()
  sourceRef?: string;

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

  @IsString()
  @IsOptional()
  likelihood?: string;

  @IsString()
  @IsOptional()
  impact?: string;

  @IsString()
  @IsOptional()
  mitigation?: string;

  @IsString()
  @IsOptional()
  targetRef?: string;
}

export class UpdateStatusDto {
  @IsEnum(InputStatus)
  status: InputStatus;
}

export class UpsertTranslationDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() content?: string;
  @IsString() @IsOptional() means?: string;
  @IsString() @IsOptional() output?: string;
  @IsString() @IsOptional() verificationMethod?: string;
  @IsString() @IsOptional() targetValue?: string;
  @IsString() @IsOptional() dueMonth?: string;
  @IsString() @IsOptional() objective?: string;
  @IsString() @IsOptional() sourceRef?: string;
  @IsString() @IsOptional() deliverable?: string;
  @IsString() @IsOptional() baseline?: string;
  @IsString() @IsOptional() dataSource?: string;
  @IsString() @IsOptional() frequency?: string;
  @IsString() @IsOptional() likelihood?: string;
  @IsString() @IsOptional() impact?: string;
  @IsString() @IsOptional() mitigation?: string;
}

export class UpdatePmoDto {
  @IsIn(['retained', 'rejected'])
  @IsOptional()
  status?: 'retained' | 'rejected';

  @IsString()
  @IsOptional()
  paymentAmountFinal?: string;
}
