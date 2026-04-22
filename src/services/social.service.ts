import apiClient from './api.client';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'friends' | 'pending' | 'blocked';
  createdAt: string;
  friend?: {
    id: string;
    nickname: string;
    avatar?: string;
    status?: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

export const socialService = {
  async getFriends(): Promise<Friend[]> {
    const response = await apiClient.get<Friend[] | { data: Friend[] }>('/social/friends');
    if (Array.isArray(response)) return response;
    return (response as { data: Friend[] }).data || [];
  },

  async sendFriendRequest(userId: string): Promise<void> {
    await apiClient.post(`/social/friend-request/${userId}`);
  },

  async acceptFriendRequest(requestId: string): Promise<void> {
    await apiClient.post(`/social/friend-request/accept/${requestId}`);
  },

  async rejectFriendRequest(requestId: string): Promise<void> {
    await apiClient.post(`/social/friend-request/reject/${requestId}`);
  },

  async cancelFriendRequest(requestId: string): Promise<void> {
    await apiClient.post(`/social/friend-request/cancel/${requestId}`);
  },

  async blockUser(userId: string): Promise<void> {
    await apiClient.post(`/social/block/${userId}`);
  },

  async unblockUser(userId: string): Promise<void> {
    await apiClient.post(`/social/unblock/${userId}`);
  },

  async muteUser(userId: string): Promise<void> {
    await apiClient.post(`/social/mute/${userId}`);
  },

  async unmuteUser(userId: string): Promise<void> {
    await apiClient.post(`/social/unmute/${userId}`);
  },

  async getMessages(friendId: string): Promise<Message[]> {
    const response = await apiClient.get<Message[] | { data: Message[] }>(`/social/messages/${friendId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: Message[] }).data || [];
  },

  async getAdminFriendships(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: Friend[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/social/admin/friendships?${query}` : '/social/admin/friendships';
    return apiClient.get(url);
  },

  async getAdminBlocks(): Promise<Friend[]> {
    const response = await apiClient.get<Friend[] | { data: Friend[] }>('/social/admin/blocks');
    if (Array.isArray(response)) return response;
    return (response as { data: Friend[] }).data || [];
  },

  async getAdminMutes(): Promise<Friend[]> {
    const response = await apiClient.get<Friend[] | { data: Friend[] }>('/social/admin/mutes');
    if (Array.isArray(response)) return response;
    return (response as { data: Friend[] }).data || [];
  },

  async deleteAdminFriendship(friendshipId: string): Promise<void> {
    await apiClient.delete(`/social/admin/friendships/${friendshipId}`);
  },

  async adminBlockUser(userId: string, reason?: string): Promise<void> {
    await apiClient.post(`/social/admin/blocks/${userId}`, { reason });
  },

  async adminUnblockUser(userId: string): Promise<void> {
    await apiClient.delete(`/social/admin/blocks/${userId}`);
  },
};

export default socialService;