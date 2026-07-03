import apiClient from '@/lib/api/api-client';
import type { PaginatedResponse, ListParams } from '@/types';

export interface MediaFile {
  id: string;
  uploaderUserId: string;
  bucket: string;
  path: string;
  originalName?: string;
  mimeType: string;
  fileKind?: string;
  filePurpose?: string;
  width?: number;
  height?: number;
  sizeBytes: string;
  altText?: string;
  thumbnailUrl?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface RawPaginatedResponse<T> {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function normalizePaginatedResponse<T>(response: unknown): PaginatedResponse<T> {
  const raw = response as RawPaginatedResponse<T>;
  const data = raw.data || [];
  return {
    data,
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
  };
}

export const mediaService = {
  async uploadFile(
    file: File,
    bucket: string,
    options?: {
      altText?: string;
      fileKind?: string;
      filePurpose?: string;
      width?: number;
      height?: number;
    },
  ): Promise<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (options?.altText) formData.append('altText', options.altText);
    if (options?.fileKind) formData.append('fileKind', options.fileKind);
    if (options?.filePurpose) formData.append('filePurpose', options.filePurpose);
    return apiClient.post<MediaFile>('/media/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async uploadOwnFile(
    file: File,
    bucket: string,
    options?: { altText?: string; fileKind?: string; filePurpose?: string },
  ): Promise<MediaFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    if (options?.altText) formData.append('altText', options.altText);
    if (options?.fileKind) formData.append('fileKind', options.fileKind);
    if (options?.filePurpose) formData.append('filePurpose', options.filePurpose);
    return apiClient.post<MediaFile>('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async getAdminFiles(params?: ListParams): Promise<PaginatedResponse<MediaFile>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/media/admin/files?${query}` : '/media/admin/files';
    const response = await apiClient.get<RawPaginatedResponse<MediaFile>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminFileById(id: string): Promise<MediaFile> {
    return apiClient.get<MediaFile>(`/media/admin/files/${id}`);
  },

  async updateAdminFile(id: string, data: { altText?: string; fileKind?: string; filePurpose?: string }): Promise<MediaFile> {
    return apiClient.patch<MediaFile>(`/media/admin/files/${id}`, data);
  },

  async deleteAdminFile(id: string): Promise<void> {
    await apiClient.delete(`/media/admin/files/${id}`);
  },

  async bulkDeleteFiles(ids: string[]): Promise<void> {
    await apiClient.post('/media/admin/files/bulk-delete', { ids });
  },

  async getMediaStats(): Promise<{ totalFiles: number; totalSizeBytes: string; byBucket: Array<{ bucket: string; count: string; totalSize: string }> }> {
    return apiClient.get('/media/admin/stats');
  },
};

export default mediaService;
