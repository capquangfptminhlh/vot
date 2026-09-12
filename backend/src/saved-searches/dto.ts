import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSavedSearchDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(120) query?: string;
  @IsOptional() @IsString() @MaxLength(100) brandSlug?: string;
  @IsOptional() @IsString() @MaxLength(140) modelSlug?: string;
  @IsOptional() @IsInt() @Min(0) minPriceVnd?: number;
  @IsOptional() @IsInt() @Min(0) maxPriceVnd?: number;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsOptional() @IsString() @MaxLength(120) condition?: string;
  @IsOptional() @IsBoolean() notifyEnabled?: boolean;
}

export class UpdateSavedSearchDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsBoolean() notifyEnabled?: boolean;
}
