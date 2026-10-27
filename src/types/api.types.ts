export interface User {
  id: string;
  immutableUserId: string;
  email: string;
  nickname: string;
  title?: string;
  status: 'active' | 'suspended' | 'banned';
  roles: Role[];
  createdAt: string;
  lastLogin?: string;
  wallet?: Wallet;
  avatar?: string;
}

/**
 * Mirrors backend `Wallet` entity (modules/wallet/entities/wallet.entity.ts).
 * The historical gold/gems split does not exist on the backend — the sole
 * canonical currency is GAME_CURRENCY, transported as a numeric(30,0) string
 * so large amounts never pass through a JS number and lose precision.
 */
export interface Wallet {
  userId: string;
  gameCurrency: string;
}

export interface Role {
  id: string;
  code: string;
  name?: string | null;
  isSystem?: boolean | null;
  isDefault?: boolean | null;
  scope?: string | null;
  priority?: number | string | null;
  level?: number | string | null;
  description?: string | null;
  permissions?: string[] | null;
  permissionsMask?: string | null;
  inheritsFrom?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Permission {
  id: string;
  code: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  reporterUserId: string;
  targetUserId: string;
  category: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  reporterUser?: User;
  targetUser?: User;
  evidence?: ReportEvidence[];
  actions?: ReportAction[];
}

export interface ReportAction {
  id: string;
  action: 'escalate' | 'dismiss' | 'warn' | 'sanction';
  note?: string;
  createdAt: string;
}

export interface ReportEvidence {
  id: string;
  reportId: string;
  type: string;
  url?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber?: string;
  requesterUserId: string;
  subject: string;
  message?: string;
  category?: string;
  status: 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  user?: User;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderUserId: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
  user?: User;
}

export interface Sanction {
  id: string;
  userId: string;
  sanctionType: 'ban' | 'mute';
  reason: string;
  expiresAt?: string;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

export interface Strike {
  id: string;
  userId: string;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface HealthMetrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  activeConnections: number;
  redis: {
    serverId: string;
    isRedisEnabled: boolean;
    registeredUsers: number;
    registeredGames: number;
    registeredRooms: number;
  };
  /** Rolling average HTTP response duration (backend-sampled), present on newer backends. */
  http?: {
    avgResponseMs: number;
  };
}

/** GET /health/ready — verbatim shape from src/modules/common/controllers/health.controller.ts */
export interface HealthReadyResponse {
  status: 'ok' | 'degraded';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

/** GET /health/system — verbatim shape from health.controller.ts#getSystemMetrics */
export interface SystemHealthMetrics {
  generatedAt: string;
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  redis: {
    connected: boolean;
    enabled: boolean;
    memory?: unknown;
    keyspace?: unknown;
    consecutiveFailures: number;
    lastPingMs: number | null;
  };
  rbac: { cacheHitRate: number; cacheMissRate: number; totalHits: number; totalMisses: number };
  pubsub: { registeredUsers: number; registeredGames: number; registeredRooms: number; isRedisEnabled: boolean };
  capacity: Record<string, unknown>;
  queues?: unknown;
  system?: unknown;
  /** Nakama connectivity probe — null when the backend does not expose it. */
  nakama?: { connected: boolean } | null;
}

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
  roles: string[];
  permissions?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  level: number;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  level?: number;
  priority?: number;
  scope?: 'global' | 'room';
  inheritsFrom?: string;
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  description?: string;
}

export interface AssignRoleRequest {
  roleCode: string;
}

/** Mirrors backend `AdjustBalanceDto` (modules/admin/dto/admin-payloads.dto.ts)
 * exactly — POST /admin/users/:id/balance. */
export interface AdjustBalanceRequest {
  currency: 'GAME_CURRENCY';
  /** Positive integer string — backend rejects anything else. */
  amount: string;
  action: 'add' | 'deduct';
  reason: string;
  /** Optional client idempotency key; backend generates one if omitted. */
  operationId?: string;
}

export interface CreateReportRequest {
  reportedUserId: string;
  reason: string;
}

export interface AddEvidenceRequest {
  type: string;
  url: string;
  description?: string;
}

export interface TakeActionRequest {
  action: 'warn' | 'mute' | 'ban' | 'dismiss';
  reason?: string;
}

export interface UpdateStatusRequest {
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
}

export interface AssignReportRequest {
  assigneeId: string;
}

export interface AssignTicketRequest {
  assigneeId: string;
}

export interface AddNoteRequest {
  content: string;
  isInternal?: boolean;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface ReplyTicketRequest {
  content: string;
  isInternal?: boolean;
}

export interface UpdateTicketStatusRequest {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface SanctionRequest {
  type: 'ban' | 'mute' | 'warning';
  reason: string;
  durationHours?: number;
}

export interface StrikeRequest {
  reason: string;
}

// CreateStoreItemRequest / CreateStoreBundleRequest used to live here with
// fabricated priceGems/priceCoins/gold fields that never matched the real
// backend Store DTOs. The real, Zod-validated versions now live at
// src/dto/store/item.dto.ts (imported via '@/dto/store') — do not recreate
// a second definition here.

export interface DashboardStats {
  totalUsers: number;
  activeReports: number;
  openTickets: number;
  /** Platform-wide active sanctions from GET /moderation/sanctions/active-count; null only if the call fails. */
  activeSanctions: number | null;
  totalMatches?: number;
  activeRooms?: number;
  totalGifts?: number;
  totalAchievements?: number;
  storeItems?: number;
  /** Users with a successful login in the last 24h from GET /admin/users/daily-active-count; null only if the call fails. */
  dailyActiveUsers?: number | null;
  newUsersToday?: number;
  revenueToday?: number;
  totalRevenue?: number;
  /** Rolling average HTTP response time from GET /health/metrics (http.avgResponseMs); null if unavailable. */
  avgResponseTime?: number | null;
  /** Derived from real heap memory usage (heapUsed/heapTotal) when /health/metrics succeeds, else null. */
  systemLoad?: number | null;
  onlineUsers?: number;
}