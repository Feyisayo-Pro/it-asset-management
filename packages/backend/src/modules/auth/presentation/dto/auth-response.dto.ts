export interface AuthenticatedUserSummaryDto {
  id: string;
  email: string;
  roleName: string;
  mustChangePassword: boolean;
}

export interface LoginResponseDto {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: AuthenticatedUserSummaryDto;
}

export interface RefreshResponseDto {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
}
