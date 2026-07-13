import { client } from './client';
import { AuthUser } from '@/stores/auth.store';

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  user: AuthUser;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await client.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  logout: async (refreshToken: string | null): Promise<void> => {
    await client.post('/auth/logout', refreshToken ? { refreshToken } : {});
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await client.get<AuthUser>('/auth/me');
    return data;
  },
};
