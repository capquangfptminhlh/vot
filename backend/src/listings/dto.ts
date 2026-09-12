import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
export class CreateListingDto {
  @IsOptional() @IsUUID() paddleModelId?: string;
  @IsOptional() @IsString() @Length(1,80) customBrand?: string;
  @IsOptional() @IsString() @Length(1,120) customModel?: string;
  @IsString() @Length(8,180) title!: string;
  @IsOptional() @IsString() @Length(0,5000) description?: string;
  @IsString() @Length(2,80) condition!: string;
  @IsOptional() @IsInt() @Min(1) @Max(100) conditionPercent?: number;
  @IsInt() @Min(10000) @Max(200000000) priceVnd!: number;
  @IsOptional() @IsString() @Length(1,100) province?: string;
  @IsOptional() @IsString() @Length(1,100) district?: string;
  @IsOptional() @IsString() @Length(3,200) serialNumber?: string;
  @IsOptional() @IsBoolean() invoiceAvailable?: boolean;
  @IsOptional() @IsBoolean() nfcAvailable?: boolean;
}
export class PresignImageDto {
  @IsString() @Length(1,180) fileName!: string;
  @IsString() @Length(5,80) contentType!: string;
  @IsInt() @Min(1) @Max(12582912) size!: number;
}
export class CompleteImageDto {
  @IsString() @Length(10,500) key!: string;
  @IsInt() @Min(0) @Max(7) sortOrder!: number;
}
export class ReportDto {
  @IsString() @Length(3,40) reason!: string;
  @IsOptional() @IsString() @Length(0,2000) detail?: string;
}
