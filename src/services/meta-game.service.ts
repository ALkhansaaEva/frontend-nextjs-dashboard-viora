import apiClient from './api.client';

/**
 * Meta-Game / Ranking — modules/meta-game/meta-game.controller.ts (`/meta-game`).
 * The ONLY real routes on this controller are the ranking/leaderboard ones
 * below. There is no `daily-login` or `tasks` route anywhere on the backend
 * (confirmed by a full controller sweep) — a `getDailyLogin`/`getTasks` pair
 * used to live here calling endpoints that do not exist and would always
 * 404. Removed rather than left silently broken; "Tasks" as a concept is a
 * real backend feature but lives entirely under RuleAdminController
 * (kind=TASK, see /dashboard/meta/tasks) — a different route and a
 * different data model, not this one.
 */
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  gameType: string;
  currentRating: number;
  highestRating: number;
  seasonHighestRating: number;
  seasonId: string | null;
  wins: number;
  losses: number;
  draws: number;
  forfeits: number;
  streak: number;
  totalGames: number;
  winRate: number;
  tier: string;
  updatedAt: string;
}

type BackendLeaderboardEntry = Omit<LeaderboardEntry, 'rank'>;

interface LeaderboardResponse {
  leaderboard: BackendLeaderboardEntry[];
  total: number;
}

export interface UserRank {
  userId: string;
  gameType: string;
  currentRating: number;
  highestRating: number;
  seasonHighestRating: number;
  seasonId: string | null;
  wins: number;
  losses: number;
  draws: number;
  forfeits: number;
  streak: number;
  totalGames: number;
  winRate: number;
  currentStreak: number;
  tier: string;
}

export const metaGameService = {
  /** GET meta-game/ranking/:gameType/leaderboard. */
  async getLeaderboard(
    gameType: string,
    limit = 50,
    offset = 0,
  ): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardResponse>(
      `/meta-game/ranking/${gameType}/leaderboard`,
      { params: { limit, offset } },
    );
    return response.leaderboard.map((entry, index) => ({
      ...entry,
      rank: offset + index + 1,
    }));
  },

  /** GET meta-game/ranking/:gameType/user/:userId. */
  async getUserRank(gameType: string, userId: string): Promise<UserRank> {
    return apiClient.get<UserRank>(`/meta-game/ranking/${gameType}/user/${userId}`);
  },
};

export default metaGameService;
