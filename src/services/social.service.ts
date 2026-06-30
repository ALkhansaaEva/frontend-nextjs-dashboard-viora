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
    await apiClient.post(`/social/friend-request/decline/${requestId}`);
  },

  // Backend has no cancel friend request endpoint; use decline or block
  async cancelFriendRequest(_requestId: string): Promise<void> {
    console.warn('[SocialService] cancelFriendRequest is not supported by the backend');
  },

  async blockUser(userId: string): Promise<void> {
    await apiClient.post(`/social/block/${userId}`);
  },

  // Backend has no non-admin unblock endpoint; use admin unblock instead
  async unblockUser(_userId: string): Promise<void> {
    console.warn('[SocialService] unblockUser is not available in the backend (use adminUnblockUser)');
  },

  async muteUser(userId: string): Promise<void> {
    await apiClient.post(`/social/mute/${userId}`);
  },

  // Backend has no unmute endpoint for non-admin users
  async unmuteUser(_userId: string): Promise<void> {
    console.warn('[SocialService] unmuteUser is not supported by the backend');
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

  async getPendingFriendRequests(): Promise<Friend[]> {
    const response = await apiClient.get<Friend[] | { data: Friend[] }>('/social/friend-requests/pending');
    if (Array.isArray(response)) return response;
    return (response as { data: Friend[] }).data || [];
  },

  async declineFriendRequest(requestId: string): Promise<void> {
    await apiClient.post(`/social/friend-request/decline/${requestId}`);
  },

  async sendMessage(friendId: string, content: string): Promise<Message> {
    return apiClient.post<Message>(`/social/messages/${friendId}`, { content });
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