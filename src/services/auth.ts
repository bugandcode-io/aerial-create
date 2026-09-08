import { apiRequest } from './api';
export interface CurrentUser { id: string; email: string }
export const authApi = {
  me: () => apiRequest<{user:CurrentUser}>('/auth/me'),
  login: (email:string,password:string) => apiRequest<{user:CurrentUser}>('/auth/login','POST',{email,password}),
  register: (email:string,password:string) => apiRequest<{user:CurrentUser}>('/auth/register','POST',{email,password}),
  logout: () => apiRequest<void>('/auth/logout','POST'),
};
