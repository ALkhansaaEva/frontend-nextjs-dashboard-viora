import { apiClient, validationUtils } from './api-client';
import type { ApiResponse } from '@/types';

interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  level: number;
  permissions: string[];
  createdAt: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface UserListItem {
  id: string;
  email: string;
  nickname: string;
  status: string;
  roles: string[];
  createdAt: string;
  lastLogin?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ADMIN_BASE = '/admin';

export const adminService = {
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<Role[] | ApiResponse<Role[]>>(`${ADMIN_BASE}/roles`);
    return Array.isArray(response) ? response : (response as ApiResponse<Role[]>).data;
  },

  async getRole(code: string): Promise<Role> {
    if (!validationUtils.isValidString(code)) {
      throw new Error('Invalid role code');
    }
    return apiClient.get<Role>(`${ADMIN_BASE}/roles/${code}`);
  },

  async createRole(data: { code: string; name: string; description?: string; level?: number }): Promise<Role> {
    if (!validationUtils.isValidString(data.code) || !validationUtils.isValidString(data.name)) {
      throw new Error('Invalid role data');
    }
    return apiClient.post<Role>(`${ADMIN_BASE}/roles`, data);
  },

  async updateRole(code: string, data: { name?: string; description?: string; level?: number }): Promise<Role> {
    if (!validationUtils.isValidString(code)) {
      throw new Error('Invalid role code');
    }
    return apiClient.put<Role>(`${ADMIN_BASE}/roles/${code}`, data);
  },

  async deleteRole(code: string): Promise<void> {
    if (!validationUtils.isValidString(code)) {
      throw new Error('Invalid role code');
    }
    await apiClient.delete(`${ADMIN_BASE}/roles/${code}`);
  },

  async getRolePermissions(code: string): Promise<Permission[]> {
    if (!validationUtils.isValidString(code)) {
      throw new Error('Invalid role code');
    }
    const response = await apiClient.get<Permission[] | ApiResponse<Permission[]>>(`${ADMIN_BASE}/roles/${code}/permissions`);
    return Array.isArray(response) ? response : (response as ApiResponse<Permission[]>).data;
  },

  async assignPermissionToRole(roleCode: string, permissionCode: string): Promise<void> {
    if (!validationUtils.isValidString(roleCode) || !validationUtils.isValidString(permissionCode)) {
      throw new Error('Invalid parameters');
    }
    await apiClient.post(`${ADMIN_BASE}/roles/${roleCode}/permissions/assign`, { permissionCode });
  },

  async revokePermissionFromRole(roleCode: string, permissionCode: string): Promise<void> {
    if (!validationUtils.isValidString(roleCode) || !validationUtils.isValidString(permissionCode)) {
      throw new Error('Invalid parameters');
    }
    await apiClient.post(`${ADMIN_BASE}/roles/${roleCode}/permissions/revoke`, { permissionCode });
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[] | ApiResponse<Permission[]>>(`${ADMIN_BASE}/permissions`);
    return Array.isArray(response) ? response : (response as ApiResponse<Permission[]>).data;
  },

  async createPermission(data: { code: string; name: string; description?: string }): Promise<Permission> {
    if (!validationUtils.isValidString(data.code) || !validationUtils.isValidString(data.name)) {
      throw new Error('Invalid permission data');
    }
    return apiClient.post<Permission>(`${ADMIN_BASE}/permissions`, data);
  },

  async getUsers(params?: { search?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<UserListItem>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    const url = `${ADMIN_BASE}/users${query.toString() ? `?${query}` : ''}`;
    return apiClient.get<PaginatedResponse<UserListItem>>(url);
  },

  async getUser(userId: string): Promise<UserListItem> {
    if (!validationUtils.isValidUUID(userId)) {
      throw new Error('Invalid user ID');
    }
    return apiClient.get<UserListItem>(`${ADMIN_BASE}/users/${userId}`);
  },

  async assignRole(userId: string, roleCode: string): Promise<void> {
    if (!validationUtils.isValidUUID(userId) || !validationUtils.isValidString(roleCode)) {
      throw new Error('Invalid parameters');
    }
    await apiClient.post(`${ADMIN_BASE}/users/${userId}/roles/assign`, { roleCode });
  },

  async revokeRole(userId: string, roleCode: string): Promise<void> {
    if (!validationUtils.isValidUUID(userId) || !validationUtils.isValidString(roleCode)) {
      throw new Error('Invalid parameters');
    }
    await apiClient.post(`${ADMIN_BASE}/users/${userId}/roles/revoke`, { roleCode });
  },

  async adjustBalance(
    userId: string, 
    data: { currency: 'gold' | 'gems'; amount: string; action: 'add' | 'deduct'; reason: string }
  ): Promise<{ gold: number; gems: number }> {
    if (!validationUtils.isValidUUID(userId)) {
      throw new Error('Invalid user ID');
    }
    return apiClient.post<{ gold: number; gems: number }>(`${ADMIN_BASE}/users/${userId}/balance`, data);
  },

  async getUserRoles(userId: string): Promise<string[]> {
    if (!validationUtils.isValidUUID(userId)) {
      throw new Error('Invalid user ID');
    }
    const response = await apiClient.get<string[] | ApiResponse<string[]>>(`${ADMIN_BASE}/users/${userId}/roles`);
    return Array.isArray(response) ? response : (response as ApiResponse<string[]>).data;
  },
};

export default adminService;