import { IsOptional, IsString } from 'class-validator';

/**
 * Native clients have no cookie jar, so they present the refresh token in the
 * body. Web clients omit it and rely on the httpOnly cookie.
 */
export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
