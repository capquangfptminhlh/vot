import { IsIn, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsIn(['EMAIL','PHONE']) channel!: 'EMAIL' | 'PHONE';
  @IsString() @Length(5, 320) target!: string;
}
export class VerifyOtpDto extends RequestOtpDto {
  @IsString() @Length(6, 8) code!: string;
}
