import apiClient from '@/lib/api/api-client';

export interface VoiceTokenResponse {
  token: string;
  roomId: string;
  expiresAt: string;
}

export interface MicStateResponse {
  isMuted: boolean;
  isDeafened: boolean;
}

export interface MicActionResponse {
  success: boolean;
}

export const voiceService = {
  async getRoomVoiceToken(roomId: string): Promise<VoiceTokenResponse> {
    return apiClient.get<VoiceTokenResponse>(`/voice/token/${roomId}`);
  },

  async getMatchVoiceToken(matchId: string): Promise<VoiceTokenResponse> {
    return apiClient.get<VoiceTokenResponse>(`/voice/match/${matchId}/token`);
  },

  async setMatchMicMute(matchId: string, isMuted: boolean): Promise<void> {
    await apiClient.post(`/voice/match/${matchId}/mic/mute`, { isMuted });
  },

  async getMatchMicState(matchId: string): Promise<MicStateResponse> {
    return apiClient.get<MicStateResponse>(`/voice/match/${matchId}/mic/state`);
  },

  async adminMatchMicControl(matchId: string, targetUserId: string, isMuted: boolean): Promise<void> {
    await apiClient.post(`/voice/match/${matchId}/admin-mic`, { targetUserId, isMuted });
  },

  async setRoomMicMute(roomId: string, isMuted: boolean): Promise<void> {
    await apiClient.post(`/voice/room/${roomId}/mic/mute`, { isMuted });
  },
};

export default voiceService;
