import { api } from '@/lib/api';
import type { LoginResponse, ManagedUser, UserProfile } from '@/types/api';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { username, password }),
  logout: () => api.post<{ message: string }>('/auth/logout/'),
  me: () => api.get<UserProfile>('/auth/me/'),
  updateMe: (data: Partial<Pick<UserProfile, 'email' | 'first_name' | 'last_name'>>) =>
    api.patch<UserProfile>('/auth/me/', data),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ message: string; token: string }>('/auth/change-password/', {
      current_password,
      new_password,
    }),
  users: {
    list: () => api.get<ManagedUser[]>('/auth/users/'),
    create: (data: { username: string; password: string; email?: string; role: string }) =>
      api.post<ManagedUser>('/auth/users/create/', data),
    update: (id: number, data: { role?: string; is_active?: boolean }) =>
      api.patch<ManagedUser>(`/auth/users/${id}/`, data),
    destroy: (id: number) => api.delete<void>(`/auth/users/${id}/`),
  },
};
