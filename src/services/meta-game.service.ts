import apiClient from './api.client';

interface DailyLoginStatus {
  streak: number;
  lastClaimedAt?: string;
  canClaim: boolean;
  reward?: {
    currency: 'gold' | 'gems';
    amount: number;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  progress: number;
  target: number;
  reward: {
    currency: 'gold' | 'gems';
    amount: number;
  };
  isCompleted: boolean;
  isClaimed: boolean;
  expiresAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

interface UserRank {
  rank: number;
  score: number;
  totalPlayers: number;
}

export const metaGameService = {
  async getDailyLogin(): Promise<DailyLoginStatus> {
    return apiClient.get<DailyLoginStatus>('/meta-game/daily-login');
  },

  async claimDailyLogin(): Promise<void> {
    await apiClient.post('/meta-game/daily-login/claim');
  },

  async getTasks(): Promise<Task[]> {
    const response = await apiClient.get<Task[] | { data: Task[] }>('/meta-game/tasks');
    if (Array.isArray(response)) return response;
    return (response as { data: Task[] }).data || [];
  },

  async claimTask(taskId: string): Promise<void> {
    await apiClient.post(`/meta-game/tasks/${taskId}/claim`);
  },

  async getLeaderboard(gameType: string): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[] | { data: LeaderboardEntry[] }>(
      `/meta-game/ranking/${gameType}/leaderboard`
    );
    if (Array.isArray(response)) return response;
    return (response as { data: LeaderboardEntry[] }).data || [];
  },

  async getUserRank(gameType: string, userId: string): Promise<UserRank> {
    return apiClient.get<UserRank>(`/meta-game/ranking/${gameType}/user/${userId}`);
  },
};

export default metaGameService;