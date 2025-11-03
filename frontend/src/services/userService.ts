import api from './api';

export interface UserFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  direction?: string;
  grade?: string;
  status?: string;
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  grade?: string;
  direction?: string;
  role: string;
  status?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  grade?: string;
  direction?: string;
  role?: string;
  status?: string;
  password?: string;
}

export const userService = {
  async list(filters: UserFilters = {}) {
    const response = await api.get('/users', { params: filters });
    return response.data;
  },

  async create(data: CreateUserData) {
    const response = await api.post('/users', data);
    return response.data;
  },

  async update(id: string | number, data: UpdateUserData) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  }
};